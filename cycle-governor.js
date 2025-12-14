import crypto from 'crypto';

const CONSTRAINTS = {
    MAX_NEW_PRODUCTS_PER_DAY: parseInt(process.env.MAX_NEW_PRODUCTS_PER_DAY || '5', 10),
    MAX_PUBLISH_PER_DAY: parseInt(process.env.MAX_PUBLISH_PER_DAY || '2', 10),
    MAX_PRICE_CHANGE_PCT_PER_DAY: parseFloat(process.env.MAX_PRICE_CHANGE_PCT_PER_DAY || '15'),
    MIN_PRICE: parseFloat(process.env.MIN_PRICE || '19'),
    MAX_PRICE: parseFloat(process.env.MAX_PRICE || '299'),
    MAX_ACTIONS_PER_CYCLE: parseInt(process.env.MAX_ACTIONS_PER_CYCLE || '8', 10),
    MIN_SAMPLE_ORDERS_FOR_SCALING: parseInt(process.env.MIN_SAMPLE_ORDERS_FOR_SCALING || '3', 10),
    MAX_REFUND_RATE: parseFloat(process.env.MAX_REFUND_RATE || '0.08'),
    DUPLICATE_TITLE_SIMILARITY: parseFloat(process.env.DUPLICATE_TITLE_SIMILARITY || '0.9')
};

function similarity(a, b) {
    if (!a || !b) return 0;
    const shorter = a.length < b.length ? a : b;
    const longer = a.length < b.length ? b : a;
    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    const editDist = levenshtein(longer, shorter);
    return (longerLength - editDist) / longerLength;
}

function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function validateActionSchema(action) {
    const allowedTypes = ['generate_products', 'refresh_copy', 'adjust_price', 'pause_product', 'create_bundle', 'generate_marketing'];
    if (!action || !allowedTypes.includes(action.type)) {
        return 'Unsupported action type';
    }
    if (!action.idempotencyKey) {
        action.idempotencyKey = crypto.createHash('sha256').update(JSON.stringify(action)).digest('hex');
    }
    if (typeof action.payload !== 'object') {
        return 'Missing payload';
    }
    return null;
}

function isDuplicateTitle(candidate, snapshot) {
    const titles = (snapshot.productMetrics || []).map(p => p.title);
    return titles.some(title => similarity(title?.toLowerCase(), candidate?.toLowerCase()) >= CONSTRAINTS.DUPLICATE_TITLE_SIMILARITY);
}

function includesProhibitedClaims(text) {
    if (!text) return false;
    return /(guaranteed|guarantee|warranty|promise)/i.test(String(text));
}

function validateByType(action, snapshot, rejected) {
    const { payload = {} } = action;
    switch (action.type) {
        case 'generate_products': {
            const count = parseInt(payload.count || '0', 10);
            if (!Number.isFinite(count) || count <= 0) {
                rejected.push({ action, reason: 'generate_products requires a positive count' });
                return false;
            }
            if (payload.mode && !['draft_only', 'publish'].includes(payload.mode)) {
                rejected.push({ action, reason: 'generate_products mode must be draft_only or publish' });
                return false;
            }
            if (includesProhibitedClaims(payload.title) || includesProhibitedClaims(payload.description)) {
                rejected.push({ action, reason: 'Prohibited claims found in product copy' });
                return false;
            }
            return true;
        }
        case 'refresh_copy': {
            if (!payload.productId) {
                rejected.push({ action, reason: 'refresh_copy requires productId' });
                return false;
            }
            if (!Array.isArray(payload.fields) || !payload.fields.length) {
                rejected.push({ action, reason: 'refresh_copy requires fields array' });
                return false;
            }
            if (includesProhibitedClaims(payload.tone)) {
                rejected.push({ action, reason: 'Prohibited claims in tone/copy' });
                return false;
            }
            return true;
        }
        case 'adjust_price': {
            if (!payload.productId || typeof payload.newPrice !== 'number') {
                rejected.push({ action, reason: 'adjust_price requires productId and numeric newPrice' });
                return false;
            }
            return true;
        }
        case 'pause_product': {
            if (!payload.productId) {
                rejected.push({ action, reason: 'pause_product requires productId' });
                return false;
            }
            return true;
        }
        case 'create_bundle': {
            if (!Array.isArray(payload.productIds) || payload.productIds.length < 2) {
                rejected.push({ action, reason: 'create_bundle requires at least two productIds' });
                return false;
            }
            if (typeof payload.bundlePrice !== 'number') {
                rejected.push({ action, reason: 'create_bundle requires bundlePrice number' });
                return false;
            }
            if (includesProhibitedClaims(payload.bundleTitle)) {
                rejected.push({ action, reason: 'Prohibited claims in bundle title' });
                return false;
            }
            return true;
        }
        case 'generate_marketing': {
            if (payload.productIds && !Array.isArray(payload.productIds)) {
                rejected.push({ action, reason: 'generate_marketing productIds must be an array' });
                return false;
            }
            if (!Array.isArray(payload.channels) || payload.channels.length === 0) {
                rejected.push({ action, reason: 'generate_marketing requires at least one channel' });
                return false;
            }
            const allowedChannels = ['twitter', 'linkedin', 'reddit', 'email', 'seo'];
            const invalidChannel = payload.channels.find(ch => !allowedChannels.includes(ch));
            if (invalidChannel) {
                rejected.push({ action, reason: `Unsupported marketing channel ${invalidChannel}` });
                return false;
            }
            if (payload.productIds && payload.productIds.some(id => {
                const product = (snapshot.productMetrics || []).find(p => p.productId === id);
                return !product || (product.salesCount || 0) < CONSTRAINTS.MIN_SAMPLE_ORDERS_FOR_SCALING;
            })) {
                rejected.push({ action, reason: 'Not enough sample orders for selected products' });
                return false;
            }
            return true;
        }
        default:
            return true;
    }
}

function enforcePrice(action, snapshot, rejected) {
    const { productId, newPrice } = action.payload || {};
    if (newPrice < CONSTRAINTS.MIN_PRICE || newPrice > CONSTRAINTS.MAX_PRICE) {
        rejected.push({ action, reason: `Price must be between ${CONSTRAINTS.MIN_PRICE}-${CONSTRAINTS.MAX_PRICE}` });
        return false;
    }
    const product = (snapshot.productMetrics || []).find(p => p.productId === productId);
    if (product?.price) {
        const pct = Math.abs((newPrice - product.price) / product.price) * 100;
        if (pct > CONSTRAINTS.MAX_PRICE_CHANGE_PCT_PER_DAY) {
            rejected.push({ action, reason: `Price change ${pct.toFixed(2)}% exceeds daily cap` });
            return false;
        }
    }
    return true;
}

export function applyGovernor(plan, snapshot) {
    const approved = [];
    const rejected = [];

    const actions = (plan?.actions || []).slice(0, CONSTRAINTS.MAX_ACTIONS_PER_CYCLE + 5);

    if (actions.length > CONSTRAINTS.MAX_ACTIONS_PER_CYCLE) {
        const overage = actions.slice(CONSTRAINTS.MAX_ACTIONS_PER_CYCLE);
        overage.forEach(action => rejected.push({ action, reason: 'Exceeded MAX_ACTIONS_PER_CYCLE' }));
    }

    const cappedActions = actions.slice(0, CONSTRAINTS.MAX_ACTIONS_PER_CYCLE);
    let newProductsCount = 0;
    let publishCount = 0;

    for (const action of cappedActions) {
        const schemaError = validateActionSchema(action);
        if (schemaError) {
            rejected.push({ action, reason: schemaError });
            continue;
        }

        if (!validateByType(action, snapshot, rejected)) {
            continue;
        }

        if (action.type === 'generate_products') {
            const count = parseInt(action.payload?.count || '0', 10);
            newProductsCount += count;
            if (newProductsCount > CONSTRAINTS.MAX_NEW_PRODUCTS_PER_DAY) {
                rejected.push({ action, reason: 'Exceeded MAX_NEW_PRODUCTS_PER_DAY' });
                continue;
            }
            if ((action.payload?.mode || 'draft_only') === 'publish') {
                publishCount += count;
                if (publishCount > CONSTRAINTS.MAX_PUBLISH_PER_DAY) {
                    rejected.push({ action, reason: 'Exceeded MAX_PUBLISH_PER_DAY' });
                    continue;
                }
            }
        }

        if (action.type === 'adjust_price') {
            if (!enforcePrice(action, snapshot, rejected)) {
                continue;
            }
            const product = (snapshot.productMetrics || []).find(p => p.productId === action.payload?.productId);
            if (product && (product.salesCount || 0) < CONSTRAINTS.MIN_SAMPLE_ORDERS_FOR_SCALING) {
                rejected.push({ action, reason: 'Not enough orders to safely adjust price' });
                continue;
            }
        }

        if (action.type === 'pause_product') {
            const product = (snapshot.productMetrics || []).find(p => p.productId === action.payload?.productId);
            if (product && product.refundRate > CONSTRAINTS.MAX_REFUND_RATE) {
                // allowed
            }
        }

        if (action.type === 'refresh_copy') {
            const product = (snapshot.productMetrics || []).find(p => p.productId === action.payload?.productId);
            if (!product) {
                rejected.push({ action, reason: 'Unknown product for refresh_copy' });
                continue;
            }
        }

        if (action.type === 'create_bundle') {
            if (!Array.isArray(action.payload?.productIds) || !action.payload.productIds.length) {
                rejected.push({ action, reason: 'create_bundle requires productIds' });
                continue;
            }
        }

        if (action.payload?.title && isDuplicateTitle(action.payload.title, snapshot)) {
            rejected.push({ action, reason: 'Duplicate or highly similar title' });
            continue;
        }

        approved.push(action);
    }

    return {
        approvedActions: approved,
        rejectedActions: rejected,
        constraintsUsed: CONSTRAINTS
    };
}
