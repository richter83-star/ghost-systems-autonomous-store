import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SHOP_URL = (process.env.SHOPIFY_STORE_URL || 'https://dracanus-ai.myshopify.com').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

async function main() {
    if (!ADMIN_TOKEN) {
        console.error('✗ SHOPIFY_ADMIN_API_TOKEN is missing in environment variables');
        process.exit(1);
    }

    const endpoint = `${SHOP_URL}/admin/api/${API_VERSION}/shop.json`;

    try {
        const response = await axios.get(endpoint, {
            headers: {
                'X-Shopify-Access-Token': ADMIN_TOKEN
            }
        });
        console.log('✓ Shopify connection successful:', response.data?.shop?.name || 'Store connected');
    } catch (error) {
        const message = error.response?.data?.errors || error.message;
        console.error('✗ Shopify connection failed:', message);
        process.exit(1);
    }
}

main();
