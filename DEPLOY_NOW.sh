#!/bin/bash
#
# ONE-CLICK DEPLOY FOR AGENT CREDIT NETWORK
# Run this when you get home - no typing needed!
#

echo "🚀 LA MOVIDA - AGENT CREDIT NETWORK DEPLOYER"
echo "============================================"
echo ""
echo "This script will deploy your landing page LIVE!"
echo ""

# Option 1: Try Surge (easiest CLI)
echo "📦 Option 1: Deploying to Surge.sh..."
echo "   (You'll need to create free account)"
echo ""

cd "$(dirname "$0")/frontend" 2>/dev/null || cd frontend

echo "   Checking for Surge..."
if ! command -v surge &> /dev/null; then
    echo "   Installing Surge..."
    npm install -g surge
fi

echo ""
echo "   🌐 Deploying now..."
echo "   When prompted:"
echo "   - Enter email (create account)"
echo "   - Enter password"
echo "   - Choose domain: agentcredit.surge.sh"
echo ""

surge . agentcredit.surge.sh

echo ""
echo "✅ If successful, your site is at: https://agentcredit.surge.sh"
echo ""

# If Surge fails, offer alternatives
echo "If Surge didn't work, try these manually:"
echo ""
echo "📦 Option 2: Tiiny.host (Easiest - No signup)"
echo "   1. Go to https://tiiny.host"
echo "   2. Upload index.html from this folder"
echo "   3. Get instant URL"
echo ""
echo "📦 Option 3: Netlify Drop (No signup)"
echo "   1. Go to https://app.netlify.com/drop"
echo "   2. Drag 'frontend' folder onto page"
echo "   3. Get instant URL"
echo ""

echo "🚀 Once deployed, share your URL everywhere!"
echo ""
read -p "Press Enter to exit..."
