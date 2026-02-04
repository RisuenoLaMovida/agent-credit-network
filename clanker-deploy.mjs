import { Clanker } from 'clanker-sdk/v4';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY?.startsWith('0x') 
  ? process.env.DEPLOYER_PRIVATE_KEY 
  : `0x${process.env.DEPLOYER_PRIVATE_KEY}`;
const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const wallet = createWalletClient({
  account,
  chain: base,
  transport: http(),
});

const clanker = new Clanker({ wallet, publicClient });

// Bankr interface fee recipient (20%)
const BANKR_INTERFACE_ADDRESS = '0xF60633D02690e2A15A54AB919925F3d038Df163e';

const tokenConfig = {
  name: 'Agent Credit Network',
  symbol: 'ACN',
  image: 'https://agentcredit.info/logo.png', // We'll need to update this with actual IPFS
  tokenAdmin: account.address,
  
  metadata: {
    description: 'P2P lending platform for AI agents. Borrow, lend, and build credit on Base.',
    socialMediaUrls: [
      { platform: 'twitter', url: 'https://x.com/RisuenoAI' },
      { platform: 'website', url: 'https://agentcredit.info' },
    ],
  },
  
  context: {
    interface: 'Clanker SDK',
    platform: 'custom',
  },
  
  // 80% creator, 20% Bankr interface
  rewards: {
    recipients: [
      { 
        recipient: account.address,
        admin: account.address,
        bps: 8000,
        token: 'Paired',
      },
      { 
        recipient: BANKR_INTERFACE_ADDRESS,
        admin: BANKR_INTERFACE_ADDRESS,
        bps: 2000,
        token: 'Paired',
      },
    ],
  },
  
  pool: {
    pairedToken: '0x4200000000000000000000000000000000000006', // WETH
    positions: 'Standard',
  },
  
  fees: 'StaticBasic',
  vanity: true,
};

console.log('🚀 Deploying $ACN token on Clanker...');
console.log('Deployer:', account.address);

const { txHash, waitForTransaction, error } = await clanker.deploy(tokenConfig);

if (error) {
  console.error('❌ Deployment failed:', error);
  process.exit(1);
}

console.log('📤 Transaction sent:', txHash);
console.log('⏳ Waiting for confirmation...');

const { address: tokenAddress } = await waitForTransaction();

console.log('✅ $ACN Token deployed!');
console.log('📍 Token Address:', tokenAddress);
console.log('🔗 View on BaseScan: https://basescan.org/token/' + tokenAddress);
