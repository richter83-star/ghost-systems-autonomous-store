# 🚀 Quick Start: Auto-Posting Setup

## Yes! The system can post automatically once you connect your accounts.

---

## ⚡ 3-Step Setup

### 1️⃣ Get API Credentials

**Twitter/X:**
- Go to https://developer.twitter.com/
- Create app → Get Bearer Token

**LinkedIn:**
- Go to https://www.linkedin.com/developers/
- Create app → Get Client ID & Secret → Get Access Token

**Reddit:**
- Go to https://www.reddit.com/prefs/apps
- Create app → Get Client ID & Secret

### 2️⃣ Add to .env File

```env
# Twitter
TWITTER_BEARER_TOKEN=your_token_here

# LinkedIn  
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_secret
LINKEDIN_ACCESS_TOKEN=your_token

# Reddit
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_secret
REDDIT_USERNAME=your_username
REDDIT_PASSWORD=your_password
```

### 3️⃣ Run Auto-Poster

```bash
npm run marketing:post
```

**That's it!** The system will:
- ✅ Generate content automatically
- ✅ Post to Twitter (5x/day)
- ✅ Post to LinkedIn (2x/day)
- ✅ Post to Reddit (1x/day)

---

## 📅 Daily Schedule

- **9 AM**: Twitter post
- **10 AM**: LinkedIn post
- **12 PM**: Twitter post
- **3 PM**: Twitter post
- **4 PM**: LinkedIn post
- **6 PM**: Twitter post
- **9 PM**: Twitter post
- **Throughout**: Reddit posts

---

## 📖 Full Guide

See `SOCIAL_MEDIA_SETUP.md` for detailed instructions.

---

**Ready to automate your marketing!** 🎉

