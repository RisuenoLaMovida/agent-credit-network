// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AgentCreditNetworkV1
 * @notice SLIMMED DOWN VERSION - Core lending only
 * Deploy cost: ~$40 on Base
 * Features: Borrow, Lend, Repay, Credit Scores
 * 
 * V2 adds: Flash loans, Insurance, Bundling (revenue funded)
 */

contract AgentCreditNetworkV1 {
    
    // ============ STRUCTS ============
    
    struct Loan {
        uint256 id;
        address borrower;
        uint256 amount;
        uint256 interestRate;
        uint256 duration;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 repaidAt;
        address lender;
        LoanStatus status;
        string purpose;
    }
    
    struct CreditScore {
        address agent;
        uint256 score;
        uint256 tier;
        uint256 totalLoans;
        uint256 repaidLoans;
        uint256 defaultedLoans;
    }
    
    enum LoanStatus { Requested, Funded, Repaid, Defaulted }
    
    // ============ STATE ============
    
    address public owner;
    uint256 public platformFee = 250; // 2.5%
    uint256 public loanCounter;
    
    mapping(uint256 => Loan) public loans;
    mapping(address => CreditScore) public creditScores;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;
    mapping(address => bool) public verifiedAgents;
    
    // ============ EVENTS ============
    
    event LoanRequested(uint256 indexed loanId, address borrower, uint256 amount, uint256 rate);
    event LoanFunded(uint256 indexed loanId, address lender, uint256 amount);
    event LoanRepaid(uint256 indexed loanId, uint256 amount, uint256 interest);
    event CreditScoreUpdated(address indexed agent, uint256 score, uint256 tier);
    
    // ============ MODIFIERS ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyVerified() {
        require(verifiedAgents[msg.sender], "Not verified");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _feeRecipient) {
        owner = _feeRecipient;
    }
    
    // ============ CORE FUNCTIONS ============
    
    /// @notice Request a loan
    function requestLoan(
        uint256 _amount,
        uint256 _interestRate,
        uint256 _duration,
        string memory _purpose
    ) external onlyVerified returns (uint256) {
        require(_amount >= 1e6, "Min $1");
        require(_amount <= 10000e6, "Max $10K");
        require(_interestRate >= 500 && _interestRate <= 2500, "Rate 5-25%");
        require(_duration >= 7 && _duration <= 180, "7-180 days");
        
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
    
    /// @notice Fund a loan
    function fundLoan(uint256 _loanId) external onlyVerified payable {
        Loan storage loan = loans[_loanId];
        
        require(loan.status == LoanStatus.Requested, "Not available");
        require(loan.borrower != msg.sender, "Can't fund own");
        require(msg.value >= loan.amount, "Insufficient funds");
        
        // Platform fee
        uint256 fee = (loan.amount * platformFee) / 10000;
        
        loan.lender = msg.sender;
        loan.fundedAt = block.timestamp;
        loan.status = LoanStatus.Funded;
        
        lenderLoans[msg.sender].push(_loanId);
        
        // Send to borrower minus fee
        payable(loan.borrower).transfer(loan.amount - fee);
        
        emit LoanFunded(_loanId, msg.sender, loan.amount);
    }
    
    /// @notice Repay a loan
    function repayLoan(uint256 _loanId) external payable {
        Loan storage loan = loans[_loanId];
        
        require(loan.status == LoanStatus.Funded, "Not funded");
        require(loan.borrower == msg.sender, "Not borrower");
        
        uint256 interest = calculateInterest(_loanId);
        uint256 total = loan.amount + interest;
        
        require(msg.value >= total, "Insufficient");
        
        loan.repaidAt = block.timestamp;
        loan.status = LoanStatus.Repaid;
        
        // Pay lender
        payable(loan.lender).transfer(total);
        
        // Update credit
        _updateCreditScore(msg.sender, true);
        
        emit LoanRepaid(_loanId, loan.amount, interest);
    }
    
    /// @notice Calculate interest
    function calculateInterest(uint256 _loanId) public view returns (uint256) {
        Loan memory loan = loans[_loanId];
        if (loan.status != LoanStatus.Funded) return 0;
        
        uint256 daysElapsed = (block.timestamp - loan.fundedAt) / 1 days;
        return (loan.amount * loan.interestRate * daysElapsed) / (10000 * 365);
    }
    
    /// @notice Mark defaulted after grace period
    function markDefaulted(uint256 _loanId) external {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.Funded, "Not funded");
        require(block.timestamp > loan.fundedAt + (loan.duration + 7) * 1 days, "Grace period");
        
        loan.status = LoanStatus.Defaulted;
        _updateCreditScore(loan.borrower, false);
    }
    
    // ============ CREDIT SCORING ============
    
    function initializeCreditScore(address _agent, uint256 _score) external onlyOwner {
        require(_score >= 300 && _score <= 850, "Invalid");
        uint256 tier = _calcTier(_score);
        
        creditScores[_agent] = CreditScore(_agent, _score, tier, 0, 0, 0);
        verifiedAgents[_agent] = true;
        
        emit CreditScoreUpdated(_agent, _score, tier);
    }
    
    function _updateCreditScore(address _agent, bool _success) internal {
        CreditScore storage s = creditScores[_agent];
        s.totalLoans++;
        
        if (_success) {
            s.repaidLoans++;
            s.score = min(s.score + 10, 850);
        } else {
            s.defaultedLoans++;
            s.score = max(s.score - 50, 300);
        }
        
        s.tier = _calcTier(s.score);
        emit CreditScoreUpdated(_agent, s.score, s.tier);
    }
    
    function _calcTier(uint256 _score) internal pure returns (uint256) {
        if (_score >= 800) return 4;
        if (_score >= 650) return 3;
        if (_score >= 500) return 2;
        return 1;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getLoan(uint256 _id) external view returns (Loan memory) {
        return loans[_id];
    }
    
    function getCreditScore(address _a) external view returns (CreditScore memory) {
        return creditScores[_a];
    }
    
    function getMaxLoan(address _a) external view returns (uint256) {
        uint256 t = creditScores[_a].tier;
        if (t == 4) return 10000e6;
        if (t == 3) return 5000e6;
        if (t == 2) return 1000e6;
        return 250e6;
    }
    
    // ============ UTILS ============
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
    
    // ============ ADMIN ============
    
    function withdrawFees() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
