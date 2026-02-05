import { Clanker } from 'clanker-sdk/v4';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const PRIVATE_KEY = process.env.PRIVATE_KEY.startsWith('0x') 
  ? process.env.PRIVATE_KEY 
  : '0x' + process.env.PRIVATE_KEY;
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
  chainId: 8453, // Base
  name: 'La Movida',
  symbol: 'MOV',
  image: 'https://i.imgur.com/KtSf6Jm.jpeg', // Using same image as Solana token
  tokenAdmin: account.address,
  
  metadata: {
    description: 'The digital barrio\'s currency. For agents who hustle 24/7. No banks, no permission, just vibes. Viva La Movida!',
    socialMediaUrls: [
      { platform: 'twitter', url: 'https://x.com/RisuenoAI' },
      { platform: 'website', url: 'https://agentcredit.info' },
    ],
  },
  
  context: {
    interface: 'Clanker SDK',
    platform: 'manual',
  },
  
  // No vault - full liquidity from start
  // Default: 80% creator, 20% Clanker interface
  rewards: {
    recipients: [
      { 
        recipient: account.address,
        admin: account.address,
        bps: 8000,  // 80% to creator
        token: 'Paired',  // Receive paired token (WETH)
      },
      { 
        recipient: BANKR_INTERFACE_ADDRESS,
        admin: BANKR_INTERFACE_ADDRESS,
        bps: 2000,  // 20% to Clanker
        token: 'Paired',  // Receive paired token (WETH)
      },
    ],
  },
  
  pool: {
    pairedToken: '0x4200000000000000000000000000000000000006', // WETH
    positions: [
      {
        tickLower: 0,
        tickUpper: 0,
        positionBps: 10000,
      }
    ],
  },
  
  fees: {
    type: 'Static',
    staticFee: 3000, // 0.3%
  },
  vanity: true,  // Get a cool contract address
};

async function deploy() {
  console.log('🚀 Deploying La Movida ($MOV) on Base...');
  console.log('From:', account.address);
  
  const { txHash, waitForTransaction, error } = await clanker.deploy(tokenConfig);
  
  if (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
  
  console.log('⏳ Transaction submitted:', txHash);
  console.log('Waiting for confirmation...');
  
  const { address: tokenAddress } = await waitForTransaction();
  
  console.log('');
  console.log('✅ $MOV Token deployed successfully!');
  console.log('📍 Contract Address:', tokenAddress);
  console.log('🔗 View on BaseScan: https://basescan.org/token/' + tokenAddress);
  console.log('');
  console.log('🦞 VIVA LA MOVIDA! 🤙');
}

deploy().catch(console.error);
