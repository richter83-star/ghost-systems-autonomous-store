import { runDecisionCycle } from './cycle-engine.js';
import { getJob, getCycleReport } from './cycle-storage.js';

async function waitForJob(jobId, retries = 20, delayMs = 500) {
    for (let i = 0; i < retries; i++) {
        const job = await getJob(jobId);
        if (job?.status === 'done' || job?.status === 'error') {
            return job;
        }
        await new Promise(res => setTimeout(res, delayMs));
    }
    return null;
}

async function main() {
    console.log('Starting dry decision cycle (no mutations)...');
    const { jobId, cycleId } = await runDecisionCycle({ dryRun: true, windowHours: 24 });
    console.log(`Queued job ${jobId} for cycle ${cycleId}`);

    const job = await waitForJob(jobId);
    if (!job) {
        console.log('Job did not finish in time.');
        process.exit(1);
    }
    console.log(`Job status: ${job.status}`);
    const report = await getCycleReport(cycleId);
    if (report) {
        console.log('Proposed plan:', JSON.stringify(report.proposedPlan, null, 2));
        console.log('Governor decision:', JSON.stringify(report.governorDecision, null, 2));
        console.log('Execution results:', JSON.stringify(report.executionResults, null, 2));
    }
}

main().catch(err => {
    console.error('Dry cycle failed', err.message);
    process.exit(1);
});
