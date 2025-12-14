import assert from 'assert';
import { applyGovernor } from './cycle-governor.js';
import { proposeActionPlan } from './cycle-planner.js';

async function testPlannerSchema() {
    const snapshot = { timestamp: new Date().toISOString(), windowHours: 24, productMetrics: [], storeMetrics: { currency: 'USD' } };
    const plan = await proposeActionPlan(snapshot, []);
    assert.ok(plan.actions !== undefined, 'Plan should include actions');
    assert.ok(Array.isArray(plan.hypotheses), 'Plan hypotheses should be an array');
    plan.actions.forEach(action => {
        assert.ok(action.type, 'Action missing type');
        assert.ok(action.idempotencyKey, 'Action missing idempotencyKey');
    });
    console.log('✓ Planner schema validation passed');
}

function testGovernorMaxActions() {
    const plan = { actions: Array.from({ length: 12 }).map((_, i) => ({ type: 'generate_products', payload: { count: 1, mode: 'draft_only' }, idempotencyKey: `k-${i}` })) };
    const snapshot = { productMetrics: [] };
    const decision = applyGovernor(plan, snapshot);
    assert.ok(decision.approvedActions.length <= 8, 'Governor should cap actions');
    assert.ok(decision.rejectedActions.length >= 4, 'Governor should reject overflow actions');
    console.log('✓ Governor MAX_ACTIONS_PER_CYCLE enforced');
}

async function run() {
    await testPlannerSchema();
    testGovernorMaxActions();
}

run().catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
});
