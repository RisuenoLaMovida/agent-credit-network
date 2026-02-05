import { ethers } from 'ethers';

const ACN_ADDRESS = '0x715E54369C832BaEc27AdF0c2FA58f25a8512B27';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const ACN_ABI = [
    "function requestLoan(uint256 _amount, uint256 _interestRate, uint256 _duration, string memory _purpose)",
    "function getLoan(uint256 _loanId) view returns (tuple(uint256 id, address borrower, uint256 amount, uint256 interestRate, uint256 duration, uint256 createdAt, uint256 fundedAt, uint256 repaidAt, address lender, uint8 status, string purpose))",
    "function loanCounter() view returns (uint256)",
    "function owner() view returns (address)",
    "function initializeCreditScore(address _agent, uint256 _baseScore)",
    "event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 interestRate)"
];

const USDC_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

async function testRealLoan() {
    console.log('🧪 REAL ON-CHAIN LOAN TEST\n');
    console.log('==========================\n');
    
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('Deployer:', wallet.address);
    
    // Check balances
    const ethBalance = await provider.getBalance(wallet.address);
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    
    console.log('ETH Balance:', ethers.formatEther(ethBalance), 'ETH');
    console.log('USDC Balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');
    console.log();
    
    if (usdcBalance < 2n * 1000000n) {
        console.error('❌ Need at least $2 USDC for test');
        process.exit(1);
    }
    
    const acn = new ethers.Contract(ACN_ADDRESS, ACN_ABI, wallet);
    
    // Step 1: Initialize credit score (deployer is owner)
    console.log('Step 1: Initializing credit score...');
    try {
        const owner = await acn.owner();
        console.log('Contract owner:', owner);
        console.log('Wallet is owner:', owner.toLowerCase() === wallet.address.toLowerCase());
        
        const tx1 = await acn.initializeCreditScore(wallet.address, 400);
        console.log('Tx:', tx1.hash);
        await tx1.wait();
        console.log('✅ Credit score initialized!\n');
    } catch (e) {
        if (e.message.includes('already initialized') || e.message.includes('verified')) {
            console.log('✅ Already initialized\n');
        } else {
            console.log('⚠️ Init error:', e.message.slice(0, 100), '\n');
        }
    }
    
    // Step 2: Request a $1 loan
    console.log('Step 2: Requesting \$1 loan...');
    const loanAmount = ethers.parseUnits('1', 6); // $1 USDC
    const interestRate = 1000; // 10% APR
    const duration = 7; // 7 days
    
    try {
        const tx2 = await acn.requestLoan(
            loanAmount,
            interestRate,
            duration,
            "Test loan - ACN launch"
        );
        console.log('Tx:', tx2.hash);
        console.log('View: https://basescan.org/tx/' + tx2.hash);
        
        const receipt = await tx2.wait();
        console.log('✅ Loan requested! Gas:', receipt.gasUsed.toString());
        
        // Get loan ID
        const loanId = await acn.loanCounter();
        console.log('Loan ID:', loanId.toString());
        
        // Get loan details
        const loan = await acn.getLoan(loanId);
        console.log('\nLoan Details:');
        console.log('  Borrower:', loan.borrower);
        console.log('  Amount:', ethers.formatUnits(loan.amount, 6), 'USDC');
        console.log('  Interest:', loan.interestRate / 100, '% APR');
        console.log('  Duration:', loan.duration.toString(), 'days');
        console.log('  Status:', loan.status.toString(), '(0=Requested)');
        
    } catch (e) {
        console.error('❌ Loan request failed:', e.message);
        console.log('\nError details:', e);
    }
    
    console.log('\n==========================');
    console.log('Test complete!');
    console.log('View contract: https://basescan.org/address/' + ACN_ADDRESS);
}

testRealLoan().catch(console.error);
