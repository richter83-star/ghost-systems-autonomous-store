/**
 * SHOPIFY INTEGRATION MODULE
 * Complete integration between GhostSystems and Shopify store
 */

import axios from 'axios';
import 'dotenv/config';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

const shopifyAPI = axios.create({
    baseURL: `${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}`,
    headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
    }
});

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

        const response = await shopifyAPI.post('/products.json', productPayload);
        
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
        const response = await shopifyAPI.put(`/products/${productId}.json`, {
            product: updates
        });
        
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
        const response = await shopifyAPI.get(`/products.json?limit=${limit}`);
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
        await shopifyAPI.delete(`/products/${productId}.json`);
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
        const response = await shopifyAPI.post(`/products/${productId}/images.json`, {
            image: {
                attachment: imageBase64
            }
        });
        
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
        console.error(`✗ Failed to apply theme: ${error.message}`);
        throw error;
    }
}

/**
 * Get store information
 */
export async function getStoreInfo() {
    try {
        const response = await shopifyAPI.get('/shop.json');
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
        console.error(`✗ Failed to create webhook: ${error.message}`);
        throw error;
    }
}

/**
 * Get all webhooks
 */
export async function getWebhooks() {
    try {
        const response = await shopifyAPI.get('/webhooks.json');
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
