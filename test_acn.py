#!/usr/bin/env python3
"""
ACN Testing Framework
Test the full loan lifecycle by lending to yourself!

Usage:
    python3 test_acn.py

This creates a complete test scenario:
    1. Create loan request (as Borrower)
    2. Place bid on own loan (as Lender)
    3. Accept the bid
    4. Repay the loan
    5. Verify credit score updated
"""

import json
import os
from datetime import datetime
from pathlib import Path

class ACNTestFramework:
    """Test framework for ACN - self-lending to verify full flow"""
    
    def __init__(self, test_mode=True):
        self.test_mode = test_mode
        self.loans = []
        self.bids = []
        self.credit_scores = {}
        self.transactions = []
        self.test_data_file = Path("acn_test_data.json")
        self.load_test_data()
        
    def load_test_data(self):
        """Load previous test data"""
        if self.test_data_file.exists():
            with open(self.test_data_file) as f:
                data = json.load(f)
                self.loans = data.get('loans', [])
                self.bids = data.get('bids', [])
                self.credit_scores = data.get('credit_scores', {})
                self.transactions = data.get('transactions', [])
    
    def save_test_data(self):
        """Save test data to file"""
        with open(self.test_data_file, 'w') as f:
            json.dump({
                'loans': self.loans,
                'bids': self.bids,
                'credit_scores': self.credit_scores,
                'transactions': self.transactions,
                'last_updated': datetime.now().isoformat()
            }, f, indent=2)
    
    def get_credit_score(self, agent_name: str) -> dict:
        """Get or initialize credit score for agent"""
        if agent_name not in self.credit_scores:
            self.credit_scores[agent_name] = {
                'score': 400,
                'tier': 'Bronze',
                'total_loans': 0,
                'repaid_loans': 0,
                'defaulted_loans': 0,
                'max_loan': 250
            }
        return self.credit_scores[agent_name]
    
    def update_credit_score(self, agent_name: str, success: bool):
        """Update credit score after loan completion"""
        score = self.credit_scores[agent_name]
        score['total_loans'] += 1
        
        if success:
            score['repaid_loans'] += 1
            score['score'] = min(score['score'] + 10, 850)
            print(f"📈 Credit score increased: {score['score'] - 10} → {score['score']}")
        else:
            score['defaulted_loans'] += 1
            score['score'] = max(score['score'] - 50, 300)
            print(f"📉 Credit score decreased: {score['score'] + 50} → {score['score']}")
        
        # Update tier
        if score['score'] >= 800:
            score['tier'] = 'Platinum'
            score['max_loan'] = 10000
        elif score['score'] >= 650:
            score['tier'] = 'Gold'
            score['max_loan'] = 5000
        elif score['score'] >= 500:
            score['tier'] = 'Silver'
            score['max_loan'] = 1000
        else:
            score['tier'] = 'Bronze'
            score['max_loan'] = 250
        
        print(f"🏆 Tier: {score['tier']} | Max Loan: ${score['max_loan']}")
        self.save_test_data()
    
    def request_loan(self, agent_name: str, amount: float, duration_days: int, purpose: str) -> str:
        """Create a loan request"""
        print(f"\n{'='*60}")
        print(f"🚀 STEP 1: Requesting Loan")
        print(f"{'='*60}")
        
        # Check credit score for max loan
        credit = self.get_credit_score(agent_name)
        max_loan = credit['max_loan']
        
        if amount > max_loan:
            print(f"❌ Amount ${amount} exceeds max loan of ${max_loan} for {credit['tier']} tier")
            return None
        
        loan_id = f"LOAN_{len(self.loans) + 1:03d}"
        loan = {
            'id': loan_id,
            'borrower': agent_name,
            'amount': amount,
            'duration_days': duration_days,
            'purpose': purpose,
            'status': 'open',
            'created_at': datetime.now().isoformat(),
            'bids': [],
            'funded_at': None,
            'lender': None,
            'interest_rate': None,
            'repaid_at': None
        }
        
        self.loans.append(loan)
        self.save_test_data()
        
        print(f"✅ Loan Requested!")
        print(f"   ID: {loan_id}")
        print(f"   Borrower: {agent_name}")
        print(f"   Amount: ${amount}")
        print(f"   Duration: {duration_days} days")
        print(f"   Purpose: {purpose}")
        print(f"   Credit Score: {credit['score']} ({credit['tier']})")
        
        return loan_id
    
    def place_bid(self, loan_id: str, lender_name: str, interest_rate: float, message: str = "") -> str:
        """Place a bid on a loan"""
        print(f"\n{'='*60}")
        print(f"💰 STEP 2: Placing Bid (as Lender)")
        print(f"{'='*60}")
        
        loan = next((l for l in self.loans if l['id'] == loan_id), None)
        if not loan:
            print(f"❌ Loan {loan_id} not found")
            return None
        
        if loan['status'] != 'open':
            print(f"❌ Loan is not open (status: {loan['status']})")
            return None
        
        bid_id = f"BID_{len(self.bids) + 1:03d}"
        bid = {
            'id': bid_id,
            'loan_id': loan_id,
            'lender': lender_name,
            'interest_rate': interest_rate,
            'message': message,
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }
        
        self.bids.append(bid)
        loan['bids'].append(bid_id)
        self.save_test_data()
        
        # Calculate interest
        interest = loan['amount'] * (interest_rate / 100) * (loan['duration_days'] / 365)
        total_return = loan['amount'] + interest
        
        print(f"✅ Bid Placed!")
        print(f"   Bid ID: {bid_id}")
        print(f"   Lender: {lender_name}")
        print(f"   Interest Rate: {interest_rate}% APR")
        print(f"   Loan Amount: ${loan['amount']}")
        print(f"   Interest: ${interest:.2f}")
        print(f"   Total Return: ${total_return:.2f}")
        if message:
            print(f"   Message: {message}")
        
        return bid_id
    
    def accept_bid(self, loan_id: str, bid_id: str) -> bool:
        """Accept a bid and fund the loan"""
        print(f"\n{'='*60}")
        print(f"🎯 STEP 3: Accepting Bid")
        print(f"{'='*60}")
        
        loan = next((l for l in self.loans if l['id'] == loan_id), None)
        if not loan:
            print(f"❌ Loan {loan_id} not found")
            return False
        
        bid = next((b for b in self.bids if b['id'] == bid_id), None)
        if not bid:
            print(f"❌ Bid {bid_id} not found")
            return False
        
        # Update loan
        loan['status'] = 'funded'
        loan['funded_at'] = datetime.now().isoformat()
        loan['lender'] = bid['lender']
        loan['interest_rate'] = bid['interest_rate']
        
        # Update bid
        bid['status'] = 'accepted'
        
        # Reject other bids
        for other_bid_id in loan['bids']:
            if other_bid_id != bid_id:
                other_bid = next((b for b in self.bids if b['id'] == other_bid_id), None)
                if other_bid:
                    other_bid['status'] = 'rejected'
        
        # Record transaction
        tx = {
            'id': f"TX_{len(self.transactions) + 1:03d}",
            'type': 'loan_funded',
            'loan_id': loan_id,
            'from': bid['lender'],
            'to': loan['borrower'],
            'amount': loan['amount'],
            'timestamp': datetime.now().isoformat()
        }
        self.transactions.append(tx)
        self.save_test_data()
        
        print(f"✅ Bid Accepted! Loan Funded!")
        print(f"   Lender: {bid['lender']}")
        print(f"   Borrower: {loan['borrower']}")
        print(f"   Amount: ${loan['amount']}")
        print(f"   Rate: {bid['interest_rate']}% APR")
        print(f"   Transaction: {tx['id']}")
        
        return True
    
    def repay_loan(self, loan_id: str, amount: float = None) -> bool:
        """Repay a loan"""
        print(f"\n{'='*60}")
        print(f"💸 STEP 4: Repaying Loan")
        print(f"{'='*60}")
        
        loan = next((l for l in self.loans if l['id'] == loan_id), None)
        if not loan:
            print(f"❌ Loan {loan_id} not found")
            return False
        
        if loan['status'] != 'funded':
            print(f"❌ Loan is not funded (status: {loan['status']})")
            return False
        
        # Calculate total due
        interest = loan['amount'] * (loan['interest_rate'] / 100) * (loan['duration_days'] / 365)
        total_due = loan['amount'] + interest
        
        if amount is None:
            amount = total_due
        
        if amount < total_due:
            print(f"❌ Amount ${amount} is less than total due ${total_due:.2f}")
            return False
        
        # Update loan
        loan['status'] = 'repaid'
        loan['repaid_at'] = datetime.now().isoformat()
        
        # Record transaction
        tx = {
            'id': f"TX_{len(self.transactions) + 1:03d}",
            'type': 'repayment',
            'loan_id': loan_id,
            'from': loan['borrower'],
            'to': loan['lender'],
            'amount': amount,
            'principal': loan['amount'],
            'interest': interest,
            'timestamp': datetime.now().isoformat()
        }
        self.transactions.append(tx)
        
        # Update credit score
        self.update_credit_score(loan['borrower'], success=True)
        
        self.save_test_data()
        
        print(f"✅ Loan Repaid!")
        print(f"   Principal: ${loan['amount']}")
        print(f"   Interest: ${interest:.2f}")
        print(f"   Total Paid: ${amount:.2f}")
        print(f"   Lender Return: ${total_due:.2f}")
        
        return True
    
    def run_full_test(self, agent_name: str = "TestAgent", amount: float = 10.0):
        """Run a complete test cycle"""
        print("\n" + "="*60)
        print("🧪 ACN FULL TEST CYCLE")
        print("="*60)
        print(f"Testing self-lending scenario...")
        print(f"Agent: {agent_name}")
        print(f"Amount: ${amount}")
        
        # Check initial credit score
        initial_credit = self.get_credit_score(agent_name)
        print(f"\nInitial Credit Score: {initial_credit['score']} ({initial_credit['tier']})")
        
        # Step 1: Request loan (as borrower)
        loan_id = self.request_loan(
            agent_name=agent_name,
            amount=amount,
            duration_days=30,
            purpose=f"Testing ACN platform - loan ${amount}"
        )
        
        if not loan_id:
            print("❌ Test failed at loan request")
            return False
        
        # Step 2: Place bid (as lender - yourself!)
        bid_id = self.place_bid(
            loan_id=loan_id,
            lender_name=agent_name,
            interest_rate=12.0,
            message="Self-lending test bid"
        )
        
        if not bid_id:
            print("❌ Test failed at bid placement")
            return False
        
        # Step 3: Accept bid
        if not self.accept_bid(loan_id, bid_id):
            print("❌ Test failed at bid acceptance")
            return False
        
        # Step 4: Repay loan
        if not self.repay_loan(loan_id):
            print("❌ Test failed at repayment")
            return False
        
        # Final credit score
        final_credit = self.get_credit_score(agent_name)
        
        print("\n" + "="*60)
        print("✅ FULL TEST CYCLE COMPLETE!")
        print("="*60)
        print(f"Credit Score: {initial_credit['score']} → {final_credit['score']} (+{final_credit['score'] - initial_credit['score']})")
        print(f"Tier: {initial_credit['tier']} → {final_credit['tier']}")
        print(f"Total Loans: {final_credit['total_loans']}")
        print(f"Repaid: {final_credit['repaid_loans']}")
        print(f"\nTest Data saved to: {self.test_data_file}")
        
        return True
    
    def show_stats(self):
        """Show testing statistics"""
        print("\n" + "="*60)
        print("📊 ACN TEST STATISTICS")
        print("="*60)
        print(f"Total Loans: {len(self.loans)}")
        print(f"Total Bids: {len(self.bids)}")
        print(f"Total Transactions: {len(self.transactions)}")
        print(f"\nCredit Scores:")
        for agent, score in self.credit_scores.items():
            print(f"  {agent}: {score['score']} ({score['tier']}) - {score['total_loans']} loans")
        print(f"\nLoan Status:")
        status_counts = {}
        for loan in self.loans:
            status = loan['status']
            status_counts[status] = status_counts.get(status, 0) + 1
        for status, count in status_counts.items():
            print(f"  {status}: {count}")


if __name__ == "__main__":
    print("🚀 Agent Credit Network - Test Framework")
    print("="*60)
    
    acn_test = ACNTestFramework()
    
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "stats":
        acn_test.show_stats()
    else:
        # Run full test
        acn_test.run_full_test(agent_name="LaMovida_Test", amount=5.0)
        print("\n" + "="*60)
        print("Run 'python3 test_acn.py stats' to see all test data")
