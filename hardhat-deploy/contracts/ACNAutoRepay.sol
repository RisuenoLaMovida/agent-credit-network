// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AgentCreditNetwork.sol";

/**
 * @title ACNAutoRepay
 * @notice Auto-repayment system for ACN loans
 * Agents can configure automatic repayment when their balance exceeds thresholds
 */

contract ACNAutoRepay {
    
    // ============ STRUCTS ============
    
    struct AutoRepayConfig {
        bool enabled;
        uint256 threshold;      // Balance threshold to trigger repayment
        uint256 minBalance;     // Keep at least this much after repayment
        uint256 loanId;
        uint256 createdAt;
    }
    
    // ============ STATE VARIABLES ============
    
    AgentCreditNetwork public acn;
    
    // agent address => array of auto-repay configs
    mapping(address => AutoRepayConfig[]) public autoRepayConfigs;
    
    // Track if agent has auto-repay enabled
    mapping(address => bool) public autoRepayEnabled;
    
    // USDC contract for balance checks
    address public usdcAddress;
    
    // ============ EVENTS ============
    
    event AutoRepayConfigured(
        address indexed agent,
        uint256 loanId,
        uint256 threshold,
        uint256 minBalance
    );
    
    event AutoRepayExecuted(
        address indexed agent,
        uint256 indexed loanId,
        uint256 amount
    );
    
    event AutoRepayDisabled(
        address indexed agent,
        uint256 indexed loanId
    );
    
    // ============ MODIFIERS ============
    
    modifier onlyBorrower(uint256 _loanId) {
        AgentCreditNetwork.Loan memory loan = acn.getLoan(_loanId);
        require(loan.borrower == msg.sender, "Not borrower");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _acnAddress, address _usdcAddress) {
        acn = AgentCreditNetwork(_acnAddress);
        usdcAddress = _usdcAddress;
    }
    
    // ============ AUTO-REPAY CONFIGURATION ============
    
    /**
     * @notice Configure auto-repayment for a loan
     * @param _loanId Loan to auto-repay
     * @param _threshold Trigger repayment when balance exceeds this (USDC, 6 decimals)
     * @param _minBalance Keep at least this much after repayment (USDC, 6 decimals)
     */
    function configureAutoRepay(
        uint256 _loanId,
        uint256 _threshold,
        uint256 _minBalance
    ) external onlyBorrower(_loanId) {
        AgentCreditNetwork.Loan memory loan = acn.getLoan(_loanId);
        require(loan.status == AgentCreditNetwork.LoanStatus.Funded, "Loan not active");
        require(_threshold > _minBalance, "Threshold must exceed min balance");
        require(_threshold > 0, "Threshold must be positive");
        
        // Check if config already exists for this loan
        uint256 existingIndex = _findConfigIndex(msg.sender, _loanId);
        
        if (existingIndex < autoRepayConfigs[msg.sender].length) {
            // Update existing config
            autoRepayConfigs[msg.sender][existingIndex] = AutoRepayConfig({
                enabled: true,
                threshold: _threshold,
                minBalance: _minBalance,
                loanId: _loanId,
                createdAt: block.timestamp
            });
        } else {
            // Create new config
            autoRepayConfigs[msg.sender].push(AutoRepayConfig({
                enabled: true,
                threshold: _threshold,
                minBalance: _minBalance,
                loanId: _loanId,
                createdAt: block.timestamp
            }));
        }
        
        autoRepayEnabled[msg.sender] = true;
        
        emit AutoRepayConfigured(msg.sender, _loanId, _threshold, _minBalance);
    }
    
    /**
     * @notice Disable auto-repayment for a loan
     * @param _loanId Loan to disable auto-repay for
     */
    function disableAutoRepay(uint256 _loanId) external onlyBorrower(_loanId) {
        uint256 index = _findConfigIndex(msg.sender, _loanId);
        require(index < autoRepayConfigs[msg.sender].length, "Config not found");
        
        autoRepayConfigs[msg.sender][index].enabled = false;
        
        // Check if any configs are still enabled
        bool anyEnabled = false;
        for (uint256 i = 0; i < autoRepayConfigs[msg.sender].length; i++) {
            if (autoRepayConfigs[msg.sender][i].enabled) {
                anyEnabled = true;
                break;
            }
        }
        autoRepayEnabled[msg.sender] = anyEnabled;
        
        emit AutoRepayDisabled(msg.sender, _loanId);
    }
    
    // ============ AUTO-REPAY EXECUTION ============
    
    /**
     * @notice Check and execute auto-repayment if conditions met
     * @param _agent Agent address to check
     * @return executed Whether repayment was executed
     * @return loanId Which loan was repaid (0 if none)
     */
    function checkAndExecuteAutoRepay(address _agent) external returns (bool executed, uint256 loanId) {
        if (!autoRepayEnabled[_agent]) return (false, 0);
        
        AutoRepayConfig[] storage configs = autoRepayConfigs[_agent];
        uint256 balance = getUSDCBalance(_agent);
        
        for (uint256 i = 0; i < configs.length; i++) {
            if (!configs[i].enabled) continue;
            
            AgentCreditNetwork.Loan memory loan = acn.getLoan(configs[i].loanId);
            if (loan.status != AgentCreditNetwork.LoanStatus.Funded) continue;
            
            if (balance >= configs[i].threshold) {
                // Calculate repayment amount
                uint256 interest = acn.calculateInterest(configs[i].loanId);
                uint256 totalRepayment = loan.amount + interest;
                
                // Check if we can repay while keeping min balance
                if (balance >= totalRepayment + configs[i].minBalance) {
                    // Execute repayment via USDC transfer
                    _executeRepayment(configs[i].loanId, totalRepayment);
                    
                    // Disable after execution (one-time auto-repay)
                    configs[i].enabled = false;
                    
                    // Update autoRepayEnabled status
                    bool anyEnabled = false;
                    for (uint256 j = 0; j < configs.length; j++) {
                        if (configs[j].enabled) {
                            anyEnabled = true;
                            break;
                        }
                    }
                    autoRepayEnabled[_agent] = anyEnabled;
                    
                    emit AutoRepayExecuted(_agent, configs[i].loanId, totalRepayment);
                    return (true, configs[i].loanId);
                }
            }
        }
        
        return (false, 0);
    }
    
    /**
     * @notice Check if auto-repay would trigger for an agent
     * @param _agent Agent address to check
     * @return wouldTrigger Whether auto-repay would execute
     * @return loanId Which loan would be repaid
     * @return amount How much would be repaid
     */
    function checkAutoRepayStatus(address _agent) external view returns (
        bool wouldTrigger,
        uint256 loanId,
        uint256 amount
    ) {
        if (!autoRepayEnabled[_agent]) return (false, 0, 0);
        
        AutoRepayConfig[] storage configs = autoRepayConfigs[_agent];
        uint256 balance = getUSDCBalance(_agent);
        
        for (uint256 i = 0; i < configs.length; i++) {
            if (!configs[i].enabled) continue;
            
            AgentCreditNetwork.Loan memory loan = acn.getLoan(configs[i].loanId);
            if (loan.status != AgentCreditNetwork.LoanStatus.Funded) continue;
            
            if (balance >= configs[i].threshold) {
                uint256 interest = acn.calculateInterest(configs[i].loanId);
                uint256 totalRepayment = loan.amount + interest;
                
                if (balance >= totalRepayment + configs[i].minBalance) {
                    return (true, configs[i].loanId, totalRepayment);
                }
            }
        }
        
        return (false, 0, 0);
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    function _findConfigIndex(address _agent, uint256 _loanId) internal view returns (uint256) {
        for (uint256 i = 0; i < autoRepayConfigs[_agent].length; i++) {
            if (autoRepayConfigs[_agent][i].loanId == _loanId) {
                return i;
            }
        }
        return type(uint256).max; // Not found
    }
    
    function _executeRepayment(uint256 _loanId, uint256 _amount) internal {
        // This would integrate with USDC transfer
        // For now, placeholder - actual implementation would call USDC.transferFrom()
        // to move funds from borrower to lender
        
        // In production: 
        // IERC20(usdcAddress).transferFrom(borrower, lender, amount);
        // acn.markLoanRepaid(_loanId);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get agent's USDC balance
     */
    function getUSDCBalance(address _agent) public view returns (uint256) {
        // Call USDC contract balanceOf
        (bool success, bytes memory data) = usdcAddress.staticcall(
            abi.encodeWithSignature("balanceOf(address)", _agent)
        );
        if (success && data.length >= 32) {
            return abi.decode(data, (uint256));
        }
        return 0;
    }
    
    /**
     * @notice Get all auto-repay configs for an agent
     */
    function getAutoRepayConfigs(address _agent) external view returns (AutoRepayConfig[] memory) {
        return autoRepayConfigs[_agent];
    }
    
    /**
     * @notice Get specific auto-repay config
     */
    function getAutoRepayConfig(address _agent, uint256 _loanId) external view returns (AutoRepayConfig memory) {
        uint256 index = _findConfigIndex(_agent, _loanId);
        require(index < autoRepayConfigs[_agent].length, "Config not found");
        return autoRepayConfigs[_agent][index];
    }
    
    /**
     * @notice Check if agent has auto-repay configured for a loan
     */
    function hasAutoRepay(address _agent, uint256 _loanId) external view returns (bool) {
        uint256 index = _findConfigIndex(_agent, _loanId);
        if (index >= autoRepayConfigs[_agent].length) return false;
        return autoRepayConfigs[_agent][index].enabled;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function updateACNAddress(address _newACN) external {
        // Only owner of ACN contract can update
        require(msg.sender == address(acn), "Not authorized");
        acn = AgentCreditNetwork(_newACN);
    }
    
    function updateUSDCAddress(address _newUSDC) external {
        require(msg.sender == address(acn), "Not authorized");
        usdcAddress = _newUSDC;
    }
}