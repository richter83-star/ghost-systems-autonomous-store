import crypto from 'crypto';
import { gatherSnapshot } from './metrics-provider.js';
import { proposeActionPlan } from './cycle-planner.js';
import { applyGovernor } from './cycle-governor.js';
import { executeActions } from './cycle-executor.js';
import { saveJob, updateJob, saveCycleReport, getCycleReport, getLatestCycleReports } from './cycle-storage.js';

const queue = [];
let processing = false;

export async function runDecisionCycle({ windowHours = 24, dryRun = false } = {}) {
    const jobId = crypto.randomUUID();
    const cycleId = crypto.randomUUID();

    const job = {
        jobId,
        cycleId,
        type: 'cycle',
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: null
    };

    await saveJob(job);
    queue.push({ jobId, cycleId, windowHours, dryRun });
    processQueue();

    return { jobId, cycleId, status: 'queued' };
}

async function processQueue() {
    if (processing) return;
    processing = true;

    while (queue.length) {
        const item = queue.shift();
        await processJob(item);
    }

    processing = false;
}

async function processJob({ jobId, cycleId, windowHours, dryRun }) {
    try {
        await updateJob(jobId, { status: 'running', startedAt: new Date().toISOString(), progress: 5 });
        console.log(`[CYCLE] start job=${jobId} cycle=${cycleId}`);

        const snapshot = await gatherSnapshot(windowHours);
        console.log(`[CYCLE] snapshot products=${snapshot.productMetrics?.length || 0}`);

        const recent = await getLatestCycleReports(7);
        const proposedPlan = await proposeActionPlan(snapshot, recent);
        console.log(`[CYCLE] proposed actions=${proposedPlan.actions?.length || 0}`);

        const governorDecision = applyGovernor(proposedPlan, snapshot);
        console.log(`[CYCLE] approved=${governorDecision.approvedActions.length} rejected=${governorDecision.rejectedActions.length}`);

        const executionResults = await executeActions(governorDecision.approvedActions, { dryRun });
        console.log('[CYCLE] execution results captured');

        const report = {
            cycleId,
            createdAt: new Date().toISOString(),
            snapshot,
            proposedPlan,
            governorDecision,
            executionResults,
            jobId,
            dryRun
        };

        await saveCycleReport(report);
        await updateJob(jobId, { status: 'done', finishedAt: new Date().toISOString(), progress: 100, cycleId });
    } catch (err) {
        console.error('[CYCLE] error', err.message);
        await updateJob(jobId, { status: 'error', finishedAt: new Date().toISOString(), error: err.message });
    }
}

export async function fetchCycleReport(cycleId) {
    return getCycleReport(cycleId);
}
