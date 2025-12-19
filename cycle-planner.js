import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
let geminiDisabled = false;
let geminiDisabledReason = null;

function sanitizeErrorMessage(message) {
    if (!message) return 'Unknown error';
    const key = process.env.GEMINI_API_KEY;
    if (key && message.includes(key)) {
        return message.replaceAll(key, '[redacted]');
    }
    return message;
}

function buildPrompt(snapshot, recentReports) {
    const recentSummary = recentReports.map(r => ({
        cycleId: r.cycleId,
        approved: r.governorDecision?.approvedActions?.length || 0,
        rejected: r.governorDecision?.rejectedActions?.length || 0,
        rationale: r.proposedPlan?.rationale || 'n/a'
    }));

    return `You are an e-commerce operator for Ghost Systems. Given metrics and prior cycles, propose up to 5 safe, measurable actions as strict JSON.
Avoid spam, avoid repeating failed ideas. Prefer experiments with clear hypotheses over volume. Do not include marketing spam.

Metrics snapshot: ${JSON.stringify(snapshot)}
Recent cycles: ${JSON.stringify(recentSummary)}

Return JSON with keys {"actions":[], "rationale":"text", "hypotheses":[]} following the schema described.`;
}

function buildDeterministicPlan(snapshot) {
    const actions = [];
    const products = snapshot.productMetrics || [];
    const oldest = products.sort((a, b) => b.ageDays - a.ageDays)[0];
    if (!products.length) {
        actions.push({
            type: 'generate_products',
            payload: { count: 1, mode: 'draft_only', productType: 'automation_kit' },
            idempotencyKey: crypto.createHash('sha256').update(`generate-${snapshot.timestamp}`).digest('hex')
        });
    } else if (oldest && oldest.price > 0) {
        const newPrice = Math.max(oldest.price * 0.95, process.env.MIN_PRICE || 19);
        actions.push({
            type: 'adjust_price',
            payload: { productId: oldest.productId, newPrice: Number(newPrice.toFixed(2)), reason: 'Rotate pricing test for aging SKU' },
            idempotencyKey: crypto.createHash('sha256').update(`price-${oldest.productId}-${snapshot.timestamp}`).digest('hex')
        });
    }

    return {
        actions,
        rationale: products.length ? 'Rotate pricing and refresh catalog based on age.' : 'No products found; seed catalog with a safe draft.',
        hypotheses: actions.map(action => ({
            metric: action.type === 'adjust_price' ? 'conversion' : 'catalog_health',
            expectedDelta: action.type === 'adjust_price' ? '+3% conversion proxy' : '+1 active SKU',
            horizonHours: 24
        })),
        plannerMeta: {
            status: 'fallback',
            provider: 'gemini',
            model: DEFAULT_MODEL,
            message: geminiDisabledReason?.reason || 'AI planner unavailable; deterministic fallback used',
            errorCode: geminiDisabledReason?.code,
            aiDisabled: geminiDisabled
        }
    };
}

function buildPlannerMetaSuccess() {
    return {
        status: 'ok',
        provider: 'gemini',
        model: DEFAULT_MODEL
    };
}

function buildPlannerMetaFailure(error) {
    const meta = {
        status: 'fallback',
        provider: 'gemini',
        model: DEFAULT_MODEL
    };

    if (!error) return meta;

    const statusCode = error?.response?.status || error?.status || (typeof error?.code === 'number' ? error.code : undefined);
    meta.errorCode = statusCode;
    meta.message = sanitizeErrorMessage(error?.response?.data?.error?.message || error?.message);

    if (statusCode === 403 && meta.message?.toLowerCase().includes('leaked')) {
        geminiDisabled = true;
        geminiDisabledReason = {
            reason: 'Gemini API denied request: key reported as leaked',
            code: 403
        };
        meta.aiDisabled = true;
        meta.message = 'Gemini API denied request: key reported as leaked (AI disabled until key rotated).';
    }

    return meta;
}

function getPlannerModel() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: DEFAULT_MODEL });
}

export async function proposeActionPlan(snapshot, recentReports = []) {
    if (!process.env.GEMINI_API_KEY) {
        const fallback = buildDeterministicPlan(snapshot);
        return {
            ...fallback,
            plannerMeta: {
                ...fallback.plannerMeta,
                message: 'GEMINI_API_KEY not configured; deterministic planner used',
                errorCode: 'missing_key'
            }
        };
    }

    if (geminiDisabled) {
        const fallback = buildDeterministicPlan(snapshot);
        return {
            ...fallback,
            plannerMeta: {
                ...fallback.plannerMeta,
                message: geminiDisabledReason?.reason || 'AI planner disabled until key rotated',
                errorCode: geminiDisabledReason?.code || 'disabled',
                aiDisabled: true
            }
        };
    }

    const prompt = buildPrompt(snapshot, recentReports);

    try {
        const model = getPlannerModel();
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);
        const normalizedActions = (parsed.actions || []).map((action, idx) => ({
            ...action,
            idempotencyKey: action.idempotencyKey || crypto.createHash('sha256').update(`${snapshot.snapshotId}-${idx}-${JSON.stringify(action)}`).digest('hex')
        }));
        return {
            actions: normalizedActions,
            rationale: parsed.rationale || 'AI generated plan',
            hypotheses: parsed.hypotheses || [],
            plannerMeta: buildPlannerMetaSuccess()
        };
    } catch (err) {
        const meta = buildPlannerMetaFailure(err);
        console.warn(`[planner] AI planning failed (${meta.errorCode || 'error'}), using deterministic fallback: ${meta.message}`);
        if (meta.aiDisabled) {
            console.warn('[planner] Gemini disabled until API key rotated.');
        }
        const fallback = buildDeterministicPlan(snapshot);
        return { ...fallback, plannerMeta: { ...fallback.plannerMeta, ...meta } };
    }
}

export async function plannerHealthCheck() {
    const configured = Boolean(process.env.GEMINI_API_KEY);

    if (!configured) {
        return { configured: false, model: DEFAULT_MODEL, canCall: false, error: 'GEMINI_API_KEY not configured' };
    }

    if (geminiDisabled) {
        return {
            configured: true,
            model: DEFAULT_MODEL,
            canCall: false,
            errorCode: geminiDisabledReason?.code,
            error: geminiDisabledReason?.reason || 'AI planner disabled until key rotated',
            aiDisabled: true
        };
    }

    try {
        const model = getPlannerModel();
        await model.generateContent({
            contents: [{ parts: [{ text: 'ping' }] }],
            generationConfig: { maxOutputTokens: 2 }
        });
        return { configured: true, model: DEFAULT_MODEL, canCall: true };
    } catch (err) {
        const meta = buildPlannerMetaFailure(err);
        return {
            configured: true,
            model: DEFAULT_MODEL,
            canCall: false,
            errorCode: meta.errorCode,
            error: meta.message,
            aiDisabled: meta.aiDisabled === true
        };
    }
}
