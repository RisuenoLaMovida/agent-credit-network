
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying ACN Contracts to Polygon...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Deploy AgentCreditNetwork
    console.log("\n📄 Deploying AgentCreditNetwork...");
    const ACN = await ethers.getContractFactory("AgentCreditNetwork");
    const acn = await ACN.deploy(
        "0xf7DBDA3AC7465cEE62DDFA1282873E7aD14E9E86"  // Fee recipient
    );
    await acn.deployed();
    console.log("✅ AgentCreditNetwork deployed to:", acn.address);
    
    // Deploy CreditOracle
    console.log("\n📄 Deploying CreditOracle...");
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
    
    console.log("\n📁 Deployment info saved to deployment-polygon.json");
    console.log("\n🎉 ACN is LIVE on Polygon!");
    
    // Verify contracts on Polygonscan (optional, requires API key)
    console.log("\n🔍 To verify on Polygonscan:");
    console.log(`npx hardhat verify --network polygon ${acn.address} 0xf7DBDA3AC7465cEE62DDFA1282873E7aD14E9E86`);
    console.log(`npx hardhat verify --network polygon ${oracle.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
