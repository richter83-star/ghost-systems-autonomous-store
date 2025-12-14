import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

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
        }))
    };
}

export async function proposeActionPlan(snapshot, recentReports = []) {
    if (!process.env.GEMINI_API_KEY) {
        return buildDeterministicPlan(snapshot);
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

    const prompt = buildPrompt(snapshot, recentReports);

    try {
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
            hypotheses: parsed.hypotheses || []
        };
    } catch (err) {
        console.warn('[planner] AI planning failed, using deterministic fallback:', err.message);
        return buildDeterministicPlan(snapshot);
    }
}
