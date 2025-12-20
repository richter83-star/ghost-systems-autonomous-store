import axios from 'axios';
import 'dotenv/config';
import { mustAllowMutations } from './mutation-guard.js';

function normalizeStoreUrl(url) {
    if (!url) return url;
    let u = String(url).trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = `https://${u}`;
    return u.replace(/\/+$/, '');
}

function parseFlag(name, defaultValue = false) {
    const raw = process.argv.find(arg => arg.startsWith(`--${name}=`));
    if (!raw) return defaultValue;
    const [, value] = raw.split('=');
    return String(value).toLowerCase() === 'true';
}

function buildShopifyClient() {
    const SHOPIFY_STORE_URL_RAW = process.env.SHOPIFY_STORE_URL;
    const SHOPIFY_STORE_URL = normalizeStoreUrl(SHOPIFY_STORE_URL_RAW);
    const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
    const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

    if (!SHOPIFY_STORE_URL) {
        throw new Error('SHOPIFY_STORE_URL is not set.');
    }
    if (!SHOPIFY_TOKEN) {
        throw new Error('SHOPIFY_ADMIN_API_TOKEN is not set.');
    }

    return axios.create({
        timeout: 30000,
        baseURL: `${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}`,
        headers: {
            'X-Shopify-Access-Token': SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
        }
    });
}

async function shopifyRequest(client, config) {
    try {
        return await client.request(config);
    } catch (error) {
        const status = error?.response?.status;
        const details = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Shopify request failed${status ? ` (HTTP ${status})` : ''}: ${details}`);
    }
}

async function fetchProducts(client) {
    const response = await shopifyRequest(client, { method: 'get', url: '/products.json?limit=250&fields=id,title,handle,status' });
    return response.data?.products || [];
}

export async function unpublishNonGhost({ client, ghostHandle, applyFlag, invokedFromPublish = false }) {
    const allowMutations = mustAllowMutations({ apply: applyFlag });
    const mutate = applyFlag && allowMutations;

    if (!applyFlag) {
        console.log('[abort] apply flag not set to true. Nothing to unpublish.');
        return;
    }
    if (!allowMutations) {
        console.warn('Mutation guard blocked unpublish. Set MUTATIONS_ENABLED=true (or ALLOW_MUTATIONS=true) to proceed.');
        return;
    }

    const products = await fetchProducts(client);
    const targets = products.filter(p => p.handle !== ghostHandle);

    if (targets.length === 0) {
        console.log('[info] No other products to unpublish.');
        return;
    }

    for (const product of targets) {
        if (product.status === 'draft') {
            console.log(`[skip] Product already draft: ${product.title} (${product.id})`);
            continue;
        }
        if (!mutate) {
            console.log(`[dry-run] Would unpublish product ${product.title} (${product.id})`);
        } else {
            await shopifyRequest(client, { method: 'put', url: `/products/${product.id}.json`, data: { product: { id: product.id, status: 'draft' } } });
            console.log(`✓ Unpublished ${product.title} (${product.id})`);
        }
    }

    if (!invokedFromPublish) {
        console.log('✓ Unpublish operation complete.');
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const applyFlag = parseFlag('apply', false);

    try {
        const client = buildShopifyClient();
        await unpublishNonGhost({ client, ghostHandle: 'ghost-launch-bundle', applyFlag });
    } catch (error) {
        console.error('unpublish-non-ghost failed:', error.message);
        process.exitCode = 1;
    }
}
