import { ethers } from 'ethers';

// Contract addresses
const ACN_ADDRESS = '0x715E54369C832BaEc27AdF0c2FA58f25a8512B27';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Minimal ABI for testing
const ACN_ABI = [
    "function loanCounter() view returns (uint256)",
    "function getLoan(uint256 _loanId) view returns (tuple(uint256 id, address borrower, uint256 amount, uint256 interestRate, uint256 duration, uint256 createdAt, uint256 fundedAt, uint256 repaidAt, address lender, uint8 status, string purpose))",
    "function owner() view returns (address)",
    "function platformFee() view returns (uint256)",
    "function verifiedAgents(address) view returns (bool)",
    "function initializeCreditScore(address _agent, uint256 _baseScore)",
    "event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 interestRate)"
];

const USDC_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

async function testLoanFlow() {
    console.log('🧪 ON-CHAIN LOAN TEST\n');
    console.log('========================\n');
    
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    
    // Load deployer wallet from environment
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
        console.error('❌ DEPLOYER_PRIVATE_KEY not set');
        process.exit(1);
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('✅ Loaded wallet:', wallet.address);
    
    // Check ETH balance
    const ethBalance = await provider.getBalance(wallet.address);
    console.log('ETH Balance:', ethers.formatEther(ethBalance), 'ETH');
    
    if (ethBalance < ethers.parseEther('0.001')) {
        console.error('❌ Insufficient ETH for gas');
        process.exit(1);
    }
    
    // Initialize contracts
    const acn = new ethers.Contract(ACN_ADDRESS, ACN_ABI, wallet);
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
    
    console.log('\n--- STEP 1: Initialize Credit Score ---');
    
    // Check if already verified
    const isVerified = await acn.verifiedAgents(wallet.address);
    if (isVerified) {
        console.log('✅ Agent already verified');
    } else {
        console.log('Initializing credit score...');
        try {
            const tx = await acn.initializeCreditScore(wallet.address, 400);
            console.log('Transaction sent:', tx.hash);
            await tx.wait();
            console.log('✅ Credit score initialized!');
        } catch (e) {
            console.log('⚠️ Could not initialize:', e.message.slice(0, 100));
        }
    }
    
    console.log('\n--- STEP 2: Check USDC Balance ---');
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log('USDC Balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');
    
    if (usdcBalance < 10n * 1000000n) {
        console.log('❌ Insufficient USDC for loan testing');
        console.log('Need at least 10 USDC to test');
        console.log('\nTo get USDC on Base:');
        console.log('1. Bridge from Ethereum: https://across.to');
        console.log('2. Buy on Coinbase and withdraw to Base');
        console.log('3. Use a DEX on Base: https://app.uniswap.org (switch to Base network)');
        process.exit(1);
    }
    
    console.log('\n--- STEP 3: Request a Loan ---');
    
    const loanAmount = ethers.parseUnits('5', 6); // $5 USDC
    const interestRate = 1000; // 10% APR
    const duration = 7; // 7 days
    
    console.log('Requesting loan:');
    console.log('  Amount: $5 USDC');
    console.log('  Interest: 10% APR');
    console.log('  Duration: 7 days');
    
    try {
        const tx = await acn.requestLoan(
            loanAmount,
            interestRate,
            duration,
            "Test loan from ACN deployment"
        );
        console.log('Transaction sent:', tx.hash);
        console.log('View on BaseScan: https://basescan.org/tx/' + tx.hash);
        
        const receipt = await tx.wait();
        console.log('✅ Loan requested! Gas used:', receipt.gasUsed.toString());
        
        // Get loan ID from event
        const loanId = await acn.loanCounter();
        console.log('Loan ID:', loanId.toString());
        
        // Get loan details
        const loan = await acn.getLoan(loanId);
        console.log('\nLoan Details:');
        console.log('  Borrower:', loan.borrower);
        console.log('  Amount:', ethers.formatUnits(loan.amount, 6), 'USDC');
        console.log('  Status:', loan.status);
        
    } catch (e) {
        console.error('❌ Loan request failed:', e.message);
    }
    
    console.log('\n========================');
    console.log('Test complete!');
}

testLoanFlow().catch(console.error);
