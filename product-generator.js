/**
 * AUTOMATED PRODUCT GENERATOR
 * Generates AI products and publishes to Shopify
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createShopifyProduct } from './shopify-integration.js';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Product templates for AI automation products
 */
const PRODUCT_TEMPLATES = [
    {
        category: 'AI Prompt Pack',
        themes: [
            'Blueprint / Technical Diagram Aesthetic',
            'Cyberpunk Neon City',
            'Minimalist Product Photography',
            'Fantasy Character Design',
            'Abstract Geometric Art'
        ],
        promptCounts: [40, 60, 80, 100],
        priceRange: [21, 75]
    },
    {
        category: 'Automation Kit',
        types: [
            'Client Onboarding Workflow',
            'Content Repurposing Pipeline',
            'Social Media Scheduler',
            'Email Marketing Automation',
            'Lead Generation System'
        ],
        platforms: ['Zapier', 'Make', 'n8n'],
        priceRange: [32, 89]
    },
    {
        category: 'Bundle',
        themes: [
            'Complete Marketing Suite',
            'Full Automation Stack',
            'Designer\'s Toolkit',
            'Content Creator Pack'
        ],
        priceRange: [45, 120]
    }
];

/**
 * Generate product description using Gemini AI
 */
async function generateDescription(title, productType, category) {
    try {
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
        
        const prompt = `You are an e-commerce copywriter for DRACANUS AI, a digital products store specializing in AI tools and automation.

Write a compelling 3-4 paragraph product description for:
Title: ${title}
Product Type: ${productType}
Category: ${category}

Requirements:
- Focus on value and benefits
- Highlight what the customer receives
- Use conversational but professional tone
- Emphasize time-saving and automation
- Include a clear call-to-action
- Format in HTML with <p> tags only
- No exaggeration, be truthful

Description:`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        return text.trim();
    } catch (error) {
        console.error('Failed to generate description:', error.message);
        // Fallback description
        return `<p>${title} - A premium digital product from DRACANUS AI designed to streamline your workflow and boost productivity.</p>`;
    }
}

/**
 * Generate product image using Gemini Imagen
 */
async function generateProductImage(title, category) {
    try {
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp-image-generation' });
        
        const imagePrompt = `Professional product icon for "${title}" in ${category} category. 
Dark metallic aesthetic, sharp angular design, tech-forward, high contrast, 
minimalist, suitable for digital product thumbnail. 1024x1024px.`;
        
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: imagePrompt }]
            }]
        });
        
        // Extract base64 image data
        const imagePart = result.response.candidates[0].content.parts.find(
            part => part.inlineData || part.inline_data
        );
        
        const base64 = imagePart?.inlineData?.data || imagePart?.inline_data?.data;
        
        if (base64) {
            console.log('  ✓ Generated product image');
            return base64;
        }
        
        return null;
    } catch (error) {
        console.error('  ✗ Failed to generate image:', error.message);
        return null;
    }
}

/**
 * Generate tags for product
 */
function generateTags(category, productType) {
    const baseTags = ['has-content', 'digital-product', 'instant-delivery'];
    
    if (category === 'AI Prompt Pack') {
        baseTags.push('prompts', 'ai-art');
    } else if (category === 'Automation Kit') {
        baseTags.push('automation', 'workflow');
    } else if (category === 'Bundle') {
        baseTags.push('bundle', 'value-pack');
    }
    
    return baseTags;
}

/**
 * Generate random price within range
 */
function generatePrice(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create a single product
 */
export async function createProduct(template) {
    console.log(`\n📦 Generating product...`);
    
    let title, productType;
    
    // Generate title based on template
    if (template.category === 'AI Prompt Pack') {
        const theme = template.themes[Math.floor(Math.random() * template.themes.length)];
        const count = template.promptCounts[Math.floor(Math.random() * template.promptCounts.length)];
        title = `${theme} Prompt Pack (${count} prompts)`;
        productType = 'AI Prompt Pack';
    } else if (template.category === 'Automation Kit') {
        const type = template.types[Math.floor(Math.random() * template.types.length)];
        const platform = template.platforms[Math.floor(Math.random() * template.platforms.length)];
        title = `${type} (${platform} Automation Kit)`;
        productType = 'Automation Kit';
    } else {
        const theme = template.themes[Math.floor(Math.random() * template.themes.length)];
        title = theme;
        productType = 'Bundle';
    }
    
    console.log(`  Title: ${title}`);
    
    // Generate description
    console.log('  Generating description...');
    const description = await generateDescription(title, productType, template.category);
    
    // Generate image
    console.log('  Generating image...');
    const imageBase64 = await generateProductImage(title, template.category);
    
    // Generate price
    const price = generatePrice(template.priceRange[0], template.priceRange[1]);
    console.log(`  Price: $${price}`);
    
    // Generate tags
    const tags = generateTags(template.category, productType);
    
    // Create in Shopify
    console.log('  Publishing to Shopify...');
    const product = await createShopifyProduct({
        title,
        description,
        productType,
        price,
        imageBase64,
        tags
    });
    
    console.log(`✓ Product created: ${product.id}`);
    
    return product;
}

/**
 * Generate multiple products
 */
export async function generateProducts(count = 5) {
    console.log(`\n🚀 Starting batch generation of ${count} products...\n`);
    
    const products = [];
    
    for (let i = 0; i < count; i++) {
        try {
            // Select random template
            const template = PRODUCT_TEMPLATES[Math.floor(Math.random() * PRODUCT_TEMPLATES.length)];
            
            const product = await createProduct(template);
            products.push(product);
            
            console.log(`Progress: ${i + 1}/${count}`);
            
            // Wait 2 seconds between products to avoid rate limits
            if (i < count - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error(`Failed to create product ${i + 1}:`, error.message);
        }
    }
    
    console.log(`\n✓ Batch generation complete!`);
    console.log(`  Success: ${products.length}/${count} products`);
    
    return products;
}

/**
 * Run generator from command line
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    const count = parseInt(process.argv[2]) || 5;
    
    console.log('================================================');
    console.log('   DRACANUS AI - PRODUCT GENERATOR');
    console.log('================================================');
    
    generateProducts(count)
        .then(() => {
            console.log('\n✓ All done!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n✗ Error:', error.message);
            process.exit(1);
        });
}

export default { createProduct, generateProducts };
