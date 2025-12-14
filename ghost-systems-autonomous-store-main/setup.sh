#!/bin/bash
# ================================================
# GHOST SYSTEMS - FULL INTEGRATION SETUP SCRIPT
# ================================================

set -euo pipefail

echo "================================================"
echo "   GHOST SYSTEMS - FULL PROJECT INTEGRATION"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-${SCRIPT_DIR}}"
SOURCE_DIR="${GHOST_SYSTEMS_DIR:-${SCRIPT_DIR}}"
CHECK_SCRIPT="${SCRIPT_DIR}/../scripts/shopify-connection-check.js"

echo -e "${YELLOW}Step 1: Creating integration workspace at ${PROJECT_DIR}...${NC}"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

if [ "$SOURCE_DIR" != "$PROJECT_DIR" ]; then
  echo -e "${YELLOW}Step 2: Copying GhostSystems core files...${NC}"
  cp -r "$SOURCE_DIR"/* "$PROJECT_DIR/" 2>/dev/null || echo -e "${RED}Note: Some files might already exist${NC}"
else
  echo -e "${YELLOW}Step 2: Using existing project workspace (no copy needed)...${NC}"
fi

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
node "$CHECK_SCRIPT"

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
