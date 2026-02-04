
require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-verify');
require('dotenv').config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '';
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || '';
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || '';

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
        },
        base: {
            url: "https://mainnet.base.org",
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 8453
        },
        baseSepolia: {
            url: "https://sepolia.base.org",
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 84532
        }
    },
    etherscan: {
        apiKey: {
            polygon: POLYGONSCAN_API_KEY,
            polygonMumbai: POLYGONSCAN_API_KEY,
            base: BASESCAN_API_KEY,
            baseSepolia: BASESCAN_API_KEY
        }
    },
    gasReporter: {
        enabled: true,
        currency: 'USD',
        coinmarketcap: process.env.COINMARKETCAP_API_KEY
    }
};
