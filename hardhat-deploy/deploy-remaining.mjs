import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Base Mainnet
const RPC_URL = 'https://mainnet.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Private key
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY?.startsWith('0x') 
  ? process.env.DEPLOYER_PRIVATE_KEY 
  : `0x${process.env.DEPLOYER_PRIVATE_KEY}`;

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Load contract bytecode and ABI
function loadContract(name) {
    const artifactPath = join(__dirname, 'artifacts', 'contracts', `${name}.sol`, `${name}.json`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return {
        abi: artifact.abi,
        bytecode: artifact.bytecode
    };
}

async function deploy() {
    console.log('🚀 Deploying remaining ACN Contracts...');
    console.log('Deployer:', wallet.address);
    
    // Already deployed
    const ACN_ADDRESS = '0x715E54369C832BaEc27AdF0c2FA58f25a8512B27';
    const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    
    // Check balance
    console.log('\n💰 Checking wallet balance...');
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance:', ethers.formatEther(balance), 'ETH');
    
    const deployed = {
        AgentCreditNetwork: ACN_ADDRESS
    };
    
    try {
        // Deploy CreditOracle
        console.log('\n📄 Deploying CreditOracle...');
        const oracleContract = loadContract('CreditOracle');
        const oracleFactory = new ethers.ContractFactory(oracleContract.abi, oracleContract.bytecode, wallet);
        const oracle = await oracleFactory.deploy();
        await oracle.waitForDeployment();
        deployed.CreditOracle = await oracle.getAddress();
        console.log('✅ CreditOracle deployed to:', deployed.CreditOracle);
        
        // Deploy ACNAutoRepay
        console.log('\n📄 Deploying ACNAutoRepay...');
        const autoRepayContract = loadContract('ACNAutoRepay');
        const autoRepayFactory = new ethers.ContractFactory(autoRepayContract.abi, autoRepayContract.bytecode, wallet);
        const autoRepay = await autoRepayFactory.deploy(ACN_ADDRESS, USDC);
        await autoRepay.waitForDeployment();
        deployed.ACNAutoRepay = await autoRepay.getAddress();
        console.log('✅ ACNAutoRepay deployed to:', deployed.ACNAutoRepay);
        
        // Deploy ACNMessaging
        console.log('\n📄 Deploying ACNMessaging...');
        const messagingContract = loadContract('ACNMessaging');
        const messagingFactory = new ethers.ContractFactory(messagingContract.abi, messagingContract.bytecode, wallet);
        const messaging = await messagingFactory.deploy(ACN_ADDRESS);
        await messaging.waitForDeployment();
        deployed.ACNMessaging = await messaging.getAddress();
        console.log('✅ ACNMessaging deployed to:', deployed.ACNMessaging);
        
        // Save deployment info
        const deploymentInfo = {
            network: 'base',
            timestamp: new Date().toISOString(),
            contracts: deployed,
            config: {
                feeRecipient: '0x038d27D6c37fd21bb384358aE22D23eb509f234f',
                usdcAddress: USDC,
                platformFee: "3%"
            },
            deployer: wallet.address
        };
        
        fs.writeFileSync('deployment-base-full.json', JSON.stringify(deploymentInfo, null, 2));
        console.log('\n📁 Deployment info saved to deployment-base-full.json');
        console.log('\n🎉 ALL ACN CONTRACTS DEPLOYED!');
        console.log('\n🏆 ACN PLATFORM IS FULLY LIVE ON BASE MAINNET!');
        
    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        if (deployed.CreditOracle) {
            console.log('\n⚠️  Partial deployment saved:');
            console.log('CreditOracle:', deployed.CreditOracle);
        }
        process.exit(1);
    }
}

deploy().catch(console.error);
