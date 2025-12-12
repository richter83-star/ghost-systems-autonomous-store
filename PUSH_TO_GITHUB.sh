#!/bin/bash

echo "================================================"
echo "   DRACANUS AI - GitHub Push Script"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}This script will help you push to GitHub${NC}"
echo ""
echo "Before running, create a new repository at:"
echo "https://github.com/new"
echo ""
echo "Repository settings:"
echo "  - Name: ghost-systems-autonomous-store"
echo "  - Description: Complete autonomous SaaS store with AI"
echo "  - Private: Recommended"
echo ""
read -p "Have you created the GitHub repository? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Please create the repository first, then run this script again."
    exit 1
fi

echo ""
read -p "Enter your GitHub username: " username
echo ""

REPO_URL="https://github.com/$username/ghost-systems-autonomous-store.git"

echo -e "${YELLOW}Setting up remote...${NC}"
git remote remove origin 2>/dev/null
git remote add origin $REPO_URL

echo -e "${YELLOW}Pushing to GitHub...${NC}"
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}   ✓ Successfully pushed to GitHub!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo "Your repository:"
    echo "https://github.com/$username/ghost-systems-autonomous-store"
    echo ""
    echo "Next steps:"
    echo "1. Review the code on GitHub"
    echo "2. Set up deployment (see DEPLOYMENT_GUIDE.md)"
    echo "3. Start marketing campaigns"
    echo ""
else
    echo ""
    echo "Push failed. Common solutions:"
    echo "1. Check your GitHub credentials"
    echo "2. Ensure repository exists"
    echo "3. Try: git push -u origin main --force"
    echo ""
fi
