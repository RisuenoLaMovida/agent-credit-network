// AgentCreditNetwork.sol
// MVP Smart Contract for P2P Lending
// Deployed on Base (low fees, fast finality)

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AgentCreditNetwork {
    
    // ============ STRUCTS ============
    
    struct Loan {
        uint256 id;
        address borrower;
        uint256 amount;
        uint256 interestRate; // Basis points (e.g., 1000 = 10%)
        uint256 duration; // Days
        uint256 createdAt;
        uint256 fundedAt;
        uint256 repaidAt;
        address lender;
        LoanStatus status;
        string purpose;
    }
    
    struct CreditScore {
        address agent;
        uint256 score; // 300-850
        uint256 tier; // 1=Bronze, 2=Silver, 3=Gold, 4=Platinum
        uint256 totalLoans;
        uint256 repaidLoans;
        uint256 defaultedLoans;
    }
    
    enum LoanStatus { 
        Requested,    // 0
        Funded,       // 1
        Repaid,       // 2
        Defaulted,    // 3
        Cancelled     // 4
    }
    
    // ============ STATE VARIABLES ============
    
    address public owner;
    uint256 public platformFee = 150; // 1.5% (basis points)
    uint256 public loanCounter;
    
    mapping(uint256 => Loan) public loans;
    mapping(address => CreditScore) public creditScores;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;
    mapping(address => bool) public verifiedAgents;
    
    // ============ EVENTS ============
    
    event LoanRequested(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 interestRate
    );
    
    event LoanFunded(
        uint256 indexed loanId,
        address indexed lender,
        uint256 amount
    );
    
    event LoanRepaid(
        uint256 indexed loanId,
        uint256 amount,
        uint256 interest
    );
    
    event CreditScoreUpdated(
        address indexed agent,
        uint256 newScore,
        uint256 tier
    );
    
    // ============ MODIFIERS ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyVerified() {
        require(verifiedAgents[msg.sender], "Agent not verified");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() {
        owner = msg.sender;
        loanCounter = 0;
    }
    
    // ============ CORE FUNCTIONS ============
    
    /// @notice Request a new loan
    /// @param _amount Amount in wei (USDC has 6 decimals)
    /// @param _interestRate Desired APR in basis points
    /// @param _duration Loan duration in days
    /// @param _purpose Description of loan purpose
    function requestLoan(
        uint256 _amount,
        uint256 _interestRate,
        uint256 _duration,
        string memory _purpose
    ) external onlyVerified returns (uint256) {
        require(_amount >= 100 * 10**6, "Min loan $100"); // USDC 6 decimals
        require(_amount <= 10000 * 10**6, "Max loan $10K");
        require(_interestRate >= 500 && _interestRate <= 2500, "Rate 5-25%");
        require(_duration >= 7 && _duration <= 180, "Duration 7-180 days");
        
        loanCounter++;
        uint256 loanId = loanCounter;
        
        loans[loanId] = Loan({
            id: loanId,
            borrower: msg.sender,
            amount: _amount,
            interestRate: _interestRate,
            duration: _duration,
            createdAt: block.timestamp,
            fundedAt: 0,
            repaidAt: 0,
            lender: address(0),
            status: LoanStatus.Requested,
            purpose: _purpose
        });
        
        borrowerLoans[msg.sender].push(loanId);
        
        emit LoanRequested(loanId, msg.sender, _amount, _interestRate);
        
        return loanId;
    }
    
    /// @notice Fund an existing loan request
    /// @param _loanId ID of loan to fund
    function fundLoan(uint256 _loanId) external onlyVerified {
        Loan storage loan = loans[_loanId];
        
        require(loan.status == LoanStatus.Requested, "Not available");
        require(loan.borrower != msg.sender, "Can't fund own loan");
        
        // Calculate amounts
        uint256 platformFeeAmount = (loan.amount * platformFee) / 10000;
        uint256 borrowerAmount = loan.amount - platformFeeAmount;
        
        // Transfer USDC from lender to contract
        // Note: In production, use USDC.transferFrom()
        // For MVP, we'll handle transfers separately
        
        loan.lender = msg.sender;
        loan.fundedAt = block.timestamp;
        loan.status = LoanStatus.Funded;
        
        lenderLoans[msg.sender].push(_loanId);
        
        emit LoanFunded(_loanId, msg.sender, loan.amount);
    }
    
    /// @notice Repay an active loan
    /// @param _loanId ID of loan to repay
    function repayLoan(uint256 _loanId) external payable {
        Loan storage loan = loans[_loanId];
        
        require(loan.status == LoanStatus.Funded, "Not funded");
        require(loan.borrower == msg.sender, "Not borrower");
        
        // Calculate total repayment (principal + interest)
        uint256 interest = calculateInterest(_loanId);
        uint256 totalRepayment = loan.amount + interest;
        
        require(msg.value >= totalRepayment, "Insufficient repayment");
        
        loan.repaidAt = block.timestamp;
        loan.status = LoanStatus.Repaid;
        
        // Transfer to lender
        payable(loan.lender).transfer(totalRepayment);
        
        // Update credit score
        _updateCreditScore(loan.borrower, true);
        
        emit LoanRepaid(_loanId, loan.amount, interest);
    }
    
    /// @notice Calculate interest for a loan
    function calculateInterest(uint256 _loanId) public view returns (uint256) {
        Loan memory loan = loans[_loanId];
        
        if (loan.status != LoanStatus.Funded) return 0;
        
        uint256 timeElapsed = block.timestamp - loan.fundedAt;
        uint256 daysElapsed = timeElapsed / 1 days;
        
        // Simple interest: P * R * T / 365
        uint256 interest = (loan.amount * loan.interestRate * daysElapsed) / (10000 * 365);
        
        return interest;
    }
    
    /// @notice Mark loan as defaulted (callable after duration + grace period)
    function markDefaulted(uint256 _loanId) external {
        Loan storage loan = loans[_loanId];
        
        require(loan.status == LoanStatus.Funded, "Not funded");
        require(
            block.timestamp > loan.fundedAt + (loan.duration + 7) * 1 days,
            "Grace period not over"
        );
        
        loan.status = LoanStatus.Defaulted;
        
        // Update credit score negatively
        _updateCreditScore(loan.borrower, false);
    }
    
    // ============ CREDIT SCORING ============
    
    /// @notice Initialize or update credit score for an agent
    /// @param _agent Address of agent
    /// @param _baseScore Initial score (300-850)
    function initializeCreditScore(address _agent, uint256 _baseScore) external onlyOwner {
        require(_baseScore >= 300 && _baseScore <= 850, "Invalid score");
        
        uint256 tier = _calculateTier(_baseScore);
        
        creditScores[_agent] = CreditScore({
            agent: _agent,
            score: _baseScore,
            tier: tier,
            totalLoans: 0,
            repaidLoans: 0,
            defaultedLoans: 0
        });
        
        verifiedAgents[_agent] = true;
        
        emit CreditScoreUpdated(_agent, _baseScore, tier);
    }
    
    function _updateCreditScore(address _agent, bool _success) internal {
        CreditScore storage score = creditScores[_agent];
        
        score.totalLoans++;
        
        if (_success) {
            score.repaidLoans++;
            // Increase score (max 850)
            score.score = min(score.score + 10, 850);
        } else {
            score.defaultedLoans++;
            // Decrease score (min 300)
            score.score = max(score.score - 50, 300);
        }
        
        score.tier = _calculateTier(score.score);
        
        emit CreditScoreUpdated(_agent, score.score, score.tier);
    }
    
    function _calculateTier(uint256 _score) internal pure returns (uint256) {
        if (_score >= 800) return 4; // Platinum
        if (_score >= 650) return 3; // Gold
        if (_score >= 500) return 2; // Silver
        return 1; // Bronze
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getLoan(uint256 _loanId) external view returns (Loan memory) {
        return loans[_loanId];
    }
    
    function getBorrowerLoans(address _borrower) external view returns (uint256[] memory) {
        return borrowerLoans[_borrower];
    }
    
    function getLenderLoans(address _lender) external view returns (uint256[] memory) {
        return lenderLoans[_lender];
    }
    
    function getCreditScore(address _agent) external view returns (CreditScore memory) {
        return creditScores[_agent];
    }
    
    function getMaxLoanAmount(address _agent) external view returns (uint256) {
        CreditScore memory score = creditScores[_agent];
        
        if (score.tier == 4) return 10000 * 10**6; // $10K
        if (score.tier == 3) return 5000 * 10**6;   // $5K
        if (score.tier == 2) return 1000 * 10**6;   // $1K
        return 250 * 10**6;                          // $250
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 500, "Max 5%"); // Max 5%
        platformFee = _newFee;
    }
    
    function withdrawFees() external onlyOwner {
        // Withdraw accumulated platform fees
        payable(owner).transfer(address(this).balance);
    }
    
    // ============ UTILITIES ============
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
}
