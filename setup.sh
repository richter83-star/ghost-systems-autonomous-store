#!/bin/bash
# ================================================
# GHOST SYSTEMS - FULL INTEGRATION SETUP SCRIPT
# ================================================

set -e

echo "================================================"
echo "   GHOST SYSTEMS - FULL PROJECT INTEGRATION"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_DIR="/home/user/ghost-project-integration"
GHOST_SYSTEMS_DIR="/home/user/ghost-project/GhostSystems"

echo -e "${YELLOW}Step 1: Creating integration workspace...${NC}"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

echo -e "${YELLOW}Step 2: Copying GhostSystems core files...${NC}"
cp -r "$GHOST_SYSTEMS_DIR"/* "$PROJECT_DIR/" 2>/dev/null || {
    echo -e "${RED}Note: Some files might already exist${NC}"
}

echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ No package.json found${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 4: Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env file not found!${NC}"
    echo "Please create .env file with required credentials"
    exit 1
else
    echo -e "${GREEN}✓ Environment file found${NC}"
fi

echo -e "${YELLOW}Step 5: Validating Shopify connection...${NC}"
node -e "
const axios = require('axios');
require('dotenv').config();

(async () => {
    try {
        const response = await axios.get(
            'https://dracanus-ai.myshopify.com/admin/api/2024-10/shop.json',
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_TOKEN
                }
            }
        );
        console.log('✓ Shopify connection successful:', response.data.shop.name);
    } catch (error) {
        console.error('✗ Shopify connection failed:', error.message);
        process.exit(1);
    }
})();
"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   INTEGRATION SETUP COMPLETE${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Configure Firebase credentials in .env"
echo "2. Add Gemini API key in .env"
echo "3. Run: npm start"
echo ""
