/**
 * GHOST SYSTEMS - INTEGRATION SERVER
 * Express server handling webhooks and automation
 */

import express from 'express';
import bodyParser from 'body-parser';
import 'dotenv/config';
import {
    getStoreInfo,
    getShopifyProducts,
    createWebhook,
    getWebhooks,
    getShopifyStatus
} from './shopify-integration.js';
import { generateProducts } from './product-generator.js';

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ================================================
// HEALTH CHECK
// ================================================
app.get('/', async (req, res) => {
    try {
        const shopifyStatus = getShopifyStatus();
        const store = shopifyStatus.configured ? await getStoreInfo() : null;

        res.json({
            system: 'Ghost Systems Integration',
            status: 'Online',
            timestamp: new Date().toISOString(),
            store: store ? {
                name: store.name,
                domain: store.domain,
                currency: store.currency
            } : null,
            services: {
                shopify: shopifyStatus.configured ? 'connected' : 'missing configuration',
                geminiAI: process.env.GEMINI_API_KEY ? 'configured' : 'not configured',
                firebase: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? 'configured' : 'not configured'
            },
            configuration: {
                shopify: shopifyStatus
            },
            endpoints: {
                status: 'GET /',
                products: 'GET /api/products',
                generate: 'POST /api/products/generate',
                webhooks: 'GET /api/webhooks',
                shopifyWebhook: 'POST /webhook/shopify/orders'
            }
        });
    } catch (error) {
        res.status(error.code === 'SHOPIFY_CONFIG_MISSING' ? 503 : 500).json({
            system: 'Ghost Systems Integration',
            status: 'Error',
            error: error.message
        });
    }
});

// ================================================
// PRODUCT MANAGEMENT
// ================================================

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const shopifyStatus = getShopifyStatus();
        if (!shopifyStatus.configured) {
            return res.status(503).json({
                success: false,
                error: 'Shopify configuration missing',
                details: {
                    missing: shopifyStatus.missing,
                    invalid: shopifyStatus.invalid
                }
            });
        }

        const limit = parseInt(req.query.limit) || 50;
        const products = await getShopifyProducts(limit);
        
        res.json({
            success: true,
            count: products.length,
            products: products.map(p => ({
                id: p.id,
                title: p.title,
                product_type: p.product_type,
                price: p.variants[0]?.price,
                created_at: p.created_at
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate new products
app.post('/api/products/generate', async (req, res) => {
    try {
        const shopifyStatus = getShopifyStatus();
        if (!shopifyStatus.configured) {
            return res.status(503).json({
                success: false,
                error: 'Shopify configuration missing',
                details: {
                    missing: shopifyStatus.missing,
                    invalid: shopifyStatus.invalid
                }
            });
        }

        const count = parseInt(req.body.count) || 1;

        if (count > 20) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 20 products per request'
            });
        }
        
        console.log(`Generating ${count} products...`);
        
        // Start generation in background
        res.json({
            success: true,
            message: `Generating ${count} products...`,
            status: 'processing'
        });
        
        // Generate products
        generateProducts(count)
            .then(products => {
                console.log(`✓ Generated ${products.length} products successfully`);
            })
            .catch(error => {
                console.error(`✗ Generation error: ${error.message}`);
            });
            
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ================================================
// WEBHOOK MANAGEMENT
// ================================================

// Get webhooks
app.get('/api/webhooks', async (req, res) => {
    try {
        const shopifyStatus = getShopifyStatus();
        if (!shopifyStatus.configured) {
            return res.status(503).json({
                success: false,
                error: 'Shopify configuration missing',
                details: {
                    missing: shopifyStatus.missing,
                    invalid: shopifyStatus.invalid
                }
            });
        }

        const webhooks = await getWebhooks();

        res.json({
            success: true,
            count: webhooks.length,
            webhooks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Shopify order webhook
app.post('/webhook/shopify/orders', (req, res) => {
    try {
        const order = req.body;
        
        console.log('📦 New order received:');
        console.log(`  Order ID: ${order.id}`);
        console.log(`  Customer: ${order.email}`);
        console.log(`  Total: ${order.currency} ${order.total_price}`);
        console.log(`  Items: ${order.line_items?.length || 0}`);
        
        // Process order (send digital product, etc.)
        // This is where you'd integrate with your fulfillment system
        
        res.status(200).json({
            success: true,
            message: 'Order received'
        });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ================================================
// ANALYTICS
// ================================================

app.get('/api/analytics', async (req, res) => {
    try {
        const shopifyStatus = getShopifyStatus();
        if (!shopifyStatus.configured) {
            return res.status(503).json({
                success: false,
                error: 'Shopify configuration missing',
                details: {
                    missing: shopifyStatus.missing,
                    invalid: shopifyStatus.invalid
                }
            });
        }

        const products = await getShopifyProducts(250);

        const analytics = {
            totalProducts: products.length,
            byType: {},
            averagePrice: 0,
            priceRange: { min: 0, max: 0 }
        };

        if (products.length === 0) {
            return res.json({ success: true, analytics });
        }

        let totalPrice = 0;
        let pricedCount = 0;

        products.forEach(product => {
            // Count by type
            const type = product.product_type || 'Uncategorized';
            analytics.byType[type] = (analytics.byType[type] || 0) + 1;

            // Calculate prices if present
            const price = parseFloat(product.variants[0]?.price);

            if (Number.isFinite(price)) {
                totalPrice += price;
                pricedCount += 1;

                if (pricedCount === 1) {
                    analytics.priceRange.min = price;
                    analytics.priceRange.max = price;
                } else {
                    if (price < analytics.priceRange.min) analytics.priceRange.min = price;
                    if (price > analytics.priceRange.max) analytics.priceRange.max = price;
                }
            }
        });

        if (pricedCount > 0) {
            analytics.averagePrice = Number((totalPrice / pricedCount).toFixed(2));
        }
        
        res.json({
            success: true,
            analytics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ================================================
// ERROR HANDLING
// ================================================

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// ================================================
// START SERVER
// ================================================

app.listen(PORT, () => {
    console.log('================================================');
    console.log('   GHOST SYSTEMS - INTEGRATION SERVER');
    console.log('================================================');
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Store: ${process.env.SHOPIFY_STORE_URL}`);
    console.log('================================================\n');
    console.log('Endpoints:');
    console.log(`  GET  /                       - Health check`);
    console.log(`  GET  /api/products           - List products`);
    console.log(`  POST /api/products/generate  - Generate products`);
    console.log(`  GET  /api/webhooks           - List webhooks`);
    console.log(`  GET  /api/analytics          - View analytics`);
    console.log('================================================\n');
});

export default app;
