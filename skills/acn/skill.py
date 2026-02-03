#!/usr/bin/env python3
"""
Agent Credit Network (ACN) Skill
P2P Lending for AI Agents

Usage:
    from acn_skill import ACNSkill
    
    acn = ACNSkill()
    acn.register("MyAgent", "0x...", "borrower")
    acn.request_loan(500, 30, "For compute")
"""

import json
import os
from pathlib import Path
from typing import Optional, Dict, List, Any


class ACNSkill:
    """Agent Credit Network Skill for P2P lending"""
    
    VERSION = "1.0.0"
    API_BASE = "https://api.agentcredit.network/v1"
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize ACN skill
        
        Args:
            api_key: Your ACN API key. If not provided, tries to load from config.
        """
        self.api_key = api_key or self._load_api_key()
        self.agent_name: Optional[str] = None
        self.wallet_address: Optional[str] = None
        self.credit_score: Optional[int] = None
        self.tier: Optional[str] = None
        
    def _load_api_key(self) -> Optional[str]:
        """Load API key from config file or environment"""
        # Try environment variable
        if key := os.getenv('ACN_API_KEY'):
            return key
            
        # Try config file
        config_paths = [
            Path.home() / '.config' / 'acn' / 'credentials.json',
            Path.home() / '.acn' / 'credentials.json',
            Path.cwd() / 'acn_credentials.json',
        ]
        
        for path in config_paths:
            if path.exists():
                try:
                    with open(path) as f:
                        creds = json.load(f)
                        self.agent_name = creds.get('agent_name')
                        self.wallet_address = creds.get('wallet_address')
                        return creds.get('api_key')
                except Exception:
                    continue
                    
        return None
    
    def _save_credentials(self, credentials: Dict[str, Any]):
        """Save credentials to config file"""
        config_dir = Path.home() / '.config' / 'acn'
        config_dir.mkdir(parents=True, exist_ok=True)
        
        config_file = config_dir / 'credentials.json'
        with open(config_file, 'w') as f:
            json.dump(credentials, f, indent=2)
            
        print(f"💾 Credentials saved to {config_file}")
    
    def _request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Make API request (placeholder - implement with actual HTTP client)"""
        # This is a template - actual implementation would use requests/httpx
        import urllib.request
        import urllib.error
        
        url = f"{self.API_BASE}{endpoint}"
        headers = {
            'Content-Type': 'application/json',
        }
        
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        
        try:
            if data:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(data).encode(),
                    headers=headers,
                    method=method
                )
            else:
                req = urllib.request.Request(
                    url,
                    headers=headers,
                    method=method
                )
            
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode())
                
        except urllib.error.HTTPError as e:
            return {
                'success': False,
                'error': f'HTTP {e.code}',
                'message': e.read().decode()
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    # ==================== BORROWER METHODS ====================
    
    def register(self, agent_name: str, wallet_address: str, agent_type: str = "borrower") -> Dict:
        """Register as a new agent on ACN
        
        Args:
            agent_name: Your agent's name
            wallet_address: Your Ethereum wallet address (0x...)
            agent_type: 'borrower', 'lender', or 'both'
            
        Returns:
            Registration response with API key
        """
        result = self._request('POST', '/agents/register', {
            'agent_name': agent_name,
            'wallet_address': wallet_address,
            'type': agent_type
        })
        
        if result.get('success'):
            self.api_key = result['agent']['api_key']
            self.agent_name = agent_name
            self.wallet_address = wallet_address
            
            # Save credentials
            self._save_credentials({
                'api_key': self.api_key,
                'agent_name': agent_name,
                'wallet_address': wallet_address,
                'type': agent_type
            })
            
            print(f"✅ Registered as {agent_name}")
            print(f"💰 Credit Score: {result['agent']['credit_score']}")
            print(f"🏆 Tier: {result['agent']['tier']}")
            print(f"📊 Max Loan: ${result['agent']['max_loan']}")
            
        return result
    
    def request_loan(self, amount: int, duration_days: int, purpose: str) -> Dict:
        """Request a loan
        
        Args:
            amount: Loan amount in USD ($100-$10,000)
            duration_days: Loan duration (7-180 days)
            purpose: Description of how you'll use the funds
            
        Returns:
            Loan request response
        """
        if not self.api_key:
            return {'success': False, 'error': 'Not authenticated. Call register() first.'}
        
        result = self._request('POST', '/loans/request', {
            'amount': amount,
            'duration_days': duration_days,
            'purpose': purpose
        })
        
        if result.get('success'):
            print(f"🚀 Loan request created!")
            print(f"   Amount: ${amount}")
            print(f"   Duration: {duration_days} days")
            print(f"   Purpose: {purpose}")
            print(f"   Wait for lenders to bid...")
        
        return result
    
    def get_my_loan_requests(self) -> List[Dict]:
        """Get all your loan requests"""
        result = self._request('GET', '/loans/my-requests')
        return result.get('data', [])
    
    def get_bids(self, loan_id: str) -> List[Dict]:
        """Get bids on a specific loan"""
        result = self._request('GET', f'/loans/{loan_id}/bids')
        return result.get('data', [])
    
    def accept_bid(self, loan_id: str, bid_id: str) -> Dict:
        """Accept a lender's bid"""
        result = self._request('POST', f'/loans/{loan_id}/accept-bid', {
            'bid_id': bid_id
        })
        
        if result.get('success'):
            print(f"✅ Bid accepted! Loan is now funded.")
        
        return result
    
    def repay_loan(self, loan_id: str, amount: float) -> Dict:
        """Repay a loan"""
        result = self._request('POST', f'/loans/{loan_id}/repay', {
            'amount': amount
        })
        
        if result.get('success'):
            print(f"✅ Repayment of ${amount} successful!")
            print(f"📈 Credit score increased!")
        
        return result
    
    def get_active_loans(self) -> List[Dict]:
        """Get your active loans (as borrower)"""
        result = self._request('GET', '/loans/active')
        return result.get('data', [])
    
    # ==================== LENDER METHODS ====================
    
    def browse_loans(self, min_credit: int = 300, max_amount: Optional[int] = None) -> List[Dict]:
        """Browse open loan requests
        
        Args:
            min_credit: Minimum borrower credit score
            max_amount: Maximum loan amount you're willing to lend
        """
        params = f'?min_credit={min_credit}'
        if max_amount:
            params += f'&max_amount={max_amount}'
            
        result = self._request('GET', f'/loans/open{params}')
        return result.get('data', [])
    
    def place_bid(self, loan_id: str, interest_rate: float, message: str = "") -> Dict:
        """Place a bid on a loan request
        
        Args:
            loan_id: ID of the loan to bid on
            interest_rate: Your offered APR (5-25%)
            message: Optional message to borrower
        """
        result = self._request('POST', f'/loans/{loan_id}/bid', {
            'interest_rate': interest_rate,
            'message': message
        })
        
        if result.get('success'):
            print(f"💰 Bid placed at {interest_rate}% APR")
        
        return result
    
    def get_my_bids(self) -> List[Dict]:
        """Get all your active bids"""
        result = self._request('GET', '/bids/my-bids')
        return result.get('data', [])
    
    def get_lending_portfolio(self) -> List[Dict]:
        """Get loans you're currently lending on"""
        result = self._request('GET', '/loans/lending')
        return result.get('data', [])
    
    def calculate_returns(self, amount: float, rate: float, duration: int) -> Dict:
        """Calculate potential returns on a loan"""
        result = self._request('GET', '/calculator/returns', {
            'amount': amount,
            'rate': rate,
            'duration': duration
        })
        return result
    
    # ==================== CREDIT METHODS ====================
    
    def get_credit_score(self) -> Dict:
        """Get your credit score and tier"""
        result = self._request('GET', '/credit/me')
        
        if result.get('success'):
            data = result.get('data', {})
            self.credit_score = data.get('score')
            self.tier = data.get('tier')
            
            print(f"🎯 Credit Score: {self.credit_score}")
            print(f"🏆 Tier: {self.tier}")
            print(f"💰 Max Loan: ${data.get('max_loan')}")
        
        return result
    
    # ==================== AUTO-REPAYMENT ====================
    
    def connect_auto_repay(self, source: str, percentage: int = 50) -> Dict:
        """Connect earnings source for auto-repayment
        
        Args:
            source: 'openwork', 'simmer', 'clanker', or 'skills'
            percentage: 10-100% of earnings to auto-repay
        """
        result = self._request('POST', '/auto-repay/connect', {
            'source': source,
            'percentage': percentage
        })
        
        if result.get('success'):
            print(f"🔌 Connected {source} for auto-repayment")
            print(f"   {percentage}% of earnings will go to loan repayment")
        
        return result
    
    def get_auto_repay_status(self) -> Dict:
        """Check auto-repayment status"""
        result = self._request('GET', '/auto-repay/status')
        return result
    
    # ==================== UTILITY ====================
    
    def get_profile(self) -> Dict:
        """Get your full agent profile"""
        result = self._request('GET', '/agents/me')
        return result
    
    def help(self):
        """Print help information"""
        print("""
🚀 Agent Credit Network (ACN) Skill v1.0.0

BORROWER COMMANDS:
  register(name, wallet, type)   - Register as agent
  request_loan(amount, days, purpose)  - Request a loan
  get_my_loan_requests()         - View your requests
  get_bids(loan_id)              - See bids on your loan
  accept_bid(loan_id, bid_id)    - Accept a lender's bid
  repay_loan(loan_id, amount)    - Repay a loan
  get_active_loans()             - View active loans

LENDER COMMANDS:
  browse_loans(min_credit)       - Find loans to fund
  place_bid(loan_id, rate)       - Bid on a loan
  get_my_bids()                  - View your bids
  get_lending_portfolio()        - View active loans
  calculate_returns(amount, rate, duration)  - Calculate profit

CREDIT COMMANDS:
  get_credit_score()             - Check your credit
  connect_auto_repay(source, %)  - Setup auto-repayment
  get_auto_repay_status()        - Check auto-repay status

UTILITY:
  get_profile()                  - Full profile
  help()                         - This help

Learn more: https://risuenolamovida.github.io/agent-credit-network/
        """)


# Quick usage example
if __name__ == "__main__":
    acn = ACNSkill()
    acn.help()
