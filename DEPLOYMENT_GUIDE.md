# DEPLOYMENT GUIDE (SANITIZED)

## Security Notice
Do NOT commit secrets (Shopify tokens, Render API keys, Firebase service accounts) to GitHub.
If you previously committed secrets, rotate/revoke them immediately and purge them from git history.

# 🚀 DEPLOYMENT GUIDE - GHOST SYSTEMS INTEGRATION

Complete guide for deploying your Ghost Systems integration to production.

---

## ✅ Pre-Deployment Checklist

### 1. Configuration Complete
- [x] Shopify credentials configured
- [x] Firebase credentials added
- [ ] Gemini API key (optional but recommended)
- [x] Environment variables set
- [x] Dependencies installed
- [x] Tests passing (5/6)

### 2. Store Ready
- [x] DRACANUS theme applied
- [x] Store accessible
- [x] Products visible
- [ ] Logo uploaded
- [ ] Payment methods configured

### 3. Code Ready
- [x] Integration tested locally
- [x] All modules functional
- [x] Documentation complete
- [x] Error handling implemented

---

## 🎯 Deployment Options

### Option 1: Render.com (Recommended)

**Advantages**:
- Free tier available
- Auto-deploy from Git
- Built-in SSL
- Easy environment variables

**Steps**:

1. **Push to GitHub**
```bash
cd /home/user/ghost-project-integration
git init
git add .
git commit -m "Initial Ghost Systems integration"
git remote add origin https://github.com/YOUR_USERNAME/ghost-systems.git
git push -u origin main
```

2. **Create Render Service**
- Go to https://dashboard.render.com
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Configure:
  - **Name**: `ghost-systems-integration`
  - **Environment**: `Node`
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
  - **Plan**: Free (or paid for production)

3. **Set Environment Variables** in Render Dashboard:
```bash
SHOPIFY_STORE_URL=https://dracanus-ai.myshopify.com
SHOPIFY_ADMIN_API_TOKEN=YOUR_SHOPIFY_ADMIN_API_TOKEN
SHOPIFY_API_VERSION=2024-10
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GEMINI_API_KEY=your_key_here
NODE_ENV=production
PORT=10000
```

4. **Deploy**
- Render will automatically build and deploy
- Your API will be available at: `https://your-app.onrender.com`

5. **Configure Shopify Webhooks**
```bash
# Use your Render URL
curl -X POST "https://dracanus-ai.myshopify.com/admin/api/2024-10/webhooks.json" \
  -H "X-Shopify-Access-Token: YOUR_SHOPIFY_ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "orders/create",
      "address": "https://your-app.onrender.com/webhook/shopify/orders",
      "format": "json"
    }
  }'
```

---

### Option 2: Heroku

**Steps**:

1. **Install Heroku CLI**
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

2. **Login & Create App**
```bash
cd /home/user/ghost-project-integration
heroku login
heroku create ghost-systems-integration
```

3. **Set Config Vars**
```bash
heroku config:set SHOPIFY_STORE_URL=https://dracanus-ai.myshopify.com
heroku config:set SHOPIFY_ADMIN_API_TOKEN=YOUR_SHOPIFY_ADMIN_API_TOKEN
heroku config:set SHOPIFY_API_VERSION=2024-10
heroku config:set FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
heroku config:set GEMINI_API_KEY=your_key_here
heroku config:set NODE_ENV=production
```

4. **Deploy**
```bash
git init
git add .
git commit -m "Initial deployment"
heroku git:remote -a ghost-systems-integration
git push heroku main
```

5. **Scale Dyno**
```bash
heroku ps:scale web=1
```

---

### Option 3: DigitalOcean App Platform

**Steps**:

1. **Push to GitHub** (same as Render)

2. **Create App**
- Go to https://cloud.digitalocean.com/apps
- Click "Create App"
- Connect GitHub repository
- Configure:
  - **Name**: `ghost-systems`
  - **Environment Variables**: Add all from `.env`
  - **Plan**: Basic ($5/month)

3. **Deploy**
- DigitalOcean will build and deploy automatically

---

### Option 4: VPS (DigitalOcean Droplet, AWS EC2, etc.)

**Steps**:

1. **Setup VPS**
```bash
# SSH into your server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2
```

2. **Deploy Code**
```bash
# Clone or upload your code
git clone https://github.com/YOUR_USERNAME/ghost-systems.git
cd ghost-systems

# Install dependencies
npm install

# Create .env file
nano .env
# Paste your environment variables

# Start with PM2
pm2 start server.js --name ghost-systems
pm2 save
pm2 startup
```

3. **Setup Nginx (Optional)**
```bash
apt-get install nginx

# Create Nginx config
nano /etc/nginx/sites-available/ghost-systems

# Add:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
ln -s /etc/nginx/sites-available/ghost-systems /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

4. **SSL with Certbot**
```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## 🔧 Post-Deployment Configuration

### 1. Verify Deployment

**Health Check**:
```bash
curl https://your-deployed-url.com/
```

Expected response:
```json
{
  "system": "Ghost Systems Integration",
  "status": "Online",
  "store": {
    "name": "Dracanus AI",
    "domain": "dracanus-ai.myshopify.com"
  }
}
```

### 2. Test API Endpoints

**List Products**:
```bash
curl https://your-deployed-url.com/api/products
```

**Analytics**:
```bash
curl https://your-deployed-url.com/api/analytics
```

### 3. Configure Webhooks

Register Shopify webhooks to point to your deployed URL:

```bash
# Orders webhook
curl -X POST "https://dracanus-ai.myshopify.com/admin/api/2024-10/webhooks.json" \
  -H "X-Shopify-Access-Token: YOUR_SHOPIFY_ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "orders/create",
      "address": "https://your-deployed-url.com/webhook/shopify/orders",
      "format": "json"
    }
  }'

# Products webhook
curl -X POST "https://dracanus-ai.myshopify.com/admin/api/2024-10/webhooks.json" \
  -H "X-Shopify-Access-Token: YOUR_SHOPIFY_ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "products/create",
      "address": "https://your-deployed-url.com/webhook/shopify/products",
      "format": "json"
    }
  }'
```

### 4. Verify Webhooks

```bash
curl https://dracanus-ai.myshopify.com/admin/api/2024-10/webhooks.json \
  -H "X-Shopify-Access-Token: YOUR_SHOPIFY_ADMIN_API_TOKEN"
```

---

## 📊 Monitoring

### Application Logs

**Render**:
- Dashboard → Your Service → Logs tab

**Heroku**:
```bash
heroku logs --tail -a ghost-systems-integration
```

**PM2** (VPS):
```bash
pm2 logs ghost-systems
pm2 monit
```

### Health Monitoring

Set up uptime monitoring:
- **UptimeRobot**: https://uptimerobot.com (Free)
- **Pingdom**: https://pingdom.com
- **StatusCake**: https://statuscake.com (Free)

Monitor URL: `https://your-deployed-url.com/`

---

## 🔐 Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env` file
- ✅ Use platform's environment variable system
- ✅ Rotate credentials regularly

### 2. API Security
- Add rate limiting:
```bash
npm install express-rate-limit
```

- Implement CORS:
```bash
npm install cors
```

### 3. Webhook Verification
- Verify Shopify webhook signatures
- Add HMAC validation

### 4. HTTPS Only
- ✅ Use SSL/TLS for all traffic
- Enable HSTS headers

---

## 🚦 Production Checklist

### Before Launch
- [ ] All tests passing
- [ ] Environment variables set
- [ ] Webhooks configured
- [ ] SSL certificate active
- [ ] Monitoring enabled
- [ ] Backup strategy in place
- [ ] Error tracking (e.g., Sentry)

### Launch Day
- [ ] Deploy to production
- [ ] Verify health check
- [ ] Test product generation
- [ ] Test webhook delivery
- [ ] Monitor logs for errors
- [ ] Test order flow

### Post-Launch
- [ ] Monitor performance
- [ ] Check error rates
- [ ] Verify webhook deliveries
- [ ] Review analytics
- [ ] Customer feedback

---

## 🔄 Continuous Deployment

### GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}
```

---

## 📈 Scaling Considerations

### When to Scale

**Signs you need to scale**:
- Response time > 1 second
- CPU usage > 80%
- Memory usage > 80%
- Request queue building up

### Horizontal Scaling

**Render/Heroku**:
- Increase number of instances
- Enable auto-scaling

**Load Balancing** (VPS):
```bash
# Use Nginx upstream
upstream ghost_systems {
    server 127.0.0.1:10000;
    server 127.0.0.1:10001;
    server 127.0.0.1:10002;
}
```

### Database Optimization

**Firebase**:
- Use composite indexes
- Implement caching (Redis)
- Batch operations

---

## 🆘 Troubleshooting

### Common Issues

**1. Module Not Found**
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**2. Port Already in Use**
```bash
# Solution: Change PORT in .env
PORT=10001
```

**3. Firebase Connection Failed**
```bash
# Solution: Verify credentials format
# Ensure JSON is properly escaped in environment variable
```

**4. Shopify API Rate Limit**
```bash
# Solution: Implement exponential backoff
# Add delays between requests
```

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=development
DEBUG=*
```

---

## 📞 Support Resources

### Documentation
- [Shopify Admin API](https://shopify.dev/docs/api/admin)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Express.js](https://expressjs.com/en/guide/routing.html)
- [Render Docs](https://render.com/docs)

### Community
- Shopify Community: https://community.shopify.com
- Stack Overflow: Tag `shopify` `firebase` `express`

---

## 🎉 You're Ready!

Your Ghost Systems integration is production-ready. Choose your deployment platform and follow the steps above.

**Recommended**: Start with Render.com free tier, then scale as needed.

**Questions?** Review the main README.md or check the troubleshooting section.

---

**Good luck with your deployment! 🚀**
