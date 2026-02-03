// Web3 Integration for ACN Frontend
// Handles wallet connection, contract interactions, and transactions

const ACN_CONFIG = {
    // Polygon Mainnet
    NETWORK: {
        chainId: '0x89', // 137 in decimal
        chainName: 'Polygon Mainnet',
        nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
        rpcUrls: ['https://polygon.llamarpc.com', 'https://polygon-rpc.com'],
        blockExplorerUrls: ['https://polygonscan.com']
    },
    
    // Contract addresses (will be set after deployment)
    CONTRACTS: {
        ACN: null, // Will be: '0x...' after deployment
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' // Polygon USDC
    },
    
    // ABIs
    ACN_ABI: [
        {
            "inputs": [{"internalType": "address", "name": "_feeRecipient", "type": "address"}],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [
                {"internalType": "uint256", "name": "_amount", "type": "uint256"},
                {"internalType": "uint256", "name": "_interestRate", "type": "uint256"},
                {"internalType": "uint256", "name": "_duration", "type": "uint256"},
                {"internalType": "string", "name": "_purpose", "type": "string"}
            ],
            "name": "requestLoan",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "uint256", "name": "_loanId", "type": "uint256"}],
            "name": "fundLoan",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "uint256", "name": "_loanId", "type": "uint256"}],
            "name": "repayLoan",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "uint256", "name": "_loanId", "type": "uint256"}],
            "name": "getLoan",
            "outputs": [{
                "components": [
                    {"internalType": "uint256", "name": "id", "type": "uint256"},
                    {"internalType": "address", "name": "borrower", "type": "address"},
                    {"internalType": "uint256", "name": "amount", "type": "uint256"},
                    {"internalType": "uint256", "name": "interestRate", "type": "uint256"},
                    {"internalType": "uint256", "name": "duration", "type": "uint256"},
                    {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
                    {"internalType": "uint256", "name": "fundedAt", "type": "uint256"},
                    {"internalType": "uint256", "name": "repaidAt", "type": "uint256"},
                    {"internalType": "address", "name": "lender", "type": "address"},
                    {"internalType": "enum AgentCreditNetwork.LoanStatus", "name": "status", "type": "uint8"},
                    {"internalType": "string", "name": "purpose", "type": "string"}
                ],
                "internalType": "struct AgentCreditNetwork.Loan",
                "name": "",
                "type": "tuple"
            }],
            "stateMutability": "view",
            "type": "function"
        }
    ],
    
    USDC_ABI: [
        {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "_to", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "_from", "type": "address"},
                {"name": "_to", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "transferFrom",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "_spender", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        }
    ]
};

class ACNWeb3 {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.acnContract = null;
        this.usdcContract = null;
        this.userAddress = null;
    }
    
    async connectWallet() {
        try {
            // Check if MetaMask is installed
            if (typeof window.ethereum === 'undefined') {
                throw new Error('Please install MetaMask or another Web3 wallet');
            }
            
            // Request account access
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            this.userAddress = accounts[0];
            
            // Check if on Polygon
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== ACN_CONFIG.NETWORK.chainId) {
                await this.switchToPolygon();
            }
            
            // Initialize ethers
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            
            // Initialize contracts (after deployment)
            if (ACN_CONFIG.CONTRACTS.ACN) {
                this.acnContract = new ethers.Contract(
                    ACN_CONFIG.CONTRACTS.ACN,
                    ACN_CONFIG.ACN_ABI,
                    this.signer
                );
                
                this.usdcContract = new ethers.Contract(
                    ACN_CONFIG.CONTRACTS.USDC,
                    ACN_CONFIG.USDC_ABI,
                    this.signer
                );
            }
            
            this.updateUI();
            return { success: true, address: this.userAddress };
            
        } catch (error) {
            console.error('Wallet connection failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    async switchToPolygon() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ACN_CONFIG.NETWORK.chainId }]
            });
        } catch (switchError) {
            // If network not added, add it
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [ACN_CONFIG.NETWORK]
                });
            } else {
                throw switchError;
            }
        }
    }
    
    async getUSDCBalance() {
        if (!this.usdcContract || !this.userAddress) return '0';
        
        try {
            const balance = await this.usdcContract.balanceOf(this.userAddress);
            return ethers.utils.formatUnits(balance, 6); // USDC has 6 decimals
        } catch (error) {
            console.error('Failed to get balance:', error);
            return '0';
        }
    }
    
    async requestLoan(amount, interestRate, duration, purpose) {
        if (!this.acnContract) {
            throw new Error('ACN contract not initialized');
        }
        
        try {
            // Convert amount to USDC decimals (6)
            const amountWei = ethers.utils.parseUnits(amount.toString(), 6);
            
            // Interest rate in basis points (e.g., 12% = 1200)
            const rateBps = Math.round(interestRate * 100);
            
            const tx = await this.acnContract.requestLoan(
                amountWei,
                rateBps,
                duration,
                purpose
            );
            
            const receipt = await tx.wait();
            
            // Extract loan ID from event
            const event = receipt.events.find(e => e.event === 'LoanRequested');
            const loanId = event ? event.args[0].toString() : null;
            
            return { 
                success: true, 
                loanId: loanId,
                txHash: receipt.transactionHash 
            };
            
        } catch (error) {
            console.error('Loan request failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    async fundLoan(loanId) {
        if (!this.acnContract || !this.usdcContract) {
            throw new Error('Contracts not initialized');
        }
        
        try {
            // Get loan details
            const loan = await this.acnContract.getLoan(loanId);
            
            // Approve USDC transfer
            const approveTx = await this.usdcContract.approve(
                ACN_CONFIG.CONTRACTS.ACN,
                loan.amount
            );
            await approveTx.wait();
            
            // Fund the loan
            const tx = await this.acnContract.fundLoan(loanId);
            const receipt = await tx.wait();
            
            return { 
                success: true, 
                txHash: receipt.transactionHash 
            };
            
        } catch (error) {
            console.error('Funding failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    updateUI() {
        // Update UI elements with connected wallet info
        const walletDisplay = document.getElementById('wallet-address');
        if (walletDisplay && this.userAddress) {
            walletDisplay.textContent = this.userAddress.slice(0, 6) + '...' + this.userAddress.slice(-4);
        }
        
        // Update connect button
        const connectBtn = document.getElementById('connect-wallet-btn');
        if (connectBtn) {
            connectBtn.textContent = 'Connected';
            connectBtn.disabled = true;
        }
    }
}

// Initialize ACN Web3 instance
const acnWeb3 = new ACNWeb3();

// Export for use in other scripts
window.acnWeb3 = acnWeb3;
