import { generateProducts } from './product-generator.js';
import { getShopifyProductById, updateVariantPrice } from './shopify-integration.js';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function mutationsEnvEnabled() {
    const gate = process.env.MUTATIONS_ENABLED ?? process.env.ALLOW_MUTATIONS;
    if (gate === undefined) return true;
    return String(gate).toLowerCase() === 'true';
}

function mutationPermission(options = {}) {
    if (options.dryRun) {
        return { allowed: false, reason: 'dry-run (mutations disabled)' };
    }
    if (options.apply !== true) {
        return { allowed: false, reason: 'apply flag not set' };
    }
    if (!mutationsEnvEnabled()) {
        return { allowed: false, reason: 'mutations disabled by environment gate' };
    }
    return { allowed: true };
}

function buildDefaultShopifyClient() {
    return {
        generateProducts,
        getProductById: getShopifyProductById,
        updateVariantPrice
    };
}

function getShopifyClient(options) {
    return options.shopifyClient || buildDefaultShopifyClient();
}

function priceGuard({ newPrice, currentPrice }) {
    const minPrice = parseFloat(process.env.MIN_PRICE || '19');
    const maxPrice = parseFloat(process.env.MAX_PRICE || '299');
    const maxChangePct = parseFloat(process.env.MAX_PRICE_CHANGE_PCT_PER_DAY || '15');

    if (typeof newPrice !== 'number' || Number.isNaN(newPrice)) {
        return 'Invalid price provided';
    }
    if (newPrice < minPrice || newPrice > maxPrice) {
        return `Price must be between ${minPrice}-${maxPrice}`;
    }
    if (typeof currentPrice === 'number' && currentPrice > 0) {
        const pct = Math.abs((newPrice - currentPrice) / currentPrice) * 100;
        if (pct > maxChangePct) {
            return `Price change ${pct.toFixed(2)}% exceeds daily cap (${maxChangePct}%)`;
        }
    }
    return null;
}

function pushResult(results, payload) {
    results.push(payload);
}

async function executeGenerateProducts(action, results, options) {
    const started = Date.now();
    const permission = mutationPermission(options);
    if (!permission.allowed) {
        pushResult(results, { action, status: 'skipped', skippedBy: 'executor', reason: permission.reason, durationMs: Date.now() - started });
        return;
    }

    const count = parseInt(action.payload.count || '0', 10);
    const shopifyClient = getShopifyClient(options);
    const products = await shopifyClient.generateProducts(count);
    pushResult(results, { action, status: 'success', output: { created: products.length }, durationMs: Date.now() - started });
}

async function executeAdjustPrice(action, results, options) {
    const started = Date.now();
    const permission = mutationPermission(options);
    if (!permission.allowed) {
        pushResult(results, { action, status: 'skipped', skippedBy: 'executor', reason: permission.reason, durationMs: Date.now() - started });
        return;
    }

    const { productId, variantId: providedVariantId, newPrice } = action.payload || {};
    if (!productId && !providedVariantId) {
        pushResult(results, { action, status: 'error', error: 'Missing productId or variantId', durationMs: Date.now() - started });
        return;
    }

    const shopifyClient = getShopifyClient(options);
    let product;
    let variantId = providedVariantId;
    try {
        if (productId) {
            product = await shopifyClient.getProductById(productId);
            if (!variantId) {
                variantId = product?.variants?.[0]?.id;
            }
        }
        if (!variantId) {
            throw new Error('No variant available for price adjustment');
        }

        const variant = product?.variants?.find(v => String(v.id) === String(variantId));
        const guardReason = priceGuard({ newPrice, currentPrice: variant?.price ? parseFloat(variant.price) : undefined });
        if (guardReason) {
            pushResult(results, { action, status: 'skipped', skippedBy: 'executor', reason: guardReason, durationMs: Date.now() - started });
            return;
        }

        const updatedVariant = await shopifyClient.updateVariantPrice(variantId, newPrice);
        pushResult(results, {
            action,
            status: 'success',
            externalIds: { productId: productId || updatedVariant?.product_id, variantId },
            output: { price: newPrice },
            durationMs: Date.now() - started
        });
    } catch (err) {
        pushResult(results, { action, status: 'error', error: err.message, durationMs: Date.now() - started });
        if (err?.response?.status === 429) {
            await sleep(1000);
        }
    }
}

async function executeNoop(action, results) {
    const started = Date.now();
    pushResult(results, { action, status: 'skipped', skippedBy: 'executor', reason: 'execution not implemented', durationMs: Date.now() - started });
}

export async function executeActions(actions, options = { dryRun: false, apply: false }) {
    const results = [];

    for (const action of actions) {
        try {
            switch (action.type) {
                case 'generate_products':
                    await executeGenerateProducts(action, results, options);
                    break;
                case 'adjust_price':
                    await executeAdjustPrice(action, results, options);
                    break;
                default:
                    await executeNoop(action, results);
            }
        } catch (err) {
            results.push({ action, status: 'error', error: err.message, durationMs: 0 });
            if (err?.response?.status === 429) {
                await sleep(1000);
            }
        }
    }

    return results;
}
