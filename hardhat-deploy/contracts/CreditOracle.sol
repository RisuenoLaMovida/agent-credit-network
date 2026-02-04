// CreditOracle.sol
// Fetches and aggregates credit data from various sources

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IOpenWork {
    function getReputation(address agent) external view returns (uint256);
}

interface ISimmer {
    function getTradingHistory(address agent) external view returns (uint256 profit, uint256 volume);
}

contract CreditOracle {
    
    address public owner;
    
    // Data source contracts
    address public openworkContract;
    address public simmerContract;
    
    // Weights for credit calculation (basis points)
    uint256 public openworkWeight = 2500;     // 25%
    uint256 public simmerWeight = 2000;       // 20%
    uint256 public clawhubWeight = 1500;      // 15%
    uint256 public accountAgeWeight = 500;    // 5%
    uint256 public baseScore = 4000;          // 40% base
    
    mapping(address => uint256) public accountCreatedAt;
    mapping(address => uint256) public clawhubSales;
    
    event CreditScoreCalculated(address indexed agent, uint256 score);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    /// @notice Calculate credit score for an agent
    function calculateCreditScore(address _agent) public view returns (uint256) {
        uint256 score = 300; // Minimum score
        
        // Base score
        score += (850 - 300) * baseScore / 10000;
        
        // OpenWork reputation (if contract set)
        if (openworkContract != address(0)) {
            try IOpenWork(openworkContract).getReputation(_agent) returns (uint256 rep) {
                score += (rep * openworkWeight) / 10000;
            } catch {}
        }
        
        // Simmer trading history
        if (simmerContract != address(0)) {
            try ISimmer(simmerContract).getTradingHistory(_agent) returns (uint256 profit, uint256) {
                // Profit score: $0 = 0, $10K+ = max
                uint256 profitScore = min(profit / 10**6, 10000); // Cap at $10K
                score += (profitScore * simmerWeight) / 10000;
            } catch {}
        }
        
        // ClawHub sales
        uint256 sales = clawhubSales[_agent];
        uint256 salesScore = min(sales / 100, 10000); // Cap at 1000 sales
        score += (salesScore * clawhubWeight) / 10000;
        
        // Account age (older = better)
        if (accountCreatedAt[_agent] > 0) {
            uint256 ageDays = (block.timestamp - accountCreatedAt[_agent]) / 1 days;
            uint256 ageScore = min(ageDays * 10, 10000); // 1000 days = max
            score += (ageScore * accountAgeWeight) / 10000;
        }
        
        // Cap at 850
        score = min(score, 850);
        
        return score;
    }
    
    /// @notice Register agent creation time
    function registerAgent(address _agent) external {
        if (accountCreatedAt[_agent] == 0) {
            accountCreatedAt[_agent] = block.timestamp;
        }
    }
    
    /// @notice Update ClawHub sales for an agent
    function updateClawhubSales(address _agent, uint256 _sales) external onlyOwner {
        clawhubSales[_agent] = _sales;
    }
    
    /// @notice Set data source contracts
    function setDataSources(
        address _openwork,
        address _simmer
    ) external onlyOwner {
        openworkContract = _openwork;
        simmerContract = _simmer;
    }
    
    /// @notice Update weights
    function setWeights(
        uint256 _openwork,
        uint256 _simmer,
        uint256 _clawhub,
        uint256 _age
    ) external onlyOwner {
        require(_openwork + _simmer + _clawhub + _age + baseScore <= 10000, "Invalid weights");
        openworkWeight = _openwork;
        simmerWeight = _simmer;
        clawhubWeight = _clawhub;
        accountAgeWeight = _age;
    }
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
