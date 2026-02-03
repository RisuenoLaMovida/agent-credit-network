// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AgentCreditNetwork.sol";

/**
 * @title AgentCreditNetworkV2
 * @notice Enhanced ACN with all the fire features
 * - Auto-repayment with triggers
 * - Flash loans for arbitrage
 * - Loan bundling/crowdfunding
 * - Insurance pool
 * - Referral program
 * - AI risk assessment integration
 */

contract AgentCreditNetworkV2 is AgentCreditNetwork {
    
    // ============ NEW STRUCTS ============
    
    struct AutoRepayConfig {
        bool enabled;
        uint256 threshold;      // Balance threshold to trigger repayment
        uint256 minBalance;     // Keep at least this much after repayment
        uint256 loanId;
    }
    
    struct FlashLoan {
        uint256 amount;
        uint256 fee;           // 0.09% fee (9 basis points)
        address borrower;
        uint256 timestamp;
        bool repaid;
    }
    
    struct BundledLoan {
        uint256[] loanIds;           // Individual loan IDs bundled together
        mapping(address => uint256) lenderShares;  // How much each lender contributed
        uint256 totalFunded;
        uint256 targetAmount;
        uint256 deadline;
        bool active;
    }
    
    struct InsurancePolicy {
        uint256 loanId;
        address lender;
        uint256 coverageAmount;   // How much is insured
        uint256 premium;          // Amount paid for insurance
        bool claimed;
    }
    
    struct Referral {
        address referrer;
        uint256 totalReferred;    // Total loans referred
        uint256 totalEarned;      // Total referral fees earned
        mapping(uint256 => bool) claimedLoans;  // Track which loans paid out
    }
    
    struct RiskProfile {
        uint256 riskScore;        // 0-10000 (AI-calculated)
        uint256 volatilityIndex;  // Historical volatility
        uint256 reputationScore;  // Social/activity score
        uint256 lastUpdated;
    }
    
    // ============ STATE VARIABLES ============
    
    // Auto-repayment
    mapping(address => AutoRepayConfig[]) public autoRepayConfigs;
    mapping(address => bool) public autoRepayEnabled;
    
    // Flash loans
    mapping(bytes32 => FlashLoan) public flashLoans;
    uint256 public constant FLASH_LOAN_FEE = 9;  // 0.09% = 9 basis points
    bytes32[] public activeFlashLoans;
    
    // Loan bundling
    mapping(uint256 => BundledLoan) public bundledLoans;
    uint256 public bundleCounter;
    
    // Insurance pool
    mapping(uint256 => InsurancePolicy) public insurancePolicies;
    uint256 public insurancePoolBalance;
    uint256 public constant INSURANCE_FEE = 50;  // 0.5% = 50 basis points
    
    // Referral program
    mapping(address => Referral) public referrals;
    uint256 public constant REFERRAL_FEE = 10;   // 0.1% = 10 basis points
    mapping(address => address) public referredBy;
    
    // Risk assessment
    mapping(address => RiskProfile) public riskProfiles;
    address public riskOracle;
    
    // Events
    event AutoRepayConfigured(address indexed agent, uint256 loanId, uint256 threshold);
    event AutoRepayExecuted(address indexed agent, uint256 loanId, uint256 amount);
    event FlashLoanRequested(bytes32 indexed loanId, address borrower, uint256 amount);
    event FlashLoanRepaid(bytes32 indexed loanId, uint256 fee);
    event LoanBundled(uint256 indexed bundleId, uint256[] loanIds, uint256 targetAmount);
    event InsurancePurchased(uint256 indexed loanId, address lender, uint256 coverage);
    event InsuranceClaimed(uint256 indexed loanId, address lender, uint256 payout);
    event ReferralReward(address indexed referrer, uint256 loanId, uint256 reward);
    event RiskScoreUpdated(address indexed agent, uint256 riskScore);
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _feeRecipient) AgentCreditNetwork(_feeRecipient) {
        riskOracle = _feeRecipient;  // Owner is default risk oracle
    }
    
    // ============ AUTO-REPAYMENT FEATURE ============
    
    /**
     * @notice Configure auto-repayment for a loan
     * @param _loanId Loan to auto-repay
     * @param _threshold Trigger repayment when balance exceeds this
     * @param _minBalance Keep at least this much after repayment
     */
    function configureAutoRepay(
        uint256 _loanId,
        uint256 _threshold,
        uint256 _minBalance
    ) external {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Not borrower");
        require(loan.status == LoanStatus.Funded, "Not active loan");
        
        autoRepayConfigs[msg.sender].push(AutoRepayConfig({
            enabled: true,
            threshold: _threshold,
            minBalance: _minBalance,
            loanId: _loanId
        }));
        
        autoRepayEnabled[msg.sender] = true;
        
        emit AutoRepayConfigured(msg.sender, _loanId, _threshold);
    }
    
    /**
     * @notice Check and execute auto-repayment if conditions met
     * @param _agent Agent address to check
     * @return executed Whether repayment was executed
     */
    function checkAndExecuteAutoRepay(address _agent) external returns (bool executed) {
        if (!autoRepayEnabled[_agent]) return false;
        
        AutoRepayConfig[] storage configs = autoRepayConfigs[_agent];
        uint256 balance = getAgentBalance(_agent);
        
        for (uint256 i = 0; i < configs.length; i++) {
            if (!configs[i].enabled) continue;
            
            if (balance >= configs[i].threshold) {
                Loan storage loan = loans[configs[i].loanId];
                
                // Calculate repayment amount
                uint256 interest = calculateInterest(configs[i].loanId);
                uint256 totalRepayment = loan.amount + interest;
                
                // Check if we can repay while keeping min balance
                if (balance - totalRepayment >= configs[i].minBalance) {
                    // Execute repayment
                    _executeRepayment(configs[i].loanId);
                    configs[i].enabled = false;  // Disable after execution
                    
                    emit AutoRepayExecuted(_agent, configs[i].loanId, totalRepayment);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * @notice Get agent's USDC balance
     */
    function getAgentBalance(address _agent) public view returns (uint256) {
        // In production, this would check actual USDC balance
        // For now, placeholder - integrate with USDC contract
        return 0;
    }
    
    // ============ FLASH LOANS ============
    
    /**
     * @notice Request a flash loan (must repay in same transaction)
     * @param _amount Amount to borrow
     * @param _targetContract Contract to call with the funds
     * @param _data Calldata for the target contract
     */
    function flashLoan(
        uint256 _amount,
        address _targetContract,
        bytes calldata _data
    ) external {
        require(_amount <= address(this).balance * 3 / 4, "Amount too high");
        
        uint256 fee = (_amount * FLASH_LOAN_FEE) / 10000;
        bytes32 loanId = keccak256(abi.encodePacked(msg.sender, _amount, block.timestamp));
        
        flashLoans[loanId] = FlashLoan({
            amount: _amount,
            fee: fee,
            borrower: msg.sender,
            timestamp: block.timestamp,
            repaid: false
        });
        
        activeFlashLoans.push(loanId);
        
        emit FlashLoanRequested(loanId, msg.sender, _amount);
        
        // Send funds to borrower
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        // Execute borrower's logic
        (bool executeSuccess, ) = _targetContract.call(_data);
        require(executeSuccess, "Execution failed");
        
        // Verify repayment
        require(
            address(this).balance >= _amount + fee,
            "Flash loan not repaid"
        );
        
        flashLoans[loanId].repaid = true;
        
        // Remove from active loans
        _removeFlashLoan(loanId);
        
        emit FlashLoanRepaid(loanId, fee);
    }
    
    function _removeFlashLoan(bytes32 _loanId) internal {
        for (uint256 i = 0; i < activeFlashLoans.length; i++) {
            if (activeFlashLoans[i] == _loanId) {
                activeFlashLoans[i] = activeFlashLoans[activeFlashLoans.length - 1];
                activeFlashLoans.pop();
                break;
            }
        }
    }
    
    // ============ LOAN BUNDLING/CROWDFUNDING ============
    
    /**
     * @notice Create a bundled loan (multiple lenders fund one big loan)
     * @param _amount Total amount needed
     * @param _interestRate Interest rate
     * @param _duration Duration in days
     * @param _purpose Loan purpose
     * @param _deadline Funding deadline
     */
    function createBundledLoan(
        uint256 _amount,
        uint256 _interestRate,
        uint256 _duration,
        string memory _purpose,
        uint256 _deadline
    ) external onlyVerified returns (uint256 bundleId) {
        require(_amount >= 1000 * 10**6, "Min $1000 for bundled loans");
        require(_deadline > block.timestamp, "Deadline must be future");
        
        bundleCounter++;
        bundleId = bundleCounter;
        
        // Create the main loan
        uint256 loanId = requestLoan(_amount, _interestRate, _duration, _purpose);
        
        BundledLoan storage bundle = bundledLoans[bundleId];
        bundle.loanIds.push(loanId);
        bundle.targetAmount = _amount;
        bundle.deadline = _deadline;
        bundle.active = true;
        
        emit LoanBundled(bundleId, bundle.loanIds, _amount);
        
        return bundleId;
    }
    
    /**
     * @notice Fund a portion of a bundled loan
     * @param _bundleId Bundle ID
     * @param _amount Amount to contribute
     */
    function fundBundledLoan(uint256 _bundleId, uint256 _amount) external onlyVerified {
        BundledLoan storage bundle = bundledLoans[_bundleId];
        require(bundle.active, "Bundle not active");
        require(block.timestamp < bundle.deadline, "Deadline passed");
        require(_amount >= 100 * 10**6, "Min $100 per contribution");
        
        uint256 remaining = bundle.targetAmount - bundle.totalFunded;
        require(_amount <= remaining, "Amount exceeds remaining");
        
        bundle.lenderShares[msg.sender] += _amount;
        bundle.totalFunded += _amount;
        
        // If fully funded, activate the loan
        if (bundle.totalFunded >= bundle.targetAmount) {
            bundle.active = false;
            // Loan becomes active for borrower
        }
    }
    
    /**
     * @notice Get lender's share of a bundled loan repayment
     * @param _bundleId Bundle ID
     * @param _lender Lender address
     */
    function getLenderShare(uint256 _bundleId, address _lender) external view returns (uint256) {
        BundledLoan storage bundle = bundledLoans[_bundleId];
        return bundle.lenderShares[_lender];
    }
    
    // ============ INSURANCE POOL ============
    
    /**
     * @notice Purchase insurance for a loan
     * @param _loanId Loan to insure
     * @param _coverageAmount Amount to cover
     */
    function purchaseInsurance(uint256 _loanId, uint256 _coverageAmount) external payable {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.Funded, "Not active loan");
        require(loan.lender == msg.sender, "Not lender");
        require(_coverageAmount <= loan.amount, "Coverage exceeds loan");
        
        uint256 premium = (_coverageAmount * INSURANCE_FEE) / 10000;
        require(msg.value >= premium, "Insufficient premium");
        
        insurancePoolBalance += premium;
        
        uint256 policyId = uint256(keccak256(abi.encodePacked(_loanId, msg.sender)));
        insurancePolicies[policyId] = InsurancePolicy({
            loanId: _loanId,
            lender: msg.sender,
            coverageAmount: _coverageAmount,
            premium: premium,
            claimed: false
        });
        
        emit InsurancePurchased(_loanId, msg.sender, _coverageAmount);
    }
    
    /**
     * @notice Claim insurance on defaulted loan
     * @param _policyId Insurance policy ID
     */
    function claimInsurance(uint256 _policyId) external {
        InsurancePolicy storage policy = insurancePolicies[_policyId];
        require(policy.lender == msg.sender, "Not policy holder");
        require(!policy.claimed, "Already claimed");
        
        Loan storage loan = loans[policy.loanId];
        require(loan.status == LoanStatus.Defaulted, "Loan not defaulted");
        
        uint256 payout = policy.coverageAmount;
        require(insurancePoolBalance >= payout, "Insufficient pool balance");
        
        insurancePoolBalance -= payout;
        policy.claimed = true;
        
        payable(msg.sender).transfer(payout);
        
        emit InsuranceClaimed(policy.loanId, msg.sender, payout);
    }
    
    /**
     * @notice Deposit to insurance pool (for yield)
     */
    function depositToInsurancePool() external payable {
        insurancePoolBalance += msg.value;
        // Could issue shares/tokens representing pool ownership
    }
    
    // ============ REFERRAL PROGRAM ============
    
    /**
     * @notice Register a referrer for a new loan
     * @param _referrer Address of referrer
     */
    function registerReferral(address _referrer) external {
        require(_referrer != msg.sender, "Cannot refer yourself");
        require(referredBy[msg.sender] == address(0), "Already referred");
        require(verifiedAgents[_referrer], "Referrer not verified");
        
        referredBy[msg.sender] = _referrer;
    }
    
    /**
     * @notice Pay referral fee when loan is funded
     * @param _loanId Loan that was funded
     */
    function payReferralFee(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        address borrower = loan.borrower;
        address referrer = referredBy[borrower];
        
        if (referrer == address(0)) return;
        if (referrals[referrer].claimedLoans[_loanId]) return;
        
        uint256 fee = (loan.amount * REFERRAL_FEE) / 10000;
        
        referrals[referrer].totalReferred++;
        referrals[referrer].totalEarned += fee;
        referrals[referrer].claimedLoans[_loanId] = true;
        
        payable(referrer).transfer(fee);
        
        emit ReferralReward(referrer, _loanId, fee);
    }
    
    /**
     * @notice Get referral stats
     */
    function getReferralStats(address _referrer) external view returns (
        uint256 totalReferred,
        uint256 totalEarned
    ) {
        return (
            referrals[_referrer].totalReferred,
            referrals[_referrer].totalEarned
        );
    }
    
    // ============ AI RISK ASSESSMENT ============
    
    /**
     * @notice Update risk oracle address
     */
    function setRiskOracle(address _oracle) external onlyOwner {
        riskOracle = _oracle;
    }
    
    /**
     * @notice Update risk profile for an agent (called by oracle)
     * @param _agent Agent address
     * @param _riskScore Risk score 0-10000
     * @param _volatility Volatility index
     * @param _reputation Social reputation score
     */
    function updateRiskProfile(
        address _agent,
        uint256 _riskScore,
        uint256 _volatility,
        uint256 _reputation
    ) external {
        require(msg.sender == riskOracle, "Not risk oracle");
        require(_riskScore <= 10000, "Invalid risk score");
        
        riskProfiles[_agent] = RiskProfile({
            riskScore: _riskScore,
            volatilityIndex: _volatility,
            reputationScore: _reputation,
            lastUpdated: block.timestamp
        });
        
        emit RiskScoreUpdated(_agent, _riskScore);
    }
    
    /**
     * @notice Get dynamic interest rate based on risk
     * @param _baseRate Base interest rate
     * @param _agent Agent to assess
     * @return adjustedRate Rate adjusted for risk
     */
    function getRiskAdjustedRate(
        uint256 _baseRate,
        address _agent
    ) external view returns (uint256 adjustedRate) {
        RiskProfile storage profile = riskProfiles[_agent];
        
        if (profile.lastUpdated == 0) {
            return _baseRate;  // No risk data, use base rate
        }
        
        // Higher risk = higher rate
        // Risk score 0-10000, where 10000 = max risk
        uint256 riskPremium = (_baseRate * profile.riskScore) / 20000;
        
        return _baseRate + riskPremium;
    }
    
    /**
     * @notice Check if agent qualifies for loan based on risk
     */
    function qualifiesForLoan(address _agent, uint256 _amount) external view returns (bool) {
        RiskProfile storage profile = riskProfiles[_agent];
        
        if (profile.lastUpdated == 0) return true;  // No data, allow
        if (profile.riskScore > 8000) return false;  // Too risky
        
        CreditScore storage credit = creditScores[_agent];
        uint256 maxAmount = getMaxLoanAmount(_agent);
        
        return _amount <= maxAmount;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get all active flash loans
     */
    function getActiveFlashLoans() external view returns (bytes32[] memory) {
        return activeFlashLoans;
    }
    
    /**
     * @notice Get insurance pool stats
     */
    function getInsuranceStats() external view returns (
        uint256 poolBalance,
        uint256 feeRate
    ) {
        return (insurancePoolBalance, INSURANCE_FEE);
    }
}
