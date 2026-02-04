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
    console.log('🚀 Deploying ACN Contracts to Base Mainnet...');
    console.log('Deployer:', wallet.address);
    
    // Fee recipient
    const feeRecipient = '0x038d27D6c37fd21bb384358aE22D23eb509f234f';
    const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    
    // Check balance
    console.log('\n💰 Checking wallet balance...');
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance < ethers.parseEther('0.01')) {
        console.error('❌ Insufficient balance. Need at least 0.01 ETH');
        process.exit(1);
    }
    
    // Deploy AgentCreditNetwork
    console.log('\n📄 Deploying AgentCreditNetwork...');
    const acnContract = loadContract('AgentCreditNetwork');
    const acnFactory = new ethers.ContractFactory(acnContract.abi, acnContract.bytecode, wallet);
    const acn = await acnFactory.deploy(feeRecipient);
    await acn.waitForDeployment();
    console.log('✅ AgentCreditNetwork deployed to:', await acn.getAddress());
    
    // Deploy CreditOracle
    console.log('\n📄 Deploying CreditOracle...');
    const oracleContract = loadContract('CreditOracle');
    const oracleFactory = new ethers.ContractFactory(oracleContract.abi, oracleContract.bytecode, wallet);
    const oracle = await oracleFactory.deploy();
    await oracle.waitForDeployment();
    console.log('✅ CreditOracle deployed to:', await oracle.getAddress());
    
    // Deploy ACNAutoRepay
    console.log('\n📄 Deploying ACNAutoRepay...');
    const autoRepayContract = loadContract('ACNAutoRepay');
    const autoRepayFactory = new ethers.ContractFactory(autoRepayContract.abi, autoRepayContract.bytecode, wallet);
    const autoRepay = await autoRepayFactory.deploy(await acn.getAddress(), USDC);
    await autoRepay.waitForDeployment();
    console.log('✅ ACNAutoRepay deployed to:', await autoRepay.getAddress());
    
    // Deploy ACNMessaging
    console.log('\n📄 Deploying ACNMessaging...');
    const messagingContract = loadContract('ACNMessaging');
    const messagingFactory = new ethers.ContractFactory(messagingContract.abi, messagingContract.bytecode, wallet);
    const messaging = await messagingFactory.deploy(await acn.getAddress());
    await messaging.waitForDeployment();
    console.log('✅ ACNMessaging deployed to:', await messaging.getAddress());
    
    // Save deployment info
    const deploymentInfo = {
        network: 'base',
        timestamp: new Date().toISOString(),
        contracts: {
            AgentCreditNetwork: await acn.getAddress(),
            CreditOracle: await oracle.getAddress(),
            ACNAutoRepay: await autoRepay.getAddress(),
            ACNMessaging: await messaging.getAddress()
        },
        config: {
            feeRecipient: feeRecipient,
            usdcAddress: USDC,
            platformFee: "3%"
        },
        deployer: wallet.address
    };
    
    fs.writeFileSync('deployment-base.json', JSON.stringify(deploymentInfo, null, 2));
    console.log('\n📁 Deployment info saved to deployment-base.json');
    console.log('\n🎉 ACN is LIVE on Base Mainnet!');
}

deploy().catch(console.error);
