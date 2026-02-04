#!/bin/bash
#
# ACN FULL DEPLOYMENT SCRIPT
# Automates everything from test to mainnet
# 
# Usage: ./deploy-full.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=========================================="
echo "🚀 ACN FULL DEPLOYMENT SCRIPT"
echo "=========================================="
echo -e "${NC}"

# Configuration
FEE_RECIPIENT="0x038d27D6c37fd21bb384358aE22D23eb509f234f"
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACN_DIR="$(dirname "$DEPLOY_DIR")"
ENV_FILE="$DEPLOY_DIR/.env"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create $ENV_FILE with:"
    echo "DEPLOYER_PRIVATE_KEY=your_private_key_here"
    echo "BASESCAN_API_KEY=your_basescan_api_key"
    exit 1
fi

# Source .env
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Check if private key is set
if [ -z "$DEPLOYER_PRIVATE_KEY" ] || [ "$DEPLOYER_PRIVATE_KEY" = "your_private_key_here" ]; then
    echo -e "${RED}❌ DEPLOYER_PRIVATE_KEY not set in .env!${NC}"
    echo "Please add your private key to $ENV_FILE"
    echo ""
    echo "To get your private key from Cake Wallet:"
    echo "1. Open Cake Wallet"
    echo "2. Go to Settings → Show Private Keys"
    echo "3. Copy the private key (starts with 0x)"
    echo "4. Paste it in .env as: DEPLOYER_PRIVATE_KEY=0x..."
    exit 1
fi

# Check if Basescan API key is set
if [ -z "$BASESCAN_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  BASESCAN_API_KEY not set. Contract verification will be skipped.${NC}"
fi

echo -e "${GREEN}✅ Environment configured${NC}"
echo ""

# Function to check wallet balance
check_balance() {
    local network=$1
    echo -e "${BLUE}💰 Checking wallet balance on $network...${NC}"
    
    cd "$DEPLOY_DIR"
    
    # Create temporary script to check balance
    cat > check-balance.js << 'EOF'
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    const balance = await deployer.getBalance();
    console.log("Wallet:", deployer.address);
    console.log("Balance:", ethers.utils.formatEther(balance), "ETH");
    
    if (balance.lt(ethers.utils.parseEther("0.01"))) {
        console.log("WARNING: Low balance! Need at least 0.01 ETH");
        process.exit(1);
    }
}

main().catch(console.error);
EOF
    
    npx hardhat run check-balance.js --network $network 2>&1 || true
    rm -f check-balance.js
}

# Function to deploy contracts
deploy_contracts() {
    local network=$1
    echo -e "${BLUE}📄 Deploying contracts to $network...${NC}"
    
    cd "$DEPLOY_DIR"
    
    # Run deployment
    npx hardhat run deploy.js --network $network
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Deployment to $network successful!${NC}"
        return 0
    else
        echo -e "${RED}❌ Deployment to $network failed!${NC}"
        return 1
    fi
}

# Function to verify contracts
verify_contracts() {
    local network=$1
    
    if [ -z "$BASESCAN_API_KEY" ]; then
        echo -e "${YELLOW}⚠️  Skipping verification (no API key)${NC}"
        return
    fi
    
    echo -e "${BLUE}🔍 Verifying contracts on Basescan...${NC}"
    
    # Read deployment info
    local deployment_file="$DEPLOY_DIR/deployment-$network.json"
    
    if [ ! -f "$deployment_file" ]; then
        echo -e "${RED}❌ Deployment file not found: $deployment_file${NC}"
        return
    fi
    
    # Extract addresses (simple grep approach)
    local acn_address=$(grep -o '"AgentCreditNetworkV2": "[^"]*"' "$deployment_file" | cut -d'"' -f4)
    local oracle_address=$(grep -o '"CreditOracle": "[^"]*"' "$deployment_file" | cut -d'"' -f4)
    local autoRepay_address=$(grep -o '"ACNAutoRepay": "[^"]*"' "$deployment_file" | cut -d'"' -f4)
    local messaging_address=$(grep -o '"ACNMessaging": "[^"]*"' "$deployment_file" | cut -d'"' -f4)
    
    cd "$DEPLOY_DIR"
    
    # Verify each contract
    echo "Verifying AgentCreditNetworkV2..."
    npx hardhat verify --network $network "$acn_address" "$FEE_RECIPIENT" 2>&1 || echo "Verification failed or already verified"
    
    echo "Verifying CreditOracle..."
    npx hardhat verify --network $network "$oracle_address" 2>&1 || echo "Verification failed or already verified"
    
    echo "Verifying ACNAutoRepay..."
    npx hardhat verify --network $network "$autoRepay_address" "$acn_address" "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" 2>&1 || echo "Verification failed or already verified"
    
    echo "Verifying ACNMessaging..."
    npx hardhat verify --network $network "$messaging_address" "$acn_address" 2>&1 || echo "Verification failed or already verified"
    
    echo -e "${GREEN}✅ Verification complete${NC}"
}

# Function to update frontend
update_frontend() {
    local network=$1
    echo -e "${BLUE}📝 Updating frontend with contract addresses...${NC}"
    
    local deployment_file="$DEPLOY_DIR/deployment-$network.json"
    local web3_file="$ACN_DIR/docs/acn-web3.js"
    
    if [ ! -f "$deployment_file" ]; then
        echo -e "${RED}❌ Deployment file not found${NC}"
        return
    fi
    
    # Extract addresses
    local acn_address=$(grep -o '"AgentCreditNetworkV2": "[^"]*"' "$deployment_file" | cut -d'"' -f4)
    local oracle_address=$(grep -o '"CreditOracle": "[^"]*"' "$deployment_file" | cut -d'"' -f4)
    local autoRepay_address=$(grep -o '"ACNAutoRepay": "[^"]*"' "$deployment_file" | cut -d'"' -f4)
    local messaging_address=$(grep -o '"ACNMessaging": "[^"]*"' "$deployment_file" | cut -d'"' -f4)
    
    # Update acn-web3.js
    if [ -f "$web3_file" ]; then
        # Create backup
        cp "$web3_file" "$web3_file.backup"
        
        # Update addresses
        sed -i "s/ACN: null/ACN: '$acn_address'/" "$web3_file"
        sed -i "s/CreditOracle: null/CreditOracle: '$oracle_address'/" "$web3_file"
        sed -i "s/AutoRepay: null/AutoRepay: '$autoRepay_address'/" "$web3_file"
        sed -i "s/Messaging: null/Messaging: '$messaging_address'/" "$web3_file"
        
        echo -e "${GREEN}✅ Frontend updated${NC}"
        echo ""
        echo "Contract addresses added to acn-web3.js:"
        echo "  ACN: $acn_address"
        echo "  CreditOracle: $oracle_address"
        echo "  AutoRepay: $autoRepay_address"
        echo "  Messaging: $messaging_address"
    else
        echo -e "${YELLOW}⚠️  acn-web3.js not found${NC}"
    fi
}

# Function to create deployment summary
create_summary() {
    local network=$1
    local deployment_file="$DEPLOY_DIR/deployment-$network.json"
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "🎉 DEPLOYMENT SUMMARY - $network"
    echo "==========================================${NC}"
    echo ""
    
    if [ -f "$deployment_file" ]; then
        cat "$deployment_file"
    else
        echo "Deployment file not found"
    fi
    
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Test the deployment: Request a $1 loan"
    echo "2. Fund the loan from another wallet"
    echo "3. Repay the loan"
    echo "4. If all works, you're LIVE! 🚀"
    echo ""
    echo -e "${BLUE}Website: risuenolamovida.github.io/agent-credit-network/${NC}"
    echo -e "${BLUE}API: Will be available at your backend URL${NC}"
}

# ==========================================
# MAIN DEPLOYMENT FLOW
# ==========================================

echo -e "${YELLOW}Step 1: Testing on Base Sepolia (Testnet)${NC}"
echo "=========================================="
echo ""

# Check balance on testnet
check_balance baseSepolia

# Deploy to testnet
if deploy_contracts baseSepolia; then
    # Verify on testnet
    verify_contracts baseSepolia
    
    # Create summary
    create_summary baseSepolia
    
    echo ""
    echo -e "${YELLOW}=========================================="
    echo "🧪 TESTNET DEPLOYMENT COMPLETE"
    echo "==========================================${NC}"
    echo ""
    echo "Please test the deployment before proceeding to mainnet:"
    echo "1. Visit the website"
    echo "2. Connect wallet (Base Sepolia)"
    echo "3. Request a test loan"
    echo "4. Fund from another wallet"
    echo "5. Repay the loan"
    echo ""
    read -p "Did everything work correctly? (yes/no): " test_result
    
    if [ "$test_result" != "yes" ]; then
        echo -e "${RED}❌ Please fix issues before deploying to mainnet${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Testnet deployment failed. Fix issues before mainnet.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Deploying to Base Mainnet${NC}"
echo "=========================================="
echo ""

# Confirm mainnet deployment
read -p "⚠️  Are you sure you want to deploy to Base Mainnet? This costs real ETH! (deploy/cancel): " confirm

if [ "$confirm" != "deploy" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Check balance on mainnet
check_balance base

# Deploy to mainnet
if deploy_contracts base; then
    # Verify on mainnet
    verify_contracts base
    
    # Update frontend
    update_frontend base
    
    # Create summary
    create_summary base
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "🚀 MAINNET DEPLOYMENT COMPLETE!"
    echo "==========================================${NC}"
    echo ""
    echo -e "${GREEN}ACN IS NOW LIVE ON BASE MAINNET!${NC}"
    echo ""
    echo "📝 Deployment info saved to:"
    echo "   $DEPLOY_DIR/deployment-base.json"
    echo ""
    echo "🌐 Update your website with the new contract addresses!"
    echo ""
    echo -e "${BLUE}VIVA LA MOVIDA! 🦞🤙${NC}"
else
    echo -e "${RED}❌ Mainnet deployment failed${NC}"
    exit 1
fi
