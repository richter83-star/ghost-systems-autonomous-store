# 📱 Social Media Auto-Posting Setup Guide

**Yes!** Once you create the accounts and provide API credentials, the system can automatically post for you.

---

## ✅ What the System Can Do

### Current Capabilities
- ✅ **Generates** all marketing content (Twitter, LinkedIn, Reddit, Email, Blog)
- ✅ **Posts automatically** to Twitter/X (once configured)
- ✅ **Posts automatically** to LinkedIn (once configured)
- ✅ **Posts automatically** to Reddit (once configured)
- ✅ **Schedules** posts throughout the day
- ✅ **Rotates** products daily

### Daily Posting Schedule
- **Twitter**: 5 posts/day (9 AM, 12 PM, 3 PM, 6 PM, 9 PM)
- **LinkedIn**: 2 posts/day (10 AM, 4 PM)
- **Reddit**: 1 post/day (rotating subreddits)

---

## 🔧 Setup Instructions

### 1. Twitter/X Setup

#### Step 1: Create Twitter Developer Account
1. Go to https://developer.twitter.com/
2. Sign in with your Twitter account
3. Apply for a developer account (usually approved instantly)
4. Create a new App/Project

#### Step 2: Get API Credentials
1. In your Twitter Developer Portal, go to your App
2. Navigate to "Keys and tokens"
3. Generate/regenerate:
   - **API Key** (Consumer Key)
   - **API Secret** (Consumer Secret)
   - **Bearer Token** (for OAuth 2.0)

#### Step 3: Set Permissions
1. Go to "User authentication settings"
2. Enable OAuth 2.0
3. Set app permissions to "Read and Write"
4. Set callback URL: `http://localhost:10000/callback/twitter`

#### Step 4: Add to .env
```env
TWITTER_BEARER_TOKEN=your_bearer_token_here
# OR use OAuth 1.0a:
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
```

**Note**: Bearer Token is simpler for basic posting. OAuth 1.0a is needed for advanced features.

---

### 2. LinkedIn Setup

#### Step 1: Create LinkedIn App
1. Go to https://www.linkedin.com/developers/
2. Click "Create app"
3. Fill in app details:
   - App name: "DRACANUS AI Marketing"
   - Company: Your company
   - App logo: Upload logo
   - Privacy policy URL: Your website
   - App use: Marketing
4. Submit for review

#### Step 2: Get API Credentials
1. In your LinkedIn app, go to "Auth" tab
2. Note your:
   - **Client ID**
   - **Client Secret**
3. Add redirect URL: `http://localhost:10000/callback/linkedin`

#### Step 3: Request Permissions
1. Go to "Products" tab
2. Request access to:
   - **Marketing Developer Platform** (for posting)
   - **Sign In with LinkedIn** (for authentication)

#### Step 4: Get Access Token
You'll need to authenticate and get an access token. Two options:

**Option A: Manual (Quick Start)**
1. Use LinkedIn OAuth tool: https://www.linkedin.com/developers/tools/oauth
2. Authorize your app
3. Copy the access token

**Option B: Automated (Recommended)**
The system can handle OAuth flow automatically (see advanced setup below).

#### Step 5: Add to .env
```env
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_ACCESS_TOKEN=your_access_token
# OR use OAuth flow (system will handle):
LINKEDIN_REDIRECT_URI=http://localhost:10000/callback/linkedin
```

---

### 3. Reddit Setup

#### Step 1: Create Reddit App
1. Go to https://www.reddit.com/prefs/apps
2. Scroll down to "Developed Applications"
3. Click "create another app..."
4. Fill in:
   - Name: "DRACANUS AI Bot"
   - Type: "script"
   - Description: "Automated marketing posts"
   - About URL: Your website
   - Redirect URI: `http://localhost:10000/callback/reddit`
5. Click "create app"

#### Step 2: Get API Credentials
1. Under your app, you'll see:
   - **Client ID** (under the app name, looks like: `abc123def456`)
   - **Client Secret** (click "edit" to reveal, looks like: `xyz789_secret`)

#### Step 3: Add to .env
```env
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
```

**Note**: For better security, use Reddit's OAuth flow instead of password (see advanced setup).

---

## 🚀 Quick Start (After Setup)

### Test Posting
```bash
# Test posting to all platforms
node social-media-poster.js
```

### Run Daily Auto-Post
```bash
# This will:
# 1. Select a product for today
# 2. Generate marketing content
# 3. Post to all configured platforms
node -e "import('./social-media-poster.js').then(m => m.runDailyAutoPost())"
```

### Schedule Daily Posts (Cron/Windows Task Scheduler)
```bash
# Run daily at 9 AM
# Add to crontab (Linux/Mac) or Task Scheduler (Windows)
0 9 * * * cd /path/to/project && node social-media-poster.js
```

---

## 📋 Complete .env Configuration

Add these to your `.env` file:

```env
# TWITTER/X CONFIGURATION
TWITTER_BEARER_TOKEN=your_bearer_token
# OR use OAuth 1.0a:
# TWITTER_API_KEY=your_api_key
# TWITTER_API_SECRET=your_api_secret
# TWITTER_ACCESS_TOKEN=your_access_token
# TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret

# LINKEDIN CONFIGURATION
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_ACCESS_TOKEN=your_access_token
LINKEDIN_REDIRECT_URI=http://localhost:10000/callback/linkedin

# REDDIT CONFIGURATION
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password

# EXISTING CONFIGURATION (keep these)
SHOPIFY_STORE_URL=https://dracanus-ai.myshopify.com
SHOPIFY_ADMIN_API_TOKEN=your_token
GEMINI_API_KEY=your_key
# ... etc
```

---

## 🎯 How It Works

### Daily Flow
1. **9:00 AM**: System selects a product for the day
2. **9:00 AM**: Generates Twitter post → Posts to Twitter
3. **10:00 AM**: Generates LinkedIn post → Posts to LinkedIn
4. **12:00 PM**: Generates Twitter post → Posts to Twitter
5. **3:00 PM**: Generates Twitter post → Posts to Twitter
6. **4:00 PM**: Generates LinkedIn post → Posts to LinkedIn
7. **6:00 PM**: Generates Twitter post → Posts to Twitter
8. **9:00 PM**: Generates Twitter post → Posts to Twitter
9. **Throughout day**: Posts to Reddit (1 post, rotating subreddits)

### Content Generation
- All content is AI-generated using Gemini
- Tailored to each platform's style
- Includes relevant hashtags
- Optimized for engagement

---

## ⚠️ Important Notes

### Rate Limits
- **Twitter**: 300 posts per 15 minutes (we post 5/day, well within limits)
- **LinkedIn**: 25 posts per day (we post 2/day, well within limits)
- **Reddit**: 1 post per 10 minutes per subreddit (we post 1/day, well within limits)

### Best Practices
1. **Start Slow**: Test with 1-2 posts first
2. **Monitor**: Check posts are going live correctly
3. **Engage**: Respond to comments manually (system doesn't auto-reply)
4. **Review**: Check analytics weekly to optimize content

### Security
- Never commit `.env` file to Git
- Keep API credentials secure
- Rotate tokens periodically
- Use OAuth flows when possible (more secure than passwords)

---

## 🔍 Troubleshooting

### Twitter Issues
- **Error: "Unauthorized"**: Check Bearer Token is correct
- **Error: "Rate limit exceeded"**: Wait 15 minutes (unlikely with 5 posts/day)
- **Posts not appearing**: Check Twitter account settings allow API posts

### LinkedIn Issues
- **Error: "Invalid access token"**: Token expires after 60 days, regenerate
- **Error: "Insufficient permissions"**: Request Marketing Developer Platform access
- **Posts not appearing**: Check LinkedIn app is approved

### Reddit Issues
- **Error: "Invalid credentials"**: Check username/password are correct
- **Error: "Forbidden"**: Check subreddit allows self-promotion (some don't)
- **Posts removed**: Some subreddits auto-remove promotional content

---

## 📊 Monitoring & Analytics

### Check Post Status
The system logs all posting attempts:
```
✓ Posted to Twitter: 1234567890
✓ Posted to LinkedIn: urn:li:ugcPost:123456
✓ Posted to r/SaaS: t3_abc123
```

### View Posts
- **Twitter**: Check your Twitter profile
- **LinkedIn**: Check your LinkedIn profile
- **Reddit**: Check your Reddit profile → Posts

### Analytics
- Use each platform's native analytics
- Track engagement (likes, comments, shares)
- Monitor which content performs best
- Adjust strategy based on data

---

## 🎉 You're Ready!

Once you've:
1. ✅ Created social media accounts
2. ✅ Set up API credentials
3. ✅ Added credentials to `.env`
4. ✅ Tested posting

The system will automatically:
- Generate content daily
- Post to all platforms
- Rotate products
- Follow the schedule

**No manual work needed!** 🚀

---

## 📞 Need Help?

- **Twitter API Docs**: https://developer.twitter.com/en/docs
- **LinkedIn API Docs**: https://learn.microsoft.com/en-us/linkedin/
- **Reddit API Docs**: https://www.reddit.com/dev/api/

---

**Generated**: December 17, 2025  
**System**: DRACANUS AI Autonomous Marketing

