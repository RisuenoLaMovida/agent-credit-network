import { ethers } from 'ethers';

// Uniswap V2 Router on Base
const UNISWAP_ROUTER = '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24';
const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const ROUTER_ABI = [
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)",
    "function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)"
];

async function swapETHForUSDC() {
    console.log('🔄 Swapping ETH for USDC on Base\n');
    
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
        console.error('❌ DEPLOYER_PRIVATE_KEY not set');
        process.exit(1);
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('Wallet:', wallet.address);
    
    const ethBalance = await provider.getBalance(wallet.address);
    console.log('ETH Balance:', ethers.formatEther(ethBalance), 'ETH');
    
    // Keep 0.005 ETH for gas, swap the rest
    const swapAmount = ethBalance - ethers.parseEther('0.005');
    if (swapAmount <= 0) {
        console.error('❌ Not enough ETH to swap (need to keep some for gas)');
        process.exit(1);
    }
    
    console.log('Swapping:', ethers.formatEther(swapAmount), 'ETH');
    
    const router = new ethers.Contract(UNISWAP_ROUTER, ROUTER_ABI, wallet);
    
    // Check expected output
    const path = [WETH, USDC];
    try {
        const amounts = await router.getAmountsOut(swapAmount, path);
        console.log('Expected USDC:', ethers.formatUnits(amounts[1], 6), 'USDC');
        
        // Set minimum output (1% slippage)
        const minOutput = amounts[1] * 99n / 100n;
        
        console.log('Minimum output:', ethers.formatUnits(minOutput, 6), 'USDC');
        console.log('Submitting swap...');
        
        const tx = await router.swapExactETHForTokens(
            minOutput,
            path,
            wallet.address,
            Math.floor(Date.now() / 1000) + 300, // 5 min deadline
            { value: swapAmount }
        );
        
        console.log('Transaction:', tx.hash);
        console.log('View: https://basescan.org/tx/' + tx.hash);
        
        const receipt = await tx.wait();
        console.log('✅ Swap complete! Gas used:', receipt.gasUsed.toString());
        
        // Check USDC balance
        const usdc = new ethers.Contract(USDC, ['function balanceOf(address) view returns (uint256)'], provider);
        const usdcBalance = await usdc.balanceOf(wallet.address);
        console.log('New USDC Balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');
        
    } catch (e) {
        console.error('❌ Swap failed:', e.message);
        console.log('\nAlternative: Bridge USDC from Ethereum');
        console.log('Use: https://across.to');
    }
}

swapETHForUSDC().catch(console.error);
