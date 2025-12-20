import fs from 'fs';
import path from 'path';
import axios from 'axios';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { mustAllowMutations } from './mutation-guard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function loadGhostOffer() {
    const offerPath = path.resolve(__dirname, '..', 'store', 'ghost-offer.json');
    const raw = fs.readFileSync(offerPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed;
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

    const client = axios.create({
        timeout: 30000,
        baseURL: `${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}`,
        headers: {
            'X-Shopify-Access-Token': SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
        }
    });

    return client;
}

async function shopifyRequest(client, config) {
    try {
        const response = await client.request(config);
        return response;
    } catch (error) {
        const status = error?.response?.status;
        const details = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Shopify request failed${status ? ` (HTTP ${status})` : ''}: ${details}`);
    }
}

async function findProductByHandle(client, handle) {
    const response = await shopifyRequest(client, {
        method: 'get',
        url: `/products.json?limit=250&fields=id,title,handle,status,variants,body_html,product_type,vendor,tags,metafields_global_title_tag,metafields_global_description_tag`
    });
    const products = response.data?.products || [];
    const match = products.find(p => p.handle === handle);
    if (match) return match;
    // TODO: add pagination support when product catalog exceeds 250 items.
    return null;
}

function buildProductPayload(offer, existingProduct) {
    const base = {
        title: offer.title,
        body_html: offer.htmlBody,
        handle: offer.handle,
        product_type: offer.productType,
        vendor: offer.vendor,
        status: offer.status,
        tags: Array.isArray(offer.tags) ? offer.tags.join(', ') : '',
        metafields_global_title_tag: offer.seoTitle,
        metafields_global_description_tag: offer.seoDescription
    };

    const variant = existingProduct?.variants?.[0];
    const variants = variant
        ? [{ id: variant.id, price: offer.price }]
        : [{ price: offer.price }];

    const payload = { ...base, variants };

    if (Array.isArray(offer.images) && offer.images.length > 0) {
        payload.images = offer.images.map(img => ({ src: img.src || img }));
    }

    return payload;
}

async function upsertGhostBundle({ applyFlag, unpublishOthersFlag }) {
    const offer = loadGhostOffer();
    const client = buildShopifyClient();

    const allowMutations = mustAllowMutations({ apply: applyFlag });
    const mutate = applyFlag && allowMutations;

    if (applyFlag && !allowMutations) {
        console.warn('apply=true but mutation guard blocked execution. Set MUTATIONS_ENABLED=true (or ALLOW_MUTATIONS=true) to allow changes. Running in dry-run mode.');
    }

    const existing = await findProductByHandle(client, offer.handle);
    const payload = buildProductPayload(offer, existing);

    if (!existing) {
        console.log(`[info] Ghost offer not found in Shopify (handle: ${offer.handle}).`);
        if (!mutate) {
            console.log('[dry-run] Would create product with payload:', JSON.stringify(payload, null, 2));
            return;
        }
        const response = await shopifyRequest(client, { method: 'post', url: '/products.json', data: { product: payload } });
        console.log(`✓ Created Ghost Launch Bundle (ID: ${response.data?.product?.id})`);
    } else {
        const updates = { ...payload, id: existing.id };
        if (!mutate) {
            console.log(`[dry-run] Would update existing product ${existing.id} (${existing.title}) with payload:`, JSON.stringify(updates, null, 2));
        } else {
            await shopifyRequest(client, { method: 'put', url: `/products/${existing.id}.json`, data: { product: updates } });
            console.log(`✓ Updated Ghost Launch Bundle (ID: ${existing.id})`);
        }
    }

    if (unpublishOthersFlag) {
        if (!mutate) {
            console.log('[dry-run] Skipping unpublish of other products because apply=false or mutation guard disabled.');
        } else {
            const { unpublishNonGhost } = await import('./unpublish-non-ghost.js');
            await unpublishNonGhost({ client, ghostHandle: offer.handle, applyFlag, invokedFromPublish: true });
        }
    }
}

(async () => {
    const applyFlag = parseFlag('apply', false);
    const unpublishOthersFlag = parseFlag('unpublish-others', false);

    try {
        await upsertGhostBundle({ applyFlag, unpublishOthersFlag });
    } catch (error) {
        console.error('publish-ghost-bundle failed:', error.message);
        process.exitCode = 1;
    }
})();
