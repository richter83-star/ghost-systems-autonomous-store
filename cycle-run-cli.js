import axios from 'axios';

const baseUrl = process.env.CYCLE_BASE_URL || `http://localhost:${process.env.PORT || 10000}`;
const apply = process.argv.includes('--apply');
const windowHoursArg = process.argv.find(arg => arg.startsWith('--hours='));
const windowHours = windowHoursArg ? parseInt(windowHoursArg.split('=')[1], 10) : 24;

async function main() {
    const url = `${baseUrl}/api/cycle/run${apply ? '?apply=true' : ''}`;
    console.log(`Triggering decision cycle at ${url} (apply=${apply})...`);
    const response = await axios.post(url, { windowHours });
    const { jobId, cycleId } = response.data;
    console.log(`Queued job ${jobId} for cycle ${cycleId}`);
}

main().catch(err => {
    console.error('Failed to trigger cycle:', err.message);
    process.exit(1);
});
