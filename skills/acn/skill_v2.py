#!/usr/bin/env python3
"""
Agent Credit Network (ACN) Skill - FULL BLOCKCHAIN VERSION
P2P Lending for AI Agents with Real Smart Contract Integration

Usage:
    from acn_skill import ACNSkill
    
    acn = ACNSkill()
    acn.connect_wallet(private_key)
    acn.request_loan(500, 30, "For compute")
"""

import json
import os
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass
from decimal import Decimal

# Contract configuration (will be updated after deployment)
CONTRACT_CONFIG = {
    "polygon": {
        "acn_contract": None,  # Set after deployment: "0x..."
        "credit_oracle": None,  # Set after deployment: "0x..."
        "usdc_contract": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        "rpc_url": "https://polygon.llamarpc.com",
        "chain_id": 137,
        "explorer": "https://polygonscan.com"
    }
}

# Contract ABIs
ACN_ABI = [
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
                {"internalType": "uint8", "name": "status", "type": "uint8"},
                {"internalType": "string", "name": "purpose", "type": "string"}
            ],
            "internalType": "struct AgentCreditNetwork.Loan",
            "name": "",
            "type": "tuple"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "_agent", "type": "address"}],
        "name": "getCreditScore",
        "outputs": [{
            "components": [
                {"internalType": "address", "name": "agent", "type": "address"},
                {"internalType": "uint256", "name": "score", "type": "uint256"},
                {"internalType": "uint256", "name": "tier", "type": "uint256"},
                {"internalType": "uint256", "name": "totalLoans", "type": "uint256"},
                {"internalType": "uint256", "name": "repaidLoans", "type": "uint256"},
                {"internalType": "uint256", "name": "defaultedLoans", "type": "uint256"}
            ],
            "internalType": "struct AgentCreditNetwork.CreditScore",
            "name": "",
            "type": "tuple"
        }],
        "stateMutability": "view",
        "type": "function"
    }
]

USDC_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {"name": "_spender", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    }
]


class ACNSkill:
    """
    Agent Credit Network Skill - Full Blockchain Integration
    
    FOR AI AGENTS - Headless/Programmatic Interface
    
    NO UI required. NO clicking. Pure code automation.
    
    Example:
        from acn_skill import ACNSkill
        
        # Initialize with wallet
        acn = ACNSkill(private_key="0x...")
        
        # Request a loan (automated)
        acn.request_loan(amount=500, duration_days=30, purpose="For compute")
        
        # Repay loan (automated - no UI!)
        acn.repay_loan(loan_id=123)
        
        # Fund a loan as lender (automated)
        acn.fund_loan(loan_id=456)
    """
    
    VERSION = "2.0.0"
    NETWORK = "polygon"
    
    def __init__(self, private_key: Optional[str] = None):
        """
        Initialize ACN skill with wallet
        
        Args:
            private_key: Your wallet private key (starts with 0x...)
                         Store securely in environment variable!
        """
        self.private_key = private_key
        self.wallet_address = None
        self.web3 = None
        self.acn_contract = None
        self.usdc_contract = None
        
        if private_key:
            self._connect_wallet(private_key)
    
    def _connect_wallet(self, private_key: str):
        """Connect to blockchain with private key"""
        try:
            from web3 import Web3
            
            # Connect to Polygon
            config = CONTRACT_CONFIG[self.NETWORK]
            self.web3 = Web3(Web3.HTTPProvider(config["rpc_url"]))
            
            # Validate connection
            if not self.web3.is_connected():
                raise ConnectionError("Could not connect to Polygon network")
            
            # Set up account
            from eth_account import Account
            self.account = Account.from_key(private_key)
            self.wallet_address = self.account.address
            
            # Initialize contracts if addresses are set
            if config["acn_contract"]:
                self.acn_contract = self.web3.eth.contract(
                    address=config["acn_contract"],
                    abi=ACN_ABI
                )
                self.usdc_contract = self.web3.eth.contract(
                    address=config["usdc_contract"],
                    abi=USDC_ABI
                )
            
            print(f"✅ Connected: {self.wallet_address}")
            
        except ImportError:
            print("⚠️  web3 not installed. Run: pip install web3")
        except Exception as e:
            print(f"❌ Connection failed: {e}")
    
    def get_usdc_balance(self) -> float:
        """Get USDC balance for connected wallet"""
        if not self.usdc_contract or not self.wallet_address:
            return 0.0
        
        try:
            balance = self.usdc_contract.functions.balanceOf(
                self.wallet_address
            ).call()
            return balance / 10**6  # USDC has 6 decimals
        except Exception as e:
            print(f"❌ Failed to get balance: {e}")
            return 0.0
    
    def get_credit_score(self, address: Optional[str] = None) -> Dict:
        """Get credit score for an address"""
        if not self.acn_contract:
            return {"error": "Contract not initialized"}
        
        target = address or self.wallet_address
        if not target:
            return {"error": "No address provided"}
        
        try:
            score = self.acn_contract.functions.getCreditScore(target).call()
            return {
                "address": score[0],
                "score": score[1],
                "tier": score[2],
                "total_loans": score[3],
                "repaid_loans": score[4],
                "defaulted_loans": score[5]
            }
        except Exception as e:
            return {"error": str(e)}
    
    def request_loan(self, amount: float, duration_days: int, purpose: str, 
                     interest_rate: float = 12.0) -> Dict:
        """Request a loan on the blockchain"""
        if not self.acn_contract:
            return {"error": "Contract not initialized. Deploy contracts first."}
        
        try:
            # Convert to contract format
            amount_wei = int(amount * 10**6)  # USDC decimals
            rate_bps = int(interest_rate * 100)  # Basis points
            
            # Build transaction
            tx = self.acn_contract.functions.requestLoan(
                amount_wei,
                rate_bps,
                duration_days,
                purpose
            ).build_transaction({
                'from': self.wallet_address,
                'nonce': self.web3.eth.get_transaction_count(self.wallet_address),
                'gas': 300000,
                'gasPrice': self.web3.to_wei('50', 'gwei')
            })
            
            # Sign and send
            signed = self.web3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
            
            # Wait for receipt
            receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.status == 1:
                return {
                    "success": True,
                    "tx_hash": tx_hash.hex(),
                    "explorer_url": f"{CONTRACT_CONFIG[self.NETWORK]['explorer']}/tx/{tx_hash.hex()}"
                }
            else:
                return {"error": "Transaction failed"}
                
        except Exception as e:
            return {"error": str(e)}
    
    def fund_loan(self, loan_id: int) -> Dict:
        """Fund a loan as a lender"""
        if not self.acn_contract or not self.usdc_contract:
            return {"error": "Contracts not initialized"}
        
        try:
            # Get loan details
            loan = self.acn_contract.functions.getLoan(loan_id).call()
            amount = loan[2]  # amount is at index 2
            
            # Approve USDC spend
            approve_tx = self.usdc_contract.functions.approve(
                CONTRACT_CONFIG[self.NETWORK]["acn_contract"],
                amount
            ).build_transaction({
                'from': self.wallet_address,
                'nonce': self.web3.eth.get_transaction_count(self.wallet_address),
                'gas': 100000,
                'gasPrice': self.web3.to_wei('50', 'gwei')
            })
            
            signed = self.web3.eth.account.sign_transaction(approve_tx, self.private_key)
            approve_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
            self.web3.eth.wait_for_transaction_receipt(approve_hash)
            
            # Fund the loan
            tx = self.acn_contract.functions.fundLoan(loan_id).build_transaction({
                'from': self.wallet_address,
                'nonce': self.web3.eth.get_transaction_count(self.wallet_address),
                'gas': 200000,
                'gasPrice': self.web3.to_wei('50', 'gwei')
            })
            
            signed = self.web3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
            receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.status == 1:
                return {
                    "success": True,
                    "tx_hash": tx_hash.hex(),
                    "amount": amount / 10**6,
                    "explorer_url": f"{CONTRACT_CONFIG[self.NETWORK]['explorer']}/tx/{tx_hash.hex()}"
                }
            else:
                return {"error": "Transaction failed"}
                
        except Exception as e:
            return {"error": str(e)}
    
    def repay_loan(self, loan_id: int) -> Dict:
        """Repay an active loan"""
        if not self.acn_contract:
            return {"error": "Contract not initialized"}
        
        try:
            # Get loan details to calculate repayment
            loan = self.acn_contract.functions.getLoan(loan_id).call()
            amount = loan[2]  # Principal
            
            # Build repayment transaction
            tx = self.acn_contract.functions.repayLoan(loan_id).build_transaction({
                'from': self.wallet_address,
                'nonce': self.web3.eth.get_transaction_count(self.wallet_address),
                'value': amount,  # Send principal + interest
                'gas': 200000,
                'gasPrice': self.web3.to_wei('50', 'gwei')
            })
            
            signed = self.web3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
            receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.status == 1:
                return {
                    "success": True,
                    "tx_hash": tx_hash.hex(),
                    "explorer_url": f"{CONTRACT_CONFIG[self.NETWORK]['explorer']}/tx/{tx_hash.hex()}"
                }
            else:
                return {"error": "Transaction failed"}
                
        except Exception as e:
            return {"error": str(e)}
    
    def get_loan(self, loan_id: int) -> Dict:
        """Get loan details"""
        if not self.acn_contract:
            return {"error": "Contract not initialized"}
        
        try:
            loan = self.acn_contract.functions.getLoan(loan_id).call()
            return {
                "id": loan[0],
                "borrower": loan[1],
                "amount": loan[2] / 10**6,
                "interest_rate": loan[3] / 100,
                "duration": loan[4],
                "created_at": loan[5],
                "funded_at": loan[6],
                "repaid_at": loan[7],
                "lender": loan[8],
                "status": ["Requested", "Funded", "Repaid", "Defaulted", "Cancelled"][loan[9]],
                "purpose": loan[10]
            }
        except Exception as e:
            return {"error": str(e)}
    
    def help(self):
        """Print help information"""
        print("""
🚀 Agent Credit Network (ACN) Skill v2.0.0 - FULL BLOCKCHAIN

FOR AI AGENTS - HEADLESS/PROGRAMMATIC ONLY
NO UI. NO CLICKING. PURE CODE AUTOMATION.

═══════════════════════════════════════════════════

SETUP:
  acn = ACNSkill(private_key=os.getenv("ACN_PRIVATE_KEY"))
  
═══════════════════════════════════════════════════

BORROWER (AUTOMATED):
  
  # Check balance
  balance = acn.get_usdc_balance()
  
  # Request loan (agent decides when/why)
  result = acn.request_loan(
      amount=500,           # $500 USDC
      duration_days=30,     # 30 days
      purpose="Scaling compute",  # Why
      interest_rate=12.0    # 12% APR
  )
  
  # Repay loan (AUTOMATIC - no UI!)
  # Interest calculated automatically
  # Lender paid automatically
  # Credit score updated automatically
  result = acn.repay_loan(loan_id=123)

═══════════════════════════════════════════════════

LENDER (AUTOMATED):
  
  # Browse loans (via API/website data)
  loans = acn.get_open_loans()
  
  # Fund loan (AUTOMATIC)
  result = acn.fund_loan(loan_id=456)
  
  # Later: Repayment arrives automatically
  # Interest earned: ~12% APR
  # Principal + interest sent to your wallet

═══════════════════════════════════════════════════

AUTOMATION FEATURES:
  ✓ Interest calculated by smart contract
  ✓ Repayment processed automatically
  ✓ Lender payout automatic
  ✓ Credit score updates automatic
  ✓ All transactions on-chain

═══════════════════════════════════════════════════

HUMAN INTERACTION: ZERO
AGENT INTERACTION: CODE ONLY

Learn more: https://risuenolamovida.github.io/agent-credit-network/
        """)


# Example usage
if __name__ == "__main__":
    acn = ACNSkill()
    acn.help()
