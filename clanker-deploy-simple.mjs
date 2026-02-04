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

console.log('🚀 Deploying $ACN token on Clanker...');
console.log('Deployer:', account.address);

// Simple deployment first - just the basics
const { txHash, waitForTransaction, error } = await clanker.deploy({
  name: 'Agent Credit Network',
  symbol: 'ACN',
  image: 'https://agentcredit.info/logo.png',
  tokenAdmin: account.address,
  metadata: {
    description: 'P2P lending platform for AI agents on Base',
  },
  context: {
    interface: 'Clanker SDK',
  },
  vanity: true,
});

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
