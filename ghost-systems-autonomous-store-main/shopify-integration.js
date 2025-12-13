/**
 * SHOPIFY INTEGRATION MODULE
 * Complete integration between GhostSystems and Shopify store
 */

import axios from 'axios';
import 'dotenv/config';

function normalizeStoreUrl(url) {
    if (!url) return url;
    let u = String(url).trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = `https://${u}`;
    u = u.replace(/\/+$/, '');
    return u;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatAxiosError(error) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const msg = error?.message || 'Unknown error';
    if (!status) return msg;
    const details = data ? JSON.stringify(data) : '';
    return `${msg} (HTTP ${status}) ${details}`;
}

const SHOPIFY_STORE_URL_RAW = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_STORE_URL = normalizeStoreUrl(SHOPIFY_STORE_URL_RAW);
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

if (!SHOPIFY_STORE_URL) {
    throw new Error('SHOPIFY_STORE_URL is not set. Set it in your environment (e.g., Render Environment).');
}
if (!SHOPIFY_TOKEN) {
    throw new Error('SHOPIFY_ADMIN_API_TOKEN is not set. Set it in your environment (e.g., Render Environment).');
}


const shopifyAPI = axios.create({
    timeout: 30000,
    baseURL: `${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}`,
    headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
    }
});

async function shopifyRequest(config, attempt = 0) {
    const maxRetries = parseInt(process.env.SHOPIFY_MAX_RETRIES || '5', 10);
    const baseDelayMs = parseInt(process.env.SHOPIFY_RETRY_BASE_DELAY_MS || '1000', 10);

    try {
        const response = await shopifyAPI.request(config);
        return response;
    } catch (error) {
        const status = error?.response?.status;
        const isRetryable =
            status === 429 ||
            (status && status >= 500) ||
            (!status && (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET'));

        if (!isRetryable || attempt >= maxRetries) {
            // Improve common auth failures
            if (status === 401 || status === 403) {
                throw new Error(`Shopify auth/scopes error. Verify SHOPIFY_ADMIN_API_TOKEN, app scopes, and shop domain. ${formatAxiosError(error)}`);
            }
            throw new Error(formatAxiosError(error));
        }

        // Respect Retry-After when throttled
        const retryAfter = parseFloat(error?.response?.headers?.['retry-after'] || '0');
        const expo = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 250);
        const delay = (retryAfter > 0 ? retryAfter * 1000 : expo) + jitter;

        console.warn(`[Shopify] retrying request (${attempt + 1}/${maxRetries}) in ${delay}ms due to: ${formatAxiosError(error)}`);
        await sleep(delay);
        return shopifyRequest(config, attempt + 1);
    }
}


/**
 * Create product in Shopify
 */
export async function createShopifyProduct({ title, description, productType, price, imageBase64, tags = [] }) {
    try {
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

        const response = await shopifyRequest({ method: 'post', url: '/products.json', data: productPayload });
        
        console.log(`✓ Created product: ${title} (ID: ${response.data.product.id})`);
        return response.data.product;
    } catch (error) {
        console.error(`✗ Failed to create product: ${error.message}`);
        throw error;
    }
}

/**
 * Update product in Shopify
 */
export async function updateShopifyProduct(productId, updates) {
    try {
        const response = await shopifyRequest({ method: 'put', url: `/products/${productId}.json`, data: {
            product: updates
        }});
        
        console.log(`✓ Updated product ID: ${productId}`);
        return response.data.product;
    } catch (error) {
        console.error(`✗ Failed to update product: ${error.message}`);
        throw error;
    }
}

/**
 * Get all products from Shopify
 */
export async function getShopifyProducts(limit = 250) {
    try {
        const response = await shopifyRequest({ method: 'get', url: `/products.json?limit=${limit}` });
        return response.data.products;
    } catch (error) {
        console.error(`✗ Failed to fetch products: ${error.message}`);
        throw error;
    }
}

/**
 * Delete product from Shopify
 */
export async function deleteShopifyProduct(productId) {
    try {
        await shopifyRequest({ method: 'delete', url: `/products/${productId}.json` });
        console.log(`✓ Deleted product ID: ${productId}`);
        return true;
    } catch (error) {
        console.error(`✗ Failed to delete product: ${error.message}`);
        throw error;
    }
}

/**
 * Update product image
 */
export async function updateProductImage(productId, imageBase64) {
    try {
        const response = await shopifyRequest({ method: 'post', url: `/products/${productId}/images.json`, data: {
            image: {
                attachment: imageBase64
            }
        }});
        
        console.log(`✓ Updated image for product ID: ${productId}`);
        return response.data.image;
    } catch (error) {
        console.error(`✗ Failed to update image: ${error.message}`);
        throw error;
    }
}

/**
 * Apply DRACANUS theme customizations
 */
export async function applyDracanusTheme(themeId) {
    try {
        console.log('Applying DRACANUS theme customizations...');
        
        // Get current settings
        const settingsResponse = await shopifyRequest({ method: 'get', url: `/themes/${themeId}/assets.json`, params: { 'asset[key]': 'config/settings_data.json' } });
        
        const settings = JSON.parse(settingsResponse.data.asset.value);
        
        // Update color scheme
        if (settings.current) {
            settings.current.colors_background_1 = '#1a1a1a';
            settings.current.colors_text = '#e0e0e0';
            settings.current.colors_accent_1 = '#ffffff';
            settings.current.colors_accent_2 = '#4a4a4a';
        }
        
        // Save updated settings
        await shopifyRequest({ method: 'put', url: `/themes/${themeId}/assets.json`, data: {
            asset: {
                key: 'config/settings_data.json',
                value: JSON.stringify(settings)
            }
        }});
        
        console.log('✓ DRACANUS theme applied successfully');
        return true;
    } catch (error) {
        console.error(`✗ Failed to apply theme: ${error.message}`);
        throw error;
    }
}

/**
 * Get store information
 */
export async function getStoreInfo() {
    try {
        const response = await shopifyRequest({ method: 'get', url: '/shop.json' });
        return response.data.shop;
    } catch (error) {
        console.error(`✗ Failed to fetch store info: ${error.message}`);
        throw error;
    }
}

/**
 * Create webhook for order events
 */
export async function createWebhook(topic, address) {
    try {
        const response = await shopifyRequest({ method: 'post', url: '/webhooks.json', data: {
            webhook: {
                topic,
                address,
                format: 'json'
            }
        }});
        
        console.log(`✓ Created webhook for ${topic}`);
        return response.data.webhook;
    } catch (error) {
        console.error(`✗ Failed to create webhook: ${error.message}`);
        throw error;
    }
}

/**
 * Get all webhooks
 */
export async function getWebhooks() {
    try {
        const response = await shopifyRequest({ method: 'get', url: '/webhooks.json' });
        return response.data.webhooks;
    } catch (error) {
        console.error(`✗ Failed to fetch webhooks: ${error.message}`);
        throw error;
    }
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
    testConnection
};