import '@nomicfoundation/hardhat-toolbox';
import dotenv from 'dotenv';

dotenv.config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '';
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || '';

export default {
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
            base: BASESCAN_API_KEY,
            baseSepolia: BASESCAN_API_KEY
        },
        customChains: [
            {
                network: "base",
                chainId: 8453,
                urls: {
                    apiURL: "https://api.basescan.org/api",
                    browserURL: "https://basescan.org"
                }
            },
            {
                network: "baseSepolia",
                chainId: 84532,
                urls: {
                    apiURL: "https://api-sepolia.basescan.org/api",
                    browserURL: "https://sepolia.basescan.org"
                }
            }
        ]
    }
};
