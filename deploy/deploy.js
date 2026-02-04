const { ethers } = require("hardhat");

async function main() {
    const network = hre.network.name;
    console.log(`🚀 Deploying ACN Contracts to ${network}...`);
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Fee recipient address (Base wallet)
    const feeRecipient = "0x01fE86d6c350026deC79220E1c15e5964d1161aa";
    
    // USDC address based on network
    let usdcAddress;
    if (network === 'base') {
        usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base native USDC
    } else if (network === 'baseSepolia') {
        usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
    } else {
        usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // Polygon USDC
    }
    
    // Deploy AgentCreditNetworkV2 (Main Contract - includes all V1 + advanced features)
    console.log("\n📄 Deploying AgentCreditNetworkV2...");
    console.log("   Features: Lending, Flash Loans, Insurance, Referrals");
    const ACN = await ethers.getContractFactory("AgentCreditNetworkV2");
    const acn = await ACN.deploy(feeRecipient);
    await acn.deployed();
    console.log("✅ AgentCreditNetworkV2 deployed to:", acn.address);
    
    // Deploy CreditOracle
    console.log("\n📄 Deploying CreditOracle...");
    const CreditOracle = await ethers.getContractFactory("CreditOracle");
    const oracle = await CreditOracle.deploy();
    await oracle.deployed();
    console.log("✅ CreditOracle deployed to:", oracle.address);
    
    // Deploy ACNAutoRepay
    console.log("\n📄 Deploying ACNAutoRepay...");
    const AutoRepay = await ethers.getContractFactory("ACNAutoRepay");
    const autoRepay = await AutoRepay.deploy(acn.address, usdcAddress);
    await autoRepay.deployed();
    console.log("✅ ACNAutoRepay deployed to:", autoRepay.address);
    
    // Deploy ACNMessaging
    console.log("\n📄 Deploying ACNMessaging...");
    const Messaging = await ethers.getContractFactory("ACNMessaging");
    const messaging = await Messaging.deploy(acn.address);
    await messaging.deployed();
    console.log("✅ ACNMessaging deployed to:", messaging.address);
    
    // Save deployment info
    const deploymentInfo = {
        network: network,
        timestamp: new Date().toISOString(),
        contracts: {
            AgentCreditNetworkV2: acn.address,
            CreditOracle: oracle.address,
            ACNAutoRepay: autoRepay.address,
            ACNMessaging: messaging.address
        },
        config: {
            feeRecipient: feeRecipient,
            usdcAddress: usdcAddress,
            platformFee: "3%"
        },
        deployer: deployer.address
    };
    
    const filename = `deployment-${network}.json`;
    require('fs').writeFileSync(
        filename,
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log(`\n📁 Deployment info saved to ${filename}`);
    console.log(`\n🎉 ACN is LIVE on ${network}!`);
    
    // Verify commands
    console.log("\n🔍 To verify contracts:");
    console.log(`npx hardhat verify --network ${network} ${acn.address} ${feeRecipient}`);
    console.log(`npx hardhat verify --network ${network} ${oracle.address}`);
    console.log(`npx hardhat verify --network ${network} ${autoRepay.address} ${acn.address} ${usdcAddress}`);
    console.log(`npx hardhat verify --network ${network} ${messaging.address} ${acn.address}`);
    
    // Update frontend instructions
    console.log("\n📝 Update frontend contract addresses in docs/acn-web3.js:");
    console.log(`ACN_V2: "${acn.address}"`);
    console.log(`USDC: "${usdcAddress}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
