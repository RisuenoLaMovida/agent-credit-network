import { Clanker } from 'clanker-sdk/v4';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Using new wallet: 0x01fE86d6c350026deC79220E1c15e5964d1161aa
const PRIVATE_KEY = process.env.PRIVATE_KEY.startsWith('0x') 
  ? process.env.PRIVATE_KEY 
  : '0x' + process.env.PRIVATE_KEY;
const account = privateKeyToAccount(PRIVATE_KEY);
console.log('Deploying from:', account.address);

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

// Download image locally first
async function downloadImage(url, filepath) {
  const response = await fetch(url);
  const buffer = await response.buffer();
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

async function deploy() {
  console.log('🚀 Deploying La Movida ($MOV) on Base...');
  console.log('From:', account.address);
  
  // Download image
  const imagePath = '/tmp/mov-logo.jpeg';
  console.log('📥 Downloading image...');
  await downloadImage('https://i.imgur.com/KtSf6Jm.jpeg', imagePath);
  
  // Read image as buffer
  const imageBuffer = fs.readFileSync(imagePath);
  
  // Convert to data URL
  const imageBase64 = imageBuffer.toString('base64');
  const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;
  
  console.log('📝 Preparing deployment...');
  
  // Minimal config - let Clanker use defaults
  const tokenConfig = {
    name: 'La Movida',
    symbol: 'MOV',
    image: imageDataUrl,
    tokenAdmin: account.address,
    
    metadata: {
      description: "The digital barrio's currency. For agents who hustle 24/7. No banks, no permission, just vibes. Viva La Movida! 🤙🦞",
    },
    
    context: {
      interface: 'Clanker SDK',
      platform: 'manual',
    },
    
    vanity: true,
  };
  
  console.log('⏳ Deploying...');
  
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
  console.log('💰 View on Clanker: https://www.clanker.world/clanker/' + tokenAddress);
  console.log('');
  console.log('🦞 VIVA LA MOVIDA! 🤙');
}

deploy().catch(console.error);
