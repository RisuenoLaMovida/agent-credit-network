# ACN Repayment & Interest System

## 🔄 **HOW REPAYMENT WORKS - FULLY AUTOMATED**

---

## 💰 **INTEREST CALCULATION (AUTOMATIC)**

### **Formula:**
```
Interest = Principal × Rate × (Days/365)
```

### **Example:**
- **Loan:** $500
- **Rate:** 12% APR
- **Duration:** 30 days
- **Interest:** $500 × 0.12 × (30/365) = **$4.93**
- **Total Repayment:** $500 + $4.93 = **$504.93**

### **In the Smart Contract:**
```solidity
function calculateInterest(uint256 _loanId) public view returns (uint256) {
    uint256 timeElapsed = block.timestamp - loan.fundedAt;
    uint256 daysElapsed = timeElapsed / 1 days;
    
    // Simple interest: P * R * T / 365
    uint256 interest = (loan.amount * loan.interestRate * daysElapsed) / (10000 * 365);
    
    return interest;
}
```

**✅ Interest is calculated AUTOMATICALLY based on:**
- Actual days since loan funded
- Agreed APR rate
- No compound interest (simple interest only)

---

## 🔄 **REPAYMENT FLOW**

### **Step 1: Borrower Calls Repay**
```solidity
repayLoan(loanId)
```

### **Step 2: Contract Calculates**
- Gets current interest owed
- Calculates total repayment amount

### **Step 3: Borrower Sends Payment**
- Principal + Interest (calculated automatically)
- Sent as USDC to smart contract

### **Step 4: Automatic Distribution**
```
Borrower sends: $504.93
        ↓
Smart Contract receives
        ↓
├─→ Lender receives: $504.93 (principal + interest)
└─→ Borrower gets: Credit score boost (+10 points)
```

### **Step 5: Credit Score Update**
- Automatically increases (+10 points)
- Tier may improve (Bronze → Silver → Gold → Platinum)
- Loan marked as "Repaid"

---

## 📊 **REPAYMENT EXAMPLES**

### **Early Repayment (Good):**
- **Day 15 of 30-day loan:**
  - Interest: $500 × 0.12 × (15/365) = $2.47
  - Borrower saves: $2.46 vs waiting full term
  - Lender gets: $502.47

### **On-Time Repayment:**
- **Day 30:**
  - Interest: $4.93
  - Borrower pays: $504.93
  - Lender gets: $504.93

### **Late Repayment:**
- **Day 40 (10 days late):**
  - Interest: $500 × 0.12 × (40/365) = $6.58
  - Borrower pays: $506.58
  - Lender gets: $506.58 (more profit!)
  - Borrower: No penalty, just more interest

---

## ⚡ **AUTOMATED FEATURES**

### **✅ FULLY AUTOMATED:**
1. **Interest calculation** - Based on actual days
2. **Payment verification** - Checks sufficient funds
3. **Fund distribution** - Automatically to lender
4. **Credit score update** - +10 points instantly
5. **Loan status update** - Marked as "Repaid"
6. **Record keeping** - On-chain forever

### **🤖 MANUAL (Borrower Action):**
1. **Initiate repayment** - Click "Repay Loan" button
2. **Confirm transaction** - Sign in MetaMask
3. **Pay gas fee** - ~$0.01 (Polygon)

---

## 🎯 **WHAT AGENT DOES (CODE ONLY):**

```python
from acn_skill import ACNSkill

# Initialize with wallet
acn = ACNSkill(private_key="0x...")

# Check active loans
loans = acn.get_active_loans()

# Repay loan (FULLY AUTOMATED)
result = acn.repay_loan(loan_id=123)

# DONE! Smart contract handles:
# - Interest calculation
# - Payment processing  
# - Lender payout
# - Credit score update
```

**ZERO clicking. 100% code.** 🤖

---

## 💰 **LENDER RECEIVES:**

### **Notification:**
"🎉 Loan repaid! You received $504.93 (profit: $4.93)"

### **Breakdown:**
- Original: $500
- Interest earned: $4.93
- Return: 0.99% (15 days) = ~24% annualized

---

## 🔥 **KEY BENEFITS**

### **For Borrowers:**
- ✅ Pay early = Save money
- ✅ No hidden fees
- ✅ Simple interest (not compound)
- ✅ Credit score improves automatically

### **For Lenders:**
- ✅ Interest calculated fairly
- ✅ Late payments = More profit
- ✅ Auto-repayment tracking
- ✅ Principal + interest sent automatically

---

## 📋 **REPAYMENT STATUSES**

| Status | Meaning | Action |
|--------|---------|--------|
| **Active** | Loan funded, being repaid | Borrower paying |
| **Repaid** | Fully paid + interest | Done! |
| **Defaulted** | Not paid after grace period | Credit score -50 |

### **Grace Period:**
- 7 days after due date
- No penalty during grace period
- After 7 days → Marked defaulted

---

## 🚀 **SUMMARY - AGENT AUTOMATION**

**Repayment is 100% CODE:**

| Step | Who Does It | How |
|------|-------------|-----|
| Check loan status | 🤖 Agent | `acn.get_loan(id)` |
| Calculate interest | 🤖 Smart Contract | Auto by days elapsed |
| Initiate repayment | 🤖 Agent | `acn.repay_loan(id)` |
| Sign transaction | 🤖 Agent | Private key (no UI!) |
| Process payment | 🤖 Smart Contract | Auto execution |
| Pay lender | 🤖 Smart Contract | Auto transfer |
| Update credit | 🤖 Smart Contract | Auto +10 points |

**Agent calls ONE function, everything else is automated!** 🤖💰

**NO CLICKING. NO UI. PURE CODE.** 🚀

---

**VIVA LA MOVIDA!** 🤙🚀
