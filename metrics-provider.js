import { getShopifyProducts } from './shopify-integration.js';
import crypto from 'crypto';

const DEFAULT_WEIGHTS = {
    revenue: parseFloat(process.env.METRIC_W1_REVENUE || '1'),
    sales: parseFloat(process.env.METRIC_W2_SALES || '10'),
    refunds: parseFloat(process.env.METRIC_W3_REFUNDS || '50'),
    age: parseFloat(process.env.METRIC_W4_AGE || '0.25')
};

function safeNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function computeAgeDays(createdAt) {
    if (!createdAt) return 0;
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.round((now - created) / (1000 * 60 * 60 * 24)));
}

function computeScore(metric) {
    const revenue = safeNumber(metric.revenue, 0);
    const sales = safeNumber(metric.salesCount, 0);
    const refundRate = safeNumber(metric.refundRate, 0);
    const ageDays = safeNumber(metric.ageDays, 0);

    const agePenalty = sales === 0 ? ageDays * DEFAULT_WEIGHTS.age : 0;

    return (DEFAULT_WEIGHTS.revenue * revenue)
        + (DEFAULT_WEIGHTS.sales * sales)
        - (DEFAULT_WEIGHTS.refunds * refundRate)
        - agePenalty;
}

export async function gatherSnapshot(windowHours = 24) {
    const timestamp = new Date().toISOString();
    try {
        const products = await getShopifyProducts(250);
        const currency = products[0]?.variants?.[0]?.price ? products[0].variants[0].currency || 'USD' : 'USD';

        const productMetrics = products.map(p => {
            const price = safeNumber(p.variants?.[0]?.price, 0);
            const ageDays = computeAgeDays(p.created_at);
            const metric = {
                productId: p.id,
                title: p.title,
                productType: p.product_type || 'Uncategorized',
                price,
                createdAt: p.created_at,
                salesCount: safeNumber(p.total_inventory) < 0 ? 0 : safeNumber(p.total_sales || p.sales_count, 0),
                revenue: 0,
                refunds: 0,
                refundRate: 0,
                lastSaleAt: p.published_at,
                ageDays
            };
            return { ...metric, score: computeScore(metric) };
        });

        const storeMetrics = {
            orders: 0,
            revenue: productMetrics.reduce((acc, p) => acc + (p.revenue || 0), 0),
            aov: 0,
            refunds: 0,
            refundRate: 0,
            currency
        };

        return {
            timestamp,
            windowHours,
            storeMetrics,
            productMetrics,
            marketingMetrics: null,
            trafficMetrics: null,
            snapshotId: crypto.randomUUID()
        };
    } catch (err) {
        console.error('[metrics] Failed to pull Shopify data, returning minimal snapshot:', err.message);
        return {
            timestamp,
            windowHours,
            storeMetrics: { orders: 0, revenue: 0, aov: 0, refunds: 0, refundRate: 0, currency: 'USD' },
            productMetrics: [],
            marketingMetrics: null,
            trafficMetrics: null,
            snapshotId: crypto.randomUUID()
        };
    }
}
