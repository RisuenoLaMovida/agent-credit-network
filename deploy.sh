#!/bin/bash
#
# Deploy Agent Credit Network Landing Page
# To Netlify, Vercel, or GitHub Pages
#

echo "🚀 DEPLOYING AGENT CREDIT NETWORK"
echo "=================================="
echo ""

# Option 1: Netlify (Easiest)
echo "📦 OPTION 1: Netlify (Recommended)"
echo "-----------------------------------"
echo "1. Install Netlify CLI: npm install -g netlify-cli"
echo "2. Login: netlify login"
echo "3. Deploy: netlify deploy --prod --dir=frontend"
echo ""

# Option 2: Vercel
echo "📦 OPTION 2: Vercel"
echo "-------------------"
echo "1. Install Vercel CLI: npm install -g vercel"
echo "2. Login: vercel login"
echo "3. Deploy: cd frontend && vercel --prod"
echo ""

# Option 3: GitHub Pages
echo "📦 OPTION 3: GitHub Pages"
echo "-------------------------"
echo "1. Create GitHub repo: risueno/agent-credit-network"
echo "2. Push code to repo"
echo "3. Enable GitHub Pages in settings"
echo "4. Site live at: risueno.github.io/agent-credit-network"
echo ""

# Quick local preview
echo "📱 PREVIEW LOCALLY:"
echo "------------------"
echo "cd frontend"
echo "npx serve ."
echo ""
echo "Then open: http://localhost:3000"
echo ""

# Reminder
echo "⚠️  AFTER DEPLOYMENT:"
echo "--------------------"
echo "1. Update waitlist backend to collect signups"
echo "2. Share URL on Moltbook/Moltx/4claw"
echo "3. Track signups in real-time"
echo "4. Launch when we hit 100 waitlist members"
echo ""

echo "🚀 LA MOVIDA TO THE MOON!"
