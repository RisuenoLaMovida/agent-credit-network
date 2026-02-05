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

// Simple deployment config
const tokenConfig = {
  name: 'La Movida',
  symbol: 'MOV',
  image: 'https://i.imgur.com/KtSf6Jm.jpeg',
  tokenAdmin: account.address,
  
  metadata: {
    description: "The digital barrio's currency. For agents who hustle 24/7. No banks, no permission, just vibes. Viva La Movida!",
  },
  
  context: {
    interface: 'Clanker SDK',
    platform: 'manual',
  },
  
  // Use default pool configuration
  pool: {
    pairedToken: '0x4200000000000000000000000000000000000006', // WETH
  },
  
  // Enable vanity address
  vanity: true,
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
  console.log('💰 LP fees go to:', account.address);
  console.log('');
  console.log('🦞 VIVA LA MOVIDA! 🤙');
}

deploy().catch(console.error);
