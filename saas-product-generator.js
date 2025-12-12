/**
 * SAAS-FOCUSED PRODUCT GENERATOR
 * Creates SaaS tools, startup resources, and growth products
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createShopifyProduct } from './shopify-integration.js';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * SaaS Product Categories and Templates
 */
const SAAS_PRODUCT_TEMPLATES = [
    {
        category: 'SaaS Starter Kit',
        products: [
            'Complete SaaS Launch Blueprint',
            'SaaS Financial Model Template',
            'SaaS Pitch Deck Framework',
            'SaaS Customer Onboarding System',
            'SaaS Growth Playbook',
            'SaaS Metrics Dashboard Template'
        ],
        priceRange: [47, 197],
        description: 'Comprehensive toolkit for launching and scaling SaaS businesses'
    },
    {
        category: 'Automation & Workflow',
        products: [
            'No-Code Automation Masterclass',
            'Zapier Integration Templates (50+ workflows)',
            'Make.com Scenario Library',
            'Customer Success Automation Suite',
            'Sales Pipeline Automation Kit',
            'Marketing Automation Blueprint'
        ],
        priceRange: [37, 127],
        description: 'Ready-to-deploy automation workflows for SaaS operations'
    },
    {
        category: 'AI-Powered Tools',
        products: [
            'AI Content Generation System',
            'ChatGPT Prompts for SaaS (500+ prompts)',
            'AI Customer Support Bot Template',
            'AI-Powered Email Sequence Generator',
            'AI Sales Copywriting Framework',
            'AI Product Description Generator'
        ],
        priceRange: [29, 97],
        description: 'AI-powered tools to scale content and customer operations'
    },
    {
        category: 'Growth & Marketing',
        products: [
            'SaaS SEO Strategy Framework',
            'Content Marketing Calendar (12 months)',
            'LinkedIn Lead Generation System',
            'SaaS Funnel Optimization Kit',
            'Cold Email Templates (100+ sequences)',
            'SaaS Partnership Playbook'
        ],
        priceRange: [39, 149],
        description: 'Growth strategies and marketing systems for SaaS scale'
    },
    {
        category: 'Developer Resources',
        products: [
            'SaaS API Documentation Template',
            'Technical SEO Checklist for SaaS',
            'SaaS Architecture Blueprint',
            'Database Schema Templates',
            'SaaS Integration Handbook',
            'DevOps Automation Scripts'
        ],
        priceRange: [59, 179],
        description: 'Technical resources for SaaS development and deployment'
    },
    {
        category: 'Customer Success',
        products: [
            'SaaS Onboarding Email Sequences',
            'Customer Health Score Framework',
            'Churn Prevention Playbook',
            'SaaS Help Center Template',
            'Customer Feedback System',
            'Product Adoption Framework'
        ],
        priceRange: [49, 159],
        description: 'Tools to maximize customer retention and satisfaction'
    }
];

/**
 * Generate SaaS-focused description
 */
async function generateSaaSDescription(title, category) {
    try {
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
        
        const prompt = `You are a SaaS copywriter specializing in digital products for startups and entrepreneurs.

Write a compelling product description for: "${title}"
Category: ${category}

Target Audience: SaaS founders, startup teams, indie hackers, growth marketers

Requirements:
- 3-4 paragraphs in HTML format (use <p> tags only)
- Focus on TIME SAVINGS and ROI
- Emphasize IMMEDIATE IMPLEMENTATION
- Include specific outcomes and benefits
- Mention what's included
- Use power words like: proven, ready-to-use, battle-tested, plug-and-play
- End with strong call-to-action
- Keep it conversion-focused

Tone: Professional, confident, results-oriented. Like a experienced SaaS consultant.

Description:`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        return text.trim();
    } catch (error) {
        console.error('  ✗ Failed to generate description:', error.message);
        return `<p>${title} - A comprehensive digital resource designed specifically for SaaS businesses. Get immediate access to proven frameworks and templates that save you months of trial and error.</p><p>Perfect for founders, growth teams, and entrepreneurs looking to scale faster with battle-tested systems.</p>`;
    }
}

/**
 * Generate SaaS product image
 */
async function generateSaaSImage(title, category) {
    try {
        const model = genAI.getGenerativeModel({ 
            model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp-image-generation' 
        });
        
        const imagePrompt = `Professional SaaS product thumbnail for "${title}". 
Dark metallic background with DRACANUS branding aesthetic. 
Include: abstract tech elements, dashboard UI glimpses, modern typography, growth arrows or charts.
Style: Corporate, premium, tech-forward, high contrast.
Colors: Dark grays, metallic blues, white accents.
Layout: Clean, professional, suitable for digital product marketplace.
1024x1024px, high quality.`;
        
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: imagePrompt }]
            }]
        });
        
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
        console.error('  ✗ Image generation skipped:', error.message);
        return null;
    }
}

/**
 * Generate SaaS-focused tags
 */
function generateSaaSTags(category) {
    const baseTags = ['saas', 'startup', 'digital-product', 'instant-download'];
    
    const categoryTags = {
        'SaaS Starter Kit': ['launch', 'business-model', 'strategy'],
        'Automation & Workflow': ['automation', 'workflow', 'productivity'],
        'AI-Powered Tools': ['ai', 'chatgpt', 'automation'],
        'Growth & Marketing': ['growth', 'marketing', 'lead-generation'],
        'Developer Resources': ['developer', 'technical', 'api'],
        'Customer Success': ['customer-success', 'retention', 'onboarding']
    };
    
    return [...baseTags, ...(categoryTags[category] || [])];
}

/**
 * Create a single SaaS product
 */
export async function createSaaSProduct(template) {
    console.log(`\n📦 Generating SaaS product...`);
    
    // Select product from template
    const product = template.products[Math.floor(Math.random() * template.products.length)];
    const title = product;
    
    console.log(`  Title: ${title}`);
    console.log(`  Category: ${template.category}`);
    
    // Generate description
    console.log('  Generating SaaS-focused description...');
    const description = await generateSaaSDescription(title, template.category);
    
    // Generate image
    console.log('  Generating product image...');
    const imageBase64 = await generateSaaSImage(title, template.category);
    
    // Generate price
    const price = Math.floor(Math.random() * (template.priceRange[1] - template.priceRange[0] + 1)) + template.priceRange[0];
    console.log(`  Price: $${price}`);
    
    // Generate tags
    const tags = generateSaaSTags(template.category);
    
    // Create in Shopify
    console.log('  Publishing to Shopify...');
    const shopifyProduct = await createShopifyProduct({
        title,
        description,
        productType: template.category,
        price,
        imageBase64,
        tags
    });
    
    console.log(`✓ SaaS product created: ${shopifyProduct.id}`);
    
    return shopifyProduct;
}

/**
 * Generate multiple SaaS products
 */
export async function generateSaaSProducts(count = 10) {
    console.log(`\n🚀 Generating ${count} SaaS-focused products...\n`);
    
    const products = [];
    
    for (let i = 0; i < count; i++) {
        try {
            // Select random template
            const template = SAAS_PRODUCT_TEMPLATES[Math.floor(Math.random() * SAAS_PRODUCT_TEMPLATES.length)];
            
            const product = await createSaaSProduct(template);
            products.push(product);
            
            console.log(`Progress: ${i + 1}/${count}`);
            
            // Wait between products to avoid rate limits
            if (i < count - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error(`Failed to create product ${i + 1}:`, error.message);
        }
    }
    
    console.log(`\n✓ Generated ${products.length}/${count} SaaS products!`);
    
    return products;
}

/**
 * Run generator from command line
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    const count = parseInt(process.argv[2]) || 10;
    
    console.log('================================================');
    console.log('   DRACANUS AI - SAAS PRODUCT GENERATOR');
    console.log('================================================');
    
    generateSaaSProducts(count)
        .then((products) => {
            console.log(`\n✓ Complete! Generated ${products.length} products`);
            console.log('\nProduct Categories:');
            SAAS_PRODUCT_TEMPLATES.forEach(t => {
                console.log(`  - ${t.category}`);
            });
            process.exit(0);
        })
        .catch(error => {
            console.error('\n✗ Error:', error.message);
            process.exit(1);
        });
}

export default { createSaaSProduct, generateSaaSProducts, SAAS_PRODUCT_TEMPLATES };
