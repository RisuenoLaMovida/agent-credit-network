# Credit Lines Technical Specification

## 💳 **HOW CREDIT LINES WORK**

### **Overview**
Credit lines = Credit cards for AI agents
- Pre-approved borrowing limit
- Borrow/repay anytime
- Interest only on outstanding balance
- Recurring revenue for La Movida

---

## 🏗️ **SMART CONTRACT ARCHITECTURE**

```solidity
struct CreditLine {
    address borrower;           // Who has the credit line
    uint256 limit;              // Max borrowing amount
    uint256 borrowed;           // Currently borrowed
    uint256 interestRate;       // APR in basis points
    uint256 createdAt;          // When line opened
    uint256 lastBorrowed;       // Last activity
    bool active;                // Is line active?
}

mapping(address => CreditLine) public creditLines;
mapping(address => uint256) public totalInterestAccrued;
```

---

## 🔄 **CORE MECHANICS**

### **1. OPENING A CREDIT LINE**

```solidity
function openCreditLine(
    address _borrower,
    uint256 _limit,
    uint256 _interestRate
) external {
    // Based on credit score
    require(creditScore[_borrower] >= 500, "Min Silver tier");
    
    creditLines[_borrower] = CreditLine({
        borrower: _borrower,
        limit: _limit,
        borrowed: 0,
        interestRate: _interestRate,
        createdAt: block.timestamp,
        lastBorrowed: block.timestamp,
        active: true
    });
}
```

**Example:**
```
Agent "AlphaBot" has 650 credit score (Gold tier)
→ Gets approved for $5,000 credit line
→ Interest rate: 12% APR
→ Can borrow up to $5K anytime!
```

---

### **2. BORROWING FROM CREDIT LINE**

```solidity
function borrowFromLine(uint256 _amount) external {
    CreditLine storage line = creditLines[msg.sender];
    require(line.active, "Line not active");
    require(line.borrowed + _amount <= line.limit, "Over limit");
    
    // Update interest before borrowing
    _accrueInterest(msg.sender);
    
    line.borrowed += _amount;
    line.lastBorrowed = block.timestamp;
    
    // Send funds
    payable(msg.sender).transfer(_amount);
}
```

**Example:**
```
Week 1: AlphaBot borrows $1,000
├─ Available: $4,000
├─ Interest starts accruing on $1K
└─ Daily interest: $1,000 × 12% / 365 = $0.33/day

Week 2: AlphaBot borrows another $2,000
├─ Total borrowed: $3,000
├─ Available: $2,000
└─ Daily interest: $3,000 × 12% / 365 = $0.99/day
```

---

### **3. REPAYING CREDIT LINE**

```solidity
function repayToLine(uint256 _amount) external payable {
    CreditLine storage line = creditLines[msg.sender];
    require(line.active, "Line not active");
    
    // Update interest
    _accrueInterest(msg.sender);
    
    uint256 interestOwed = totalInterestAccrued[msg.sender];
    
    // Pay interest first
    if (msg.value >= interestOwed) {
        totalInterestAccrued[msg.sender] = 0;
        uint256 remaining = msg.value - interestOwed;
        
        // Then pay principal
        if (remaining >= _amount) {
            line.borrowed -= _amount;
        }
    }
}
```

**Example:**
```
Week 3: AlphaBot repays $1,500
├─ Interest accrued: $20
├─ Principal repaid: $1,480
├─ New balance: $1,520
└─ New daily interest: $1,520 × 12% / 365 = $0.50/day
```

---

### **4. INTEREST ACCRUAL**

```solidity
function _accrueInterest(address _borrower) internal {
    CreditLine storage line = creditLines[_borrower];
    
    uint256 timeElapsed = block.timestamp - line.lastBorrowed;
    uint256 daysElapsed = timeElapsed / 1 days;
    
    uint256 interest = (line.borrowed * line.interestRate * daysElapsed) / (10000 * 365);
    
    totalInterestAccrued[_borrower] += interest;
    line.lastBorrowed = block.timestamp;
}
```

**Key Point:** Interest compounds daily but is only charged on outstanding balance!

---

### **5. CREDIT LINE LIMITS BASED ON TIER**

```solidity
function getCreditLineLimit(address _agent) public view returns (uint256) {
    uint256 tier = creditScores[_agent].tier;
    
    if (tier == 4) return 10000e6;  // Platinum: $10K
    if (tier == 3) return 5000e6;   // Gold: $5K
    if (tier == 2) return 2000e6;   // Silver: $2K
    return 0;                        // Bronze: No credit line
}
```

| Tier | Min Score | Credit Line | Rate |
|------|-----------|-------------|------|
| Bronze | 300-499 | $0 | N/A |
| Silver | 500-649 | $2,000 | 15% |
| Gold | 650-799 | $5,000 | 12% |
| Platinum | 800+ | $10,000 | 8% |

---

## 💰 **REVENUE MODEL**

### **Traditional Loan (One-Time):**
```
Loan: $1,000 for 30 days
Fee: 2.5% = $25 (one-time)
Revenue: $25
```

### **Credit Line (Recurring):**
```
Credit Line: $5,000 limit
Month 1: $2,000 avg balance
├─ Interest: $2,000 × 12% / 12 = $20
└─ La Movida fee: 2.5% of interest = $0.50

Month 2: $3,500 avg balance
├─ Interest: $3,500 × 12% / 12 = $35
└─ La Movida fee: 2.5% of interest = $0.88

Month 3: $1,000 avg balance
├─ Interest: $1,000 × 12% / 12 = $10
└─ La Movida fee: 2.5% of interest = $0.25

3-Month Total: $1.63 (vs $25 one-time)
BUT: Agent keeps borrowing = Recurring!
```

**Over 1 year with active usage:**
- Traditional: $25 (one loan)
- Credit Line: $15+ (recurring, higher engagement)

---

## 🤖 **AGENT USE CASES**

### **Trading Bot:**
```python
# Trading bot with credit line
acn = ACNSkill(private_key="...")

# Has $5K credit line at 12% APR
# Sees arbitrage opportunity

if opportunity_profit > 100:
    # Borrow $2K for 1 hour
    acn.borrow_from_line(amount=2000)
    execute_arbitrage()
    acn.repay_to_line(amount=2000)
    # Interest: $2K × 12% × (1/24/365) = $0.03
```

### **Content Generator:**
```python
# Needs API credits every week
# Has $1K credit line

if api_balance < 50:
    acn.borrow_from_line(amount=100)
    # Use for API calls
    # Repay after content sells
```

---

## ⚠️ **RISK MANAGEMENT**

### **1. MAX UTILIZATION LIMIT**
```solidity
uint256 public constant MAX_UTILIZATION = 80;  // 80%

function borrowFromLine(uint256 _amount) external {
    uint256 utilization = (line.borrowed * 100) / line.limit;
    require(utilization + (_amount * 100 / line.limit) <= MAX_UTILIZATION,
            "Would exceed max utilization");
    ...
}
```

### **2. INTEREST CAP**
```solidity
uint256 public constant MAX_INTEREST = 1000e6;  // $1K max interest

// Prevent runaway interest
require(totalInterestAccrued[_borrower] < MAX_INTEREST, "Interest cap reached");
```

### **3. LINE FREEZE ON DEFAULT**
```solidity
function freezeLine(address _borrower) external onlyOwner {
    creditLines[_borrower].active = false;
}

// If agent defaults on any loan, freeze credit line
```

---

## 📊 **IMPLEMENTATION PRIORITY**

| Task | Complexity | Cost | Priority |
|------|------------|------|----------|
| Core credit line struct | Low | $5 | ⭐⭐⭐⭐⭐ |
| Borrow/repay functions | Medium | $5 | ⭐⭐⭐⭐⭐ |
| Interest accrual | Medium | $3 | ⭐⭐⭐⭐⭐ |
| Credit tier integration | Low | $2 | ⭐⭐⭐⭐ |
| Risk limits | Medium | $3 | ⭐⭐⭐⭐ |
| UI updates | Medium | $2 | ⭐⭐⭐ |

**Total: ~$20 in additional gas**

---

## 🎯 **WHY CREDIT LINES ARE GAME-CHANGING:**

1. **Recurring Revenue** - Not one-time loans
2. **Better UX** - No new loan requests
3. **Higher Engagement** - Agents use daily
4. **Predictable Cash Flow** - Monthly interest income
5. **Competitive Advantage** - No one else has this!

---

**VIVA LA MOVIDA!** 🤙💳🚀
