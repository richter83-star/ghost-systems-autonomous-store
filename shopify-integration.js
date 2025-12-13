/**
 * SHOPIFY INTEGRATION MODULE
 * Complete integration between GhostSystems and Shopify store
 */

import axios from 'axios';
import 'dotenv/config';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

let shopifyAPI;

function normalizeStoreUrl(url) {
    const trimmed = url?.trim();
    if (!trimmed) return null;

    const sanitized = trimmed.replace(/\/+$/, '');
    if (!sanitized.startsWith('http')) {
        return `https://${sanitized}`;
    }

    return sanitized;
}

function validateShopifyConfig() {
    const missing = [];

    if (!SHOPIFY_STORE_URL) missing.push('SHOPIFY_STORE_URL');
    if (!SHOPIFY_TOKEN) missing.push('SHOPIFY_ADMIN_API_TOKEN');
    if (!API_VERSION) missing.push('SHOPIFY_API_VERSION');

    if (missing.length > 0) {
        const error = new Error(`Missing Shopify environment variables: ${missing.join(', ')}`);
        error.code = 'SHOPIFY_CONFIG_MISSING';
        throw error;
    }

    const normalizedUrl = normalizeStoreUrl(SHOPIFY_STORE_URL);

    if (!normalizedUrl?.startsWith('https://')) {
        const error = new Error('SHOPIFY_STORE_URL must include an https:// URL');
        error.code = 'SHOPIFY_CONFIG_INVALID';
        throw error;
    }

    return {
        storeUrl: normalizedUrl,
        token: SHOPIFY_TOKEN.trim(),
        apiVersion: API_VERSION.trim()
    };
}

function handleShopifyError(action, error) {
    const responseErrors = error.response?.data?.errors;
    const details = responseErrors ? ` (${JSON.stringify(responseErrors)})` : '';
    console.error(`✗ Failed to ${action}: ${error.message}${details}`);
    throw error;
}

function getShopifyClient() {
    if (!shopifyAPI) {
        const config = validateShopifyConfig();

        shopifyAPI = axios.create({
            baseURL: `${config.storeUrl}/admin/api/${config.apiVersion}`,
            headers: {
                'X-Shopify-Access-Token': config.token,
                'Content-Type': 'application/json'
            }
        });
    }

    return shopifyAPI;
}

/**
 * Create product in Shopify
 */
export async function createShopifyProduct({ title, description, productType, price, imageBase64, tags = [] }) {
    try {
        const shopifyAPI = getShopifyClient();
        const productPayload = {
            product: {
                title,
                body_html: description,
                product_type: productType,
                vendor: 'Dracanus AI',
                status: 'active',
                tags: tags.join(', '),
                variants: [{
                    price: price.toString(),
                    requires_shipping: false,
                    inventory_management: null,
                    taxable: false
                }]
            }
        };

        if (imageBase64) {
            productPayload.product.images = [{
                attachment: imageBase64
            }];
        }

        const response = await shopifyAPI.post('/products.json', productPayload);

        console.log(`✓ Created product: ${title} (ID: ${response.data.product.id})`);
        return response.data.product;
    } catch (error) {
        handleShopifyError('create product', error);
    }
}

/**
 * Update product in Shopify
 */
export async function updateShopifyProduct(productId, updates) {
    try {
        const shopifyAPI = getShopifyClient();
        const response = await shopifyAPI.put(`/products/${productId}.json`, {
            product: updates
        });
        
        console.log(`✓ Updated product ID: ${productId}`);
        return response.data.product;
    } catch (error) {
        handleShopifyError('update product', error);
    }
}

/**
 * Get all products from Shopify
 */
export async function getShopifyProducts(limit = 250) {
    try {
        const shopifyAPI = getShopifyClient();
        const response = await shopifyAPI.get(`/products.json?limit=${limit}`);
        return response.data.products;
    } catch (error) {
        handleShopifyError('fetch products', error);
    }
}

/**
 * Delete product from Shopify
 */
export async function deleteShopifyProduct(productId) {
    try {
        const shopifyAPI = getShopifyClient();
        await shopifyAPI.delete(`/products/${productId}.json`);
        console.log(`✓ Deleted product ID: ${productId}`);
        return true;
    } catch (error) {
        handleShopifyError('delete product', error);
    }
}

/**
 * Update product image
 */
export async function updateProductImage(productId, imageBase64) {
    try {
        const shopifyAPI = getShopifyClient();
        const response = await shopifyAPI.post(`/products/${productId}/images.json`, {
            image: {
                attachment: imageBase64
            }
        });
        
        console.log(`✓ Updated image for product ID: ${productId}`);
        return response.data.image;
    } catch (error) {
        handleShopifyError('update image', error);
    }
}

/**
 * Apply DRACANUS theme customizations
 */
export async function applyDracanusTheme(themeId) {
    try {
        const shopifyAPI = getShopifyClient();
        console.log('Applying DRACANUS theme customizations...');
        
        // Get current settings
        const settingsResponse = await shopifyAPI.get(`/themes/${themeId}/assets.json`, {
            params: { 'asset[key]': 'config/settings_data.json' }
        });
        
        const settings = JSON.parse(settingsResponse.data.asset.value);
        
        // Update color scheme
        if (settings.current) {
            settings.current.colors_background_1 = '#1a1a1a';
            settings.current.colors_text = '#e0e0e0';
            settings.current.colors_accent_1 = '#ffffff';
            settings.current.colors_accent_2 = '#4a4a4a';
        }
        
        // Save updated settings
        await shopifyAPI.put(`/themes/${themeId}/assets.json`, {
            asset: {
                key: 'config/settings_data.json',
                value: JSON.stringify(settings)
            }
        });
        
        console.log('✓ DRACANUS theme applied successfully');
        return true;
    } catch (error) {
        handleShopifyError('apply theme', error);
    }
}

/**
 * Get store information
 */
export async function getStoreInfo() {
    try {
        const shopifyAPI = getShopifyClient();
        const response = await shopifyAPI.get('/shop.json');
        return response.data.shop;
    } catch (error) {
        handleShopifyError('fetch store info', error);
    }
}

/**
 * Create webhook for order events
 */
export async function createWebhook(topic, address) {
    try {
        const shopifyAPI = getShopifyClient();
        const response = await shopifyAPI.post('/webhooks.json', {
            webhook: {
                topic,
                address,
                format: 'json'
            }
        });
        
        console.log(`✓ Created webhook for ${topic}`);
        return response.data.webhook;
    } catch (error) {
        handleShopifyError('create webhook', error);
    }
}

/**
 * Get all webhooks
 */
export async function getWebhooks() {
    try {
        const shopifyAPI = getShopifyClient();
        const response = await shopifyAPI.get('/webhooks.json');
        return response.data.webhooks;
    } catch (error) {
        handleShopifyError('fetch webhooks', error);
    }
}

export function getShopifyStatus() {
    const missing = [];

    if (!SHOPIFY_STORE_URL) missing.push('SHOPIFY_STORE_URL');
    if (!SHOPIFY_TOKEN) missing.push('SHOPIFY_ADMIN_API_TOKEN');
    if (!API_VERSION) missing.push('SHOPIFY_API_VERSION');
    const normalizedUrl = normalizeStoreUrl(SHOPIFY_STORE_URL);
    const invalidStoreUrl = normalizedUrl ? !normalizedUrl.startsWith('https://') : false;

    return {
        configured: missing.length === 0 && !invalidStoreUrl,
        missing,
        storeUrl: normalizedUrl || null,
        apiVersion: API_VERSION?.trim() || null,
        invalid: invalidStoreUrl ? ['SHOPIFY_STORE_URL must include https://'] : []
    };
}

/**
 * Test Shopify connection
 */
export async function testConnection() {
    try {
        const shop = await getStoreInfo();
        console.log('✓ Shopify connection successful');
        console.log(`  Store: ${shop.name}`);
        console.log(`  Domain: ${shop.domain}`);
        console.log(`  Email: ${shop.email}`);
        return true;
    } catch (error) {
        console.error('✗ Shopify connection failed:', error.message);
        return false;
    }
}

export default {
    createShopifyProduct,
    updateShopifyProduct,
    getShopifyProducts,
    deleteShopifyProduct,
    updateProductImage,
    applyDracanusTheme,
    getStoreInfo,
    createWebhook,
    getWebhooks,
    testConnection,
    getShopifyStatus
};
