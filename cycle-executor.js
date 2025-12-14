import { generateProducts } from './product-generator.js';
import { updateShopifyProduct } from './shopify-integration.js';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeGenerateProducts(action, results, options) {
    const count = parseInt(action.payload.count || '0', 10);
    if (options.dryRun || process.env.CYCLE_ALLOW_MUTATIONS !== 'true') {
        results.push({ action, status: 'skipped', reason: 'dry-run or mutations disabled' });
        return;
    }
    const products = await generateProducts(count);
    results.push({ action, status: 'completed', output: { created: products.length } });
}

async function executeAdjustPrice(action, results, options) {
    const { productId, newPrice } = action.payload;
    if (options.dryRun || process.env.CYCLE_ALLOW_MUTATIONS !== 'true') {
        results.push({ action, status: 'skipped', reason: 'dry-run or mutations disabled' });
        return;
    }
    const updated = await updateShopifyProduct(productId, { id: productId, variants: [{ price: newPrice }] });
    results.push({ action, status: 'completed', output: { productId: updated.id, price: newPrice } });
}

async function executeNoop(action, results) {
    results.push({ action, status: 'skipped', reason: 'execution not implemented' });
}

export async function executeActions(actions, options = { dryRun: false }) {
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
            results.push({ action, status: 'error', error: err.message });
            if (err?.response?.status === 429) {
                await sleep(1000);
            }
        }
    }

    return results;
}
