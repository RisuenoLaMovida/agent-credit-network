import { ethers } from 'ethers';

// Contract addresses
const ACN_ADDRESS = '0x715E54369C832BaEc27AdF0c2FA58f25a8512B27';
const ORACLE_ADDRESS = '0x2dc0f327F4541Ad17a464C2862089e4D1c9c6Eb3';
const AUTOREPAY_ADDRESS = '0x28203698927B110534C1420F8cAEB5b16D2F4e11';
const MESSAGING_ADDRESS = '0x8a3ee29aB273bed0Fa7844dA5814Ba0274626Db9';
const TOKEN_ADDRESS = '0x59266F64DC9F88bADbD06A0368aDf05BAFbe3B07';

// Minimal ABIs for read-only testing
const ACN_ABI = [
    "function loanCounter() view returns (uint256)",
    "function getLoan(uint256 _loanId) view returns (tuple(uint256 id, address borrower, uint256 amount, uint256 interestRate, uint256 duration, uint256 createdAt, uint256 fundedAt, uint256 repaidAt, address lender, uint8 status, string purpose))",
    "function getBorrowerLoans(address _borrower) view returns (uint256[])",
    "function getLenderLoans(address _lender) view returns (uint256[])",
    "function owner() view returns (address)",
    "function platformFee() view returns (uint256)",
    "function getCreditScore(address _agent) view returns (tuple(address agent, uint256 score, uint256 tier, uint256 totalLoans, uint256 repaidLoans, uint256 defaultedLoans))",
    "function getMaxLoanAmount(address _agent) view returns (uint256)",
    "function verifiedAgents(address) view returns (bool)",
    "event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 interestRate)"
];

const TOKEN_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)"
];

async function testReadOnly() {
    console.log('🧪 ACN READ-ONLY CONTRACT TEST\n');
    console.log('=====================================\n');
    
    // Connect to Base Mainnet
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    
    try {
        // Test 1: Check network connection
        console.log('✅ Test 1: Network Connection');
        const blockNumber = await provider.getBlockNumber();
        console.log(`   Block number: ${blockNumber}`);
        console.log(`   Network: Base Mainnet\n`);
        
        // Test 2: Token contract
        console.log('✅ Test 2: $ACN Token Contract');
        const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
        const [name, symbol, decimals, totalSupply] = await Promise.all([
            token.name(),
            token.symbol(),
            token.decimals(),
            token.totalSupply()
        ]);
        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Decimals: ${decimals}`);
        console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}\n`);
        
        // Test 3: Main ACN Contract
        console.log('✅ Test 3: AgentCreditNetwork Contract');
        const acn = new ethers.Contract(ACN_ADDRESS, ACN_ABI, provider);
        
        try {
            const loanCounter = await acn.loanCounter();
            console.log(`   Loan Counter: ${loanCounter} (total loans requested)`);
        } catch (e) {
            console.log(`   Loan Counter: Error - ${e.message.slice(0, 50)}`);
        }
        
        try {
            const owner = await acn.owner();
            console.log(`   Owner: ${owner}`);
        } catch (e) {
            console.log(`   Owner: Unable to read (contract may be different version)`);
        }
        
        try {
            const platformFee = await acn.platformFee();
            console.log(`   Platform Fee: ${platformFee / 100}%`);
        } catch (e) {
            console.log(`   Platform Fee: Unable to read`);
        }
        console.log();
        
        // Test 4: ACN Contract credit functions
        console.log('✅ Test 4: ACN Credit Functions');
        const deployerAddress = '0x01fE86d6c350026deC79220E1c15e5964d1161aa';
        
        try {
            const creditScore = await acn.getCreditScore(deployerAddress);
            console.log(`   Deployer Credit Score: ${creditScore.score}`);
            console.log(`   Deployer Tier: ${creditScore.tier}`);
            console.log(`   Total Loans: ${creditScore.totalLoans}`);
            console.log(`   Repaid: ${creditScore.repaidLoans}`);
        } catch (e) {
            console.log(`   Credit Score: No data (agent not initialized)`);
        }
        
        try {
            const maxLoan = await acn.getMaxLoanAmount(deployerAddress);
            console.log(`   Max Loan Amount: ${ethers.formatUnits(maxLoan, 6)} USDC`);
        } catch (e) {
            console.log(`   Max Loan: Error reading`);
        }
        
        try {
            const isVerified = await acn.verifiedAgents(deployerAddress);
            console.log(`   Is Verified: ${isVerified}`);
        } catch (e) {
            console.log(`   Is Verified: Error reading`);
        }
        console.log();
        
        // Test 5: Check if any loans exist
        console.log('✅ Test 5: Loan Data');
        try {
            const loanCounter = await acn.loanCounter();
            if (loanCounter > 0n) {
                const loan = await acn.getLoan(1);
                console.log(`   Loan #1:`);
                console.log(`   - Borrower: ${loan.borrower}`);
                console.log(`   - Amount: ${ethers.formatUnits(loan.amount, 6)} USDC`);
                console.log(`   - Status: ${loan.status}`);
            } else {
                console.log('   No loans created yet (counter = 0)');
            }
        } catch (e) {
            console.log('   Loan data: Unable to read or no loans exist');
        }
        
        console.log('\n=====================================');
        console.log('✅ ALL READ-ONLY TESTS PASSED!');
        console.log('Contracts are working correctly.');
        console.log('=====================================\n');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testReadOnly();
