import assert from 'assert';

// Provide stub env so shopify-integration doesn't throw on import
process.env.SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || 'https://example.myshopify.com';
process.env.SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN || 'dummy-token';

const { executeActions } = await import('./cycle-executor.js');

const mockShopifyClient = {
    generateProducts: async (count) => Array.from({ length: count }).map((_, idx) => ({ id: idx + 1 })),
    getProductById: async (productId) => ({ id: productId, variants: [{ id: 'v-1', price: '20.00' }] }),
    updateVariantPrice: async (variantId, price) => ({ id: variantId, price, product_id: 'p-1' })
};

async function testDryModeSkipsMutations() {
    process.env.ALLOW_MUTATIONS = 'false';
    const actions = [{ type: 'adjust_price', payload: { productId: 'p-1', newPrice: 22 }, idempotencyKey: 'a1' }];
    const results = await executeActions(actions, { dryRun: true, apply: false, shopifyClient: mockShopifyClient });
    assert.strictEqual(results[0].status, 'skipped', 'Action should be skipped when dryRun is true');
    assert.ok(results[0].reason.toLowerCase().includes('mutations'), 'Skip reason should mention mutations being disabled');
}

async function testApplyModeUsesMockClient() {
    process.env.ALLOW_MUTATIONS = 'false';
    const actions = [{ type: 'adjust_price', payload: { productId: 'p-1', newPrice: 22 }, idempotencyKey: 'a2' }];
    const results = await executeActions(actions, { dryRun: false, apply: true, shopifyClient: mockShopifyClient });
    assert.strictEqual(results[0].status, 'success', 'Action should succeed when apply=true');
    assert.strictEqual(results[0].externalIds.variantId, 'v-1');
}

async function run() {
    await testDryModeSkipsMutations();
    await testApplyModeUsesMockClient();
    console.log('✓ mutation gating tests passed');
}

run().catch(err => {
    console.error('Mutation gating test failed:', err.message);
    process.exit(1);
});
