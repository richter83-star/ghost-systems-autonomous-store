/**
 * AUTONOMOUS MARKETING SYSTEM
 * Complete traffic generation and marketing automation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getShopifyProducts } from './shopify-integration.js';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * MARKETING CAMPAIGNS CONFIGURATION
 */
const MARKETING_CHANNELS = {
    twitter: {
        enabled: true,
        postsPerDay: 5,
        hashtags: ['#SaaS', '#Startup', '#IndieHacker', '#Automation', '#NoCode']
    },
    linkedin: {
        enabled: true,
        postsPerDay: 2,
        hashtags: ['#SaaS', '#B2B', '#TechStartup', '#Entrepreneurship']
    },
    reddit: {
        enabled: true,
        subreddits: ['SaaS', 'Entrepreneur', 'startups', 'microsaas', 'IndieBiz'],
        postsPerWeek: 7
    },
    email: {
        enabled: true,
        sequenceLength: 7,
        sendTime: '09:00'
    },
    seo: {
        enabled: true,
        contentPerWeek: 3,
        keywordTargets: 100
    }
};

/**
 * Generate social media post
 */
async function generateSocialPost(product, platform = 'twitter') {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `Create a ${platform} post for this SaaS product:

Title: ${product.title}
Price: $${product.variants[0]?.price}
Category: ${product.product_type}

Requirements for ${platform}:
${platform === 'twitter' ? '- Max 280 characters\n- Include 3-5 relevant hashtags\n- Hook in first line\n- Clear call-to-action' : ''}
${platform === 'linkedin' ? '- 150-200 words\n- Professional tone\n- Value proposition focus\n- Question to engage audience' : ''}
${platform === 'reddit' ? '- Conversational, not salesy\n- Share genuine value first\n- Include personal experience angle\n- Soft product mention' : ''}

Make it engaging and conversion-focused. Return ONLY the post text.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        
        return text;
    } catch (error) {
        console.error(`Error generating ${platform} post:`, error.message);
        return null;
    }
}

/**
 * Generate email sequence
 */
async function generateEmailSequence(product) {
    const emails = [];
    
    const emailTopics = [
        'Welcome + Problem Awareness',
        'Solution Introduction',
        'Social Proof + Case Study',
        'Feature Deep Dive',
        'Common Objections Handled',
        'Limited Time Offer',
        'Final Reminder + Bonuses'
    ];
    
    console.log(`\nGenerating email sequence for: ${product.title}`);
    
    for (let i = 0; i < 7; i++) {
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            
            const prompt = `Write Email ${i + 1} of 7 for an email sequence selling "${product.title}"

Email Topic: ${emailTopics[i]}
Product Price: $${product.variants[0]?.price}
Product Type: ${product.product_type}

Requirements:
- Subject line that gets opens
- Personal, conversational tone
- 200-300 words
- One clear CTA
- Format in plain text (no HTML)
- Use storytelling
- ${i === 0 ? 'Set expectations for the sequence' : ''}
- ${i === 6 ? 'Create urgency without being pushy' : ''}

Return format:
SUBJECT: [subject line]
BODY:
[email body]`;

            const result = await model.generateContent(prompt);
            const email = result.response.text().trim();
            
            emails.push({
                day: i + 1,
                topic: emailTopics[i],
                content: email
            });
            
            console.log(`  ✓ Email ${i + 1} generated`);
            
            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`  ✗ Failed to generate email ${i + 1}`);
        }
    }
    
    return emails;
}

/**
 * Generate SEO-optimized blog post
 */
async function generateBlogPost(product) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `Write an SEO-optimized blog post about "${product.title}"

Product Category: ${product.product_type}
Target Keywords: "saas tools", "startup resources", "${product.product_type.toLowerCase()}"

Requirements:
- Engaging headline with keyword
- 1000-1500 words
- Include: Introduction, 3-5 main sections, Conclusion
- Add FAQ section at the end
- Natural keyword placement
- Include specific examples and use cases
- Conversational but authoritative tone
- Subtle product mention in conclusion
- Meta description (155 characters)

Format in Markdown.`;

        const result = await model.generateContent(prompt);
        const blogPost = result.response.text().trim();
        
        return blogPost;
    } catch (error) {
        console.error('Error generating blog post:', error.message);
        return null;
    }
}

/**
 * Generate Reddit community posts
 */
async function generateRedditPosts(product) {
    const posts = [];
    const subreddits = MARKETING_CHANNELS.reddit.subreddits;
    
    for (const subreddit of subreddits) {
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            
            const prompt = `Create a Reddit post for r/${subreddit} about ${product.title}

Rules for r/${subreddit}:
- NO SELF-PROMOTION (be subtle)
- Provide genuine value first
- Share personal experience or insight
- Only mention product if asked or very naturally
- Conversational tone
- Ask engaging question

Create a post that:
1. Shares valuable insight about ${product.product_type}
2. Naturally relates to ${product.title}
3. Encourages discussion
4. Follows Reddit etiquette

Format:
TITLE: [catchy title]
BODY: [post content 200-400 words]`;

            const result = await model.generateContent(prompt);
            const post = result.response.text().trim();
            
            posts.push({
                subreddit,
                content: post
            });
            
            console.log(`  ✓ Reddit post for r/${subreddit} generated`);
            
        } catch (error) {
            console.error(`  ✗ Failed to generate Reddit post for r/${subreddit}`);
        }
    }
    
    return posts;
}

/**
 * Generate complete marketing campaign for product
 */
export async function generateMarketingCampaign(product) {
    console.log(`\n🎯 Generating marketing campaign for: ${product.title}`);
    
    const campaign = {
        product: {
            id: product.id,
            title: product.title,
            price: product.variants[0]?.price
        },
        social: {},
        email: [],
        content: {},
        reddit: []
    };
    
    // Generate Twitter posts
    if (MARKETING_CHANNELS.twitter.enabled) {
        console.log('\n📱 Generating Twitter content...');
        campaign.social.twitter = [];
        for (let i = 0; i < 5; i++) {
            const post = await generateSocialPost(product, 'twitter');
            if (post) campaign.social.twitter.push(post);
        }
        console.log(`  ✓ Generated ${campaign.social.twitter.length} tweets`);
    }
    
    // Generate LinkedIn posts
    if (MARKETING_CHANNELS.linkedin.enabled) {
        console.log('\n💼 Generating LinkedIn content...');
        campaign.social.linkedin = [];
        for (let i = 0; i < 2; i++) {
            const post = await generateSocialPost(product, 'linkedin');
            if (post) campaign.social.linkedin.push(post);
        }
        console.log(`  ✓ Generated ${campaign.social.linkedin.length} LinkedIn posts`);
    }
    
    // Generate email sequence
    if (MARKETING_CHANNELS.email.enabled) {
        console.log('\n📧 Generating email sequence...');
        campaign.email = await generateEmailSequence(product);
        console.log(`  ✓ Generated ${campaign.email.length}-email sequence`);
    }
    
    // Generate blog post
    if (MARKETING_CHANNELS.seo.enabled) {
        console.log('\n📝 Generating SEO blog post...');
        campaign.content.blogPost = await generateBlogPost(product);
        if (campaign.content.blogPost) {
            console.log('  ✓ Blog post generated');
        }
    }
    
    // Generate Reddit posts
    if (MARKETING_CHANNELS.reddit.enabled) {
        console.log('\n🗣️ Generating Reddit posts...');
        campaign.reddit = await generateRedditPosts(product);
        console.log(`  ✓ Generated ${campaign.reddit.length} Reddit posts`);
    }
    
    return campaign;
}

/**
 * Generate campaigns for all products
 */
export async function generateAllCampaigns() {
    console.log('================================================');
    console.log('   AUTONOMOUS MARKETING CAMPAIGN GENERATOR');
    console.log('================================================\n');
    
    // Get products from Shopify
    console.log('Fetching products from store...');
    const products = await getShopifyProducts(10);
    console.log(`Found ${products.length} products\n`);
    
    const campaigns = [];
    
    for (let i = 0; i < Math.min(products.length, 3); i++) {
        const campaign = await generateMarketingCampaign(products[i]);
        campaigns.push(campaign);
        
        // Save campaign
        const fs = await import('fs');
        const filename = `/home/user/ghost-project-integration/campaigns/campaign-${campaign.product.id}.json`;
        fs.mkdirSync('/home/user/ghost-project-integration/campaigns', { recursive: true });
        fs.writeFileSync(filename, JSON.stringify(campaign, null, 2));
        console.log(`\n✓ Campaign saved: ${filename}`);
        
        // Wait between campaigns
        if (i < products.length - 1) {
            console.log('\nWaiting before next campaign...\n');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log(`\n✓ Generated ${campaigns.length} complete marketing campaigns!`);
    return campaigns;
}

/**
 * Traffic generation strategies
 */
export const TRAFFIC_STRATEGIES = {
    organic: {
        seo: {
            targetKeywords: [
                'saas tools for startups',
                'startup automation tools',
                'saas growth resources',
                'indie hacker tools',
                'micro saas ideas'
            ],
            contentTypes: ['blog posts', 'guides', 'comparisons', 'tutorials']
        },
        social: {
            platforms: ['Twitter', 'LinkedIn', 'Reddit', 'Indie Hackers'],
            frequency: 'Daily engagement + 3-5 posts/day'
        }
    },
    paid: {
        platforms: ['Google Ads', 'Twitter Ads', 'LinkedIn Ads'],
        budget: '$50-500/month',
        targeting: 'SaaS founders, startup employees, indie hackers'
    },
    partnerships: {
        types: ['Affiliate', 'Cross-promotion', 'Bundle deals'],
        targets: ['SaaS influencers', 'Startup communities', 'Tech newsletters']
    }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    generateAllCampaigns()
        .then(() => {
            console.log('\n🎉 Marketing automation complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n✗ Error:', error.message);
            process.exit(1);
        });
}

export default { 
    generateMarketingCampaign, 
    generateAllCampaigns,
    generateSocialPost,
    generateEmailSequence,
    generateBlogPost,
    MARKETING_CHANNELS,
    TRAFFIC_STRATEGIES
};
