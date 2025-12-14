import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

let firestoreDb = null;
let storageMode = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? 'firestore' : 'file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const cycleFile = path.join(dataDir, 'cycle-reports.json');
const jobsFile = path.join(dataDir, 'jobs.json');

function ensureDataDir() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

async function readJson(filePath) {
    ensureDataDir();
    if (!fs.existsSync(filePath)) return [];
    try {
        const raw = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(raw || '[]');
    } catch (err) {
        console.warn(`[storage] Failed to read ${filePath}, resetting file.`, err.message);
        return [];
    }
}

async function writeJson(filePath, data) {
    ensureDataDir();
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function maybeInitFirestore() {
    if (firestoreDb || storageMode === 'file') return firestoreDb;
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            console.warn('[storage] FIREBASE_SERVICE_ACCOUNT_JSON not set. Using local file storage.');
            storageMode = 'file';
            return null;
        }
        const { initializeFirebase } = await import('./firebase-integration.js');
        firestoreDb = initializeFirebase();
        storageMode = 'firestore';
        console.log('[storage] Using Firestore for cycle reports.');
    } catch (err) {
        console.warn(`[storage] Firestore unavailable (${err.message}). Falling back to file storage.`);
        storageMode = 'file';
        firestoreDb = null;
    }
    return firestoreDb;
}

function resolveCollectionNames() {
    return {
        cycles: process.env.FIRESTORE_CYCLES_COLLECTION || 'cycleReports',
        jobs: process.env.FIRESTORE_JOBS_COLLECTION || 'jobs'
    };
}

export function getStorageMode() {
    return storageMode;
}

export async function saveJob(job) {
    if (storageMode === 'firestore') {
        const db = await maybeInitFirestore();
        if (db) {
            const { jobs } = resolveCollectionNames();
            await db.collection(jobs).doc(job.jobId).set(job);
            return job;
        }
    }
    const jobs = await readJson(jobsFile);
    const filtered = jobs.filter(j => j.jobId !== job.jobId);
    filtered.push(job);
    await writeJson(jobsFile, filtered);
    return job;
}

export async function updateJob(jobId, updates) {
    if (storageMode === 'firestore') {
        const db = await maybeInitFirestore();
        if (db) {
            const { jobs } = resolveCollectionNames();
            await db.collection(jobs).doc(jobId).set({ ...updates, jobId }, { merge: true });
            const doc = await db.collection(jobs).doc(jobId).get();
            return doc.data();
        }
    }
    const jobs = await readJson(jobsFile);
    const idx = jobs.findIndex(j => j.jobId === jobId);
    if (idx === -1) return null;
    jobs[idx] = { ...jobs[idx], ...updates };
    await writeJson(jobsFile, jobs);
    return jobs[idx];
}

export async function getJob(jobId) {
    if (storageMode === 'firestore') {
        const db = await maybeInitFirestore();
        if (db) {
            const { jobs } = resolveCollectionNames();
            const doc = await db.collection(jobs).doc(jobId).get();
            return doc.exists ? doc.data() : null;
        }
    }
    const jobs = await readJson(jobsFile);
    return jobs.find(j => j.jobId === jobId) || null;
}

export async function saveCycleReport(report) {
    if (storageMode === 'firestore') {
        const db = await maybeInitFirestore();
        if (db) {
            const { cycles } = resolveCollectionNames();
            await db.collection(cycles).doc(report.cycleId).set(report);
            return report;
        }
    }
    const cycles = await readJson(cycleFile);
    const filtered = cycles.filter(c => c.cycleId !== report.cycleId);
    filtered.push(report);
    await writeJson(cycleFile, filtered);
    return report;
}

export async function getCycleReport(cycleId) {
    if (storageMode === 'firestore') {
        const db = await maybeInitFirestore();
        if (db) {
            const { cycles } = resolveCollectionNames();
            const doc = await db.collection(cycles).doc(cycleId).get();
            return doc.exists ? doc.data() : null;
        }
    }
    const cycles = await readJson(cycleFile);
    return cycles.find(c => c.cycleId === cycleId) || null;
}

export async function getLatestCycleReports(limit = 7) {
    if (storageMode === 'firestore') {
        const db = await maybeInitFirestore();
        if (db) {
            const { cycles } = resolveCollectionNames();
            const snapshot = await db.collection(cycles).orderBy('createdAt', 'desc').limit(limit).get();
            return snapshot.docs.map(doc => doc.data());
        }
    }
    const cycles = await readJson(cycleFile);
    return cycles
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, limit);
}
