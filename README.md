# 🤖 DRACANUS AI - Single-Offer Shopify Store

![DRACANUS AI](https://cdn.shopify.com/s/files/1/0608/1855/4977/t/4/assets/dracanus-logo.jpg?v=1765538498)

## Complete Autonomous E-Commerce System

**Live Store**: https://dracanus-ai.myshopify.com

This repository now operates in a **single-offer mode** anchored on the Ghost Launch Bundle. Scripts default to dry-runs to keep production safe; enabling mutations requires explicit flags and environment gates.

## 🚀 Features

- ✅ **Single Offer Mode**: Ghost Launch Bundle defined in `store/ghost-offer.json`
- ✅ **Safe Publishing**: Mutation guardrails + explicit `--apply=true` flag
- ✅ **Shopify Integration**: Admin API upsert and optional unpublish of other SKUs
- ✅ **AI Product Generation**: Gemini-powered descriptions & images (available for future experiments)
- ✅ **Marketing Automation**: Social media, email, SEO content (opt-in)

## 🎯 What's Included

### Backend Services
- Express REST API server
- Shopify Admin API integration
- Firebase/Firestore database
- Webhook processing
- Analytics tracking

### AI Systems
- Product description generator (Gemini 2.5 Flash)
- Product image generator (Gemini 2.0 Flash)
- Marketing content generator
- Email sequence generator
- Blog post generator

### Marketing Automation
- Twitter content (5 posts/day)
- LinkedIn content (2 posts/day)
- Reddit community posts
- 7-day email sequences
- SEO-optimized blog posts

## 🛠️ Tech Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **E-commerce**: Shopify Admin API
- **Database**: Firebase Firestore
- **AI**: Google Gemini 2.5
- **Language**: JavaScript (ES Modules)

## 📦 Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run tests
npm test

# Start server
npm start
```

## 🚀 Quick Start

### Publish the Ghost Launch Bundle (dry-run by default)
```bash
# Preview Shopify payload (no mutations)
npm run ghost:publish

# Apply changes (requires env gate)
MUTATIONS_ENABLED=true npm run ghost:publish -- --apply=true
```

### Unpublish any non-Ghost products
```bash
# Applies only when mutation guard is enabled
npm run ghost:unpublish:apply
```

## 📚 Documentation

- `AUTONOMOUS_STORE_COMPLETE.md` - Complete implementation guide
- `DEPLOYMENT_GUIDE.md` - Production deployment
- `MARKETING_CALENDAR.md` - 30-day marketing schedule
- `TRAFFIC_GENERATION_PLAN.md` - Traffic strategy
- `ANALYTICS_SETUP.md` - Tracking configuration

## 🎯 Single Offer Details

The canonical product lives at `store/ghost-offer.json` and includes handle, price, SEO metadata, and the HTML product body. The publish script reads this file as the source of truth and will only mutate Shopify when both `--apply=true` and `MUTATIONS_ENABLED=true` (or `ALLOW_MUTATIONS=true`) are set. Use the unpublish helper to draft any non-Ghost products when you need a pure single-offer storefront.

## 🔑 Environment Variables

```env
# Shopify
SHOPIFY_STORE_URL=your_store_url
SHOPIFY_ADMIN_API_TOKEN=your_token
SHOPIFY_API_VERSION=2024-10

# AI
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash

# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON=your_firebase_credentials
```

## 🧪 Testing

```bash
# Run all integration tests
npm test

# Expected: 6/6 tests passing
```

## 🎯 API Endpoints

- `GET /` - Health check
- `GET /api/products` - List products
- `POST /api/products/generate` - Generate products
- `GET /api/analytics` - View analytics
- `POST /webhook/shopify/orders` - Order webhook
- `POST /api/cycle/run` - Trigger decision cycle (dry-run by default unless `apply=true`)
- `GET /api/cycle/:cycleId` - Fetch a specific cycle report
- `GET /api/planner/test` - Validate Gemini planner connectivity

### Decision cycle responses

The cycle endpoints always return a stable envelope with convenience fields alongside the full report object:

```json
{
  "success": true,
  "cycleId": "8c1c...",
  "jobId": "a12b...",
  "apply": false,
  "dryRun": true,
  "reportSummary": "queued",
  "report": null
}
```

Fetching a completed cycle echoes the same fields with the full report populated. The API treats `apply`/`dryRun` strictly (strings "true"/"false" or booleans) so `apply=false` will always enforce a dry run and skip mutations. Set an environment gate `MUTATIONS_ENABLED=false` (or `ALLOW_MUTATIONS=false`) to force executor skips even when `apply=true`.

## 📊 Analytics

Track key metrics:
- Traffic sources
- Conversion rates
- Revenue by product
- Marketing ROI
- Customer behavior

## 🤝 Contributing

This is a private autonomous store system. Not open for contributions.

## 📄 License

Proprietary - All Rights Reserved

## 🔗 Links

- **Live Store**: https://dracanus-ai.myshopify.com
- **Documentation**: See `/docs` folder
- **Support**: See documentation files

---

**Built with AI. Powered by Automation. Optimized for Profit.**

🚀 DRACANUS AI - Autonomous Commerce Systems


## Security & Configuration

- Never commit secrets to the repo (Shopify tokens, Render API keys, Firebase service accounts).
- Configure environment variables in your host (Render) using `.env.example` as a template.

**Webhook security (recommended):**
- Set `SHOPIFY_WEBHOOK_SECRET` and the server will verify webhook authenticity via HMAC.
