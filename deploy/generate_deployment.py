#!/usr/bin/env python3
"""
ACN Smart Contract Deployment Script
Deploys AgentCreditNetwork and CreditOracle to Polygon
"""

import json
import os
from pathlib import Path

# Deployment configuration
DEPLOYMENT_CONFIG = {
    "network": "polygon",
    "chain_id": 137,
    "rpc_url": "https://polygon.llamarpc.com",
    "fee_recipient": "0x038d27D6c37fd21bb384358aE22D23eb509f234f",  # Fee recipient (separate from deployer)
    "contracts": {
        "AgentCreditNetwork": {
            "file": "AgentCreditNetwork.sol",
            "args": ["0x038d27D6c37fd21bb384358aE22D23eb509f234f"]  # Fee recipient
        },
        "CreditOracle": {
            "file": "CreditOracle.sol",
            "args": []
        }
    }
}

def load_contract_bytecode(contract_name):
    """Load compiled contract bytecode"""
    # This would come from Hardhat/Foundry compilation
    # For now, returning placeholder
    return {
        "abi": [],  # Would load from compiled JSON
        "bytecode": "0x..."  # Would load from compiled JSON
    }

def generate_deployment_script():
    """Generate Hardhat deployment script"""
    
    script = '''
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying ACN Contracts to Polygon...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Deploy AgentCreditNetwork
    console.log("\\n📄 Deploying AgentCreditNetwork...");
    const ACN = await ethers.getContractFactory("AgentCreditNetwork");
    const acn = await ACN.deploy(
        "0x038d27D6c37fd21bb384358aE22D23eb509f234f"  // Fee recipient
    );
    await acn.deployed();
    console.log("✅ AgentCreditNetwork deployed to:", acn.address);
    
    // Deploy CreditOracle
    console.log("\\n📄 Deploying CreditOracle...");
    const CreditOracle = await ethers.getContractFactory("CreditOracle");
    const oracle = await CreditOracle.deploy();
    await oracle.deployed();
    console.log("✅ CreditOracle deployed to:", oracle.address);
    
    // Save deployment info
    const deploymentInfo = {
        network: "polygon",
        timestamp: new Date().toISOString(),
        contracts: {
            AgentCreditNetwork: acn.address,
            CreditOracle: oracle.address
        },
        deployer: deployer.address
    };
    
    require('fs').writeFileSync(
        'deployment-polygon.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\\n📁 Deployment info saved to deployment-polygon.json");
    console.log("\\n🎉 ACN is LIVE on Polygon!");
    
    // Verify contracts on Polygonscan (optional, requires API key)
    console.log("\\n🔍 To verify on Polygonscan:");
    console.log(`npx hardhat verify --network base ${acn.address} 0x038d27D6c37fd21bb384358aE22D23eb509f234f`);
    console.log(`npx hardhat verify --network polygon ${oracle.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
'''
    
    return script

def generate_hardhat_config():
    """Generate Hardhat configuration"""
    
    config = '''
require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-verify');
require('dotenv').config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '';
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || '';

module.exports = {
    solidity: {
        version: "0.8.19",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        polygon: {
            url: "https://polygon.llamarpc.com",
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 137
        },
        polygonMumbai: {
            url: "https://rpc-mumbai.maticvigil.com",
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 80001
        }
    },
    etherscan: {
        apiKey: {
            polygon: POLYGONSCAN_API_KEY,
            polygonMumbai: POLYGONSCAN_API_KEY
        }
    },
    gasReporter: {
        enabled: true,
        currency: 'USD',
        coinmarketcap: process.env.COINMARKETCAP_API_KEY
    }
};
'''
    
    return config

def generate_env_template():
    """Generate .env template for deployment"""
    
    env_template = '''# ACN Deployment Configuration
# NEVER COMMIT THIS FILE WITH REAL VALUES

# Deployer wallet private key (must have POL for gas)
DEPLOYER_PRIVATE_KEY=your_private_key_here

# Polygonscan API key (for contract verification)
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# CoinMarketCap API key (for gas reporting)
COINMARKETCAP_API_KEY=your_cmc_api_key
'''
    
    return env_template

def print_deployment_checklist():
    """Print deployment checklist"""
    
    print("="*60)
    print("🚀 ACN SMART CONTRACT DEPLOYMENT CHECKLIST")
    print("="*60)
    print()
    print("PRE-DEPLOYMENT:")
    print("- [ ] Install Hardhat: npm install --save-dev hardhat")
    print("- [ ] Install dependencies: npm install @nomicfoundation/hardhat-toolbox")
    print("- [ ] Copy contracts to contracts/ folder")
    print("- [ ] Create .env file with DEPLOYER_PRIVATE_KEY")
    print("- [ ] Fund deployer wallet with ~$50 POL on Polygon")
    print()
    print("DEPLOYMENT:")
    print("- [ ] Compile contracts: npx hardhat compile")
    print("- [ ] Run tests: npx hardhat test")
    print("- [ ] Deploy to testnet: npx hardhat run deploy.js --network polygonMumbai")
    print("- [ ] Test on testnet")
    print("- [ ] Deploy to mainnet: npx hardhat run deploy.js --network polygon")
    print("- [ ] Verify contracts on Polygonscan")
    print()
    print("POST-DEPLOYMENT:")
    print("- [ ] Update frontend with contract addresses")
    print("- [ ] Update skill with contract addresses")
    print("- [ ] Test $1 loan end-to-end")
    print("- [ ] Announce launch")
    print()
    print("="*60)
    print(f"Fee Recipient: {DEPLOYMENT_CONFIG['fee_recipient']}")
    print("="*60)

if __name__ == "__main__":
    # Create deployment directory
    deploy_dir = Path("deploy")
    deploy_dir.mkdir(exist_ok=True)
    
    # Generate files
    with open(deploy_dir / "deploy.js", "w") as f:
        f.write(generate_deployment_script())
    
    with open(deploy_dir / "hardhat.config.js", "w") as f:
        f.write(generate_hardhat_config())
    
    with open(deploy_dir / ".env.example", "w") as f:
        f.write(generate_env_template())
    
    # Generate package.json
    package_json = '''{
  "name": "acn-contracts",
  "version": "1.0.0",
  "description": "Agent Credit Network Smart Contracts",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy:testnet": "hardhat run deploy.js --network polygonMumbai",
    "deploy:mainnet": "hardhat run deploy.js --network polygon",
    "verify": "hardhat verify"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^4.0.0",
    "@nomicfoundation/hardhat-verify": "^2.0.0",
    "dotenv": "^16.3.1",
    "hardhat": "^2.19.0"
  }
}'''
    
    with open(deploy_dir / "package.json", "w") as f:
        f.write(package_json)
    
    print("✅ Deployment files generated in deploy/ directory")
    print()
    print_deployment_checklist()
