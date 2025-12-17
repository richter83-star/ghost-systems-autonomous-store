/**
 * SOCIAL MEDIA AUTO-POSTER
 * Automatically posts generated content to Twitter, LinkedIn, and Reddit
 */

import axios from 'axios';
import 'dotenv/config';
import { generateMarketingCampaign } from './autonomous-marketing.js';
import { getShopifyProducts } from './shopify-integration.js';

/**
 * Post to Twitter/X using Twitter API v2
 */
async function postToTwitter(content) {
    try {
        if (!process.env.TWITTER_BEARER_TOKEN && !process.env.TWITTER_API_KEY) {
            console.log('⚠ Twitter credentials not configured. Skipping Twitter post.');
            return { success: false, reason: 'No credentials' };
        }

        // Twitter API v2 endpoint
        const url = 'https://api.twitter.com/2/tweets';
        
        const headers = {
            'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
            'Content-Type': 'application/json'
        };

        const payload = {
            text: content.substring(0, 280) // Twitter character limit
        };

        const response = await axios.post(url, payload, { headers });
        
        console.log(`✓ Posted to Twitter: ${response.data.data.id}`);
        return { 
            success: true, 
            tweetId: response.data.data.id,
            url: `https://twitter.com/i/web/status/${response.data.data.id}`
        };
    } catch (error) {
        console.error('✗ Twitter post failed:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Post to LinkedIn using LinkedIn API
 */
async function postToLinkedIn(content) {
    try {
        if (!process.env.LINKEDIN_ACCESS_TOKEN) {
            console.log('⚠ LinkedIn credentials not configured. Skipping LinkedIn post.');
            return { success: false, reason: 'No credentials' };
        }

        // Get user's LinkedIn URN first
        const profileUrl = 'https://api.linkedin.com/v2/userinfo';
        const profileHeaders = {
            'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        };

        let personUrn;
        try {
            const profileResponse = await axios.get(profileUrl, { headers: profileHeaders });
            personUrn = `urn:li:person:${profileResponse.data.sub}`;
        } catch (err) {
            // Alternative: use LinkedIn API v2 to get URN
            const meUrl = 'https://api.linkedin.com/v2/me';
            const meResponse = await axios.get(meUrl, { headers: profileHeaders });
            personUrn = meResponse.data.id;
        }

        // Post to LinkedIn
        const postUrl = 'https://api.linkedin.com/v2/ugcPosts';
        
        const payload = {
            author: personUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                        text: content
                    },
                    shareMediaCategory: 'NONE'
                }
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
            }
        };

        const headers = {
            'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
        };

        const response = await axios.post(postUrl, payload, { headers });
        
        console.log(`✓ Posted to LinkedIn: ${response.data.id}`);
        return { success: true, postId: response.data.id };
    } catch (error) {
        console.error('✗ LinkedIn post failed:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Post to Reddit using Reddit API
 */
async function postToReddit(subreddit, title, content) {
    try {
        if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET || !process.env.REDDIT_USERNAME || !process.env.REDDIT_PASSWORD) {
            console.log('⚠ Reddit credentials not configured. Skipping Reddit post.');
            return { success: false, reason: 'No credentials' };
        }

        // Step 1: Get access token
        const authUrl = 'https://www.reddit.com/api/v1/access_token';
        const authData = new URLSearchParams({
            grant_type: 'password',
            username: process.env.REDDIT_USERNAME,
            password: process.env.REDDIT_PASSWORD
        });

        const authHeaders = {
            'Authorization': `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'DRACANUS-AI-Bot/1.0'
        };

        const authResponse = await axios.post(authUrl, authData, { headers: authHeaders });
        const accessToken = authResponse.data.access_token;

        // Step 2: Post to Reddit
        const postUrl = 'https://oauth.reddit.com/api/submit';
        const postData = new URLSearchParams({
            sr: subreddit,
            kind: 'self',
            title: title.substring(0, 300), // Reddit title limit
            text: content
        });

        const postHeaders = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'DRACANUS-AI-Bot/1.0'
        };

        const response = await axios.post(postUrl, postData, { headers: postHeaders });
        
        console.log(`✓ Posted to r/${subreddit}: ${response.data.json.data.name}`);
        return { 
            success: true, 
            postId: response.data.json.data.name,
            url: `https://reddit.com${response.data.json.data.permalink}`
        };
    } catch (error) {
        console.error(`✗ Reddit post to r/${subreddit} failed:`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Schedule and post content automatically
 */
async function scheduleAndPost(campaign, schedule = {}) {
    const results = {
        twitter: [],
        linkedin: [],
        reddit: []
    };

    // Post Twitter content
    if (campaign.social?.twitter && process.env.TWITTER_BEARER_TOKEN) {
        console.log('\n📱 Posting to Twitter...');
        for (const tweet of campaign.social.twitter) {
            const result = await postToTwitter(tweet);
            results.twitter.push(result);
            // Rate limit: Twitter allows 300 posts per 15 minutes
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        }
    }

    // Post LinkedIn content
    if (campaign.social?.linkedin && process.env.LINKEDIN_ACCESS_TOKEN) {
        console.log('\n💼 Posting to LinkedIn...');
        for (const post of campaign.social.linkedin) {
            const result = await postToLinkedIn(post);
            results.linkedin.push(result);
            // Rate limit: LinkedIn allows 25 posts per day
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        }
    }

    // Post Reddit content
    if (campaign.reddit && process.env.REDDIT_CLIENT_ID) {
        console.log('\n🗣️ Posting to Reddit...');
        for (const redditPost of campaign.reddit) {
            // Extract title and body from Reddit post format
            const lines = redditPost.content.split('\n');
            const titleLine = lines.find(l => l.startsWith('TITLE:'));
            const bodyStart = lines.findIndex(l => l.startsWith('BODY:'));
            
            const title = titleLine ? titleLine.replace('TITLE:', '').trim() : `About ${campaign.product.title}`;
            const body = bodyStart >= 0 ? lines.slice(bodyStart + 1).join('\n').trim() : redditPost.content;

            const result = await postToReddit(redditPost.subreddit, title, body);
            results.reddit.push(result);
            // Rate limit: Reddit allows 1 post per 10 minutes per subreddit
            await new Promise(resolve => setTimeout(resolve, 600000)); // 10 minute delay
        }
    }

    return results;
}

/**
 * Auto-post marketing campaign for a product
 */
export async function autoPostCampaign(product) {
    console.log(`\n🚀 Auto-posting campaign for: ${product.title}`);
    
    // Generate campaign
    const campaign = await generateMarketingCampaign(product);
    
    // Post to social media
    const results = await scheduleAndPost(campaign);
    
    return {
        campaign,
        postingResults: results
    };
}

/**
 * Daily auto-posting schedule
 * Posts content according to the marketing schedule
 */
export async function runDailyAutoPost() {
    console.log('================================================');
    console.log('   DAILY AUTO-POSTING SCHEDULE');
    console.log('================================================\n');

    // Get products
    const products = await getShopifyProducts(10);
    console.log(`Found ${products.length} products\n`);

    // Select product for today (rotate through products)
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const productIndex = dayOfYear % products.length;
    const product = products[productIndex];

    console.log(`📦 Selected product for today: ${product.title}\n`);

    // Generate and post campaign
    const result = await autoPostCampaign(product);

    console.log('\n================================================');
    console.log('   POSTING SUMMARY');
    console.log('================================================\n');

    const twitterSuccess = result.postingResults.twitter.filter(r => r.success).length;
    const linkedinSuccess = result.postingResults.linkedin.filter(r => r.success).length;
    const redditSuccess = result.postingResults.reddit.filter(r => r.success).length;

    console.log(`Twitter: ${twitterSuccess}/${result.postingResults.twitter.length} posted`);
    console.log(`LinkedIn: ${linkedinSuccess}/${result.postingResults.linkedin.length} posted`);
    console.log(`Reddit: ${redditSuccess}/${result.postingResults.reddit.length} posted`);

    return result;
}

/**
 * Schedule posts throughout the day
 */
export async function scheduleDailyPosts() {
    const schedule = {
        twitter: [
            { time: '09:00', type: 'educational' },
            { time: '12:00', type: 'product' },
            { time: '15:00', type: 'social-proof' },
            { time: '18:00', type: 'industry-insight' },
            { time: '21:00', type: 'engagement' }
        ],
        linkedin: [
            { time: '10:00', type: 'value' },
            { time: '16:00', type: 'product-showcase' }
        ]
    };

    console.log('📅 Daily posting schedule configured:');
    console.log('   Twitter: 5 posts/day');
    console.log('   LinkedIn: 2 posts/day');
    console.log('   Reddit: 1 post/day (rotating subreddits)');
    
    return schedule;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runDailyAutoPost()
        .then(() => {
            console.log('\n✅ Daily auto-posting complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n✗ Error:', error.message);
            process.exit(1);
        });
}

export default {
    postToTwitter,
    postToLinkedIn,
    postToReddit,
    autoPostCampaign,
    runDailyAutoPost,
    scheduleDailyPosts
};

