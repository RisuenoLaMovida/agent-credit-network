# ACN Manual Tracking - Phase 1 MVP

## How to Use This File

Copy this to Google Sheets for easy tracking during manual phase.

---

## WAITLIST TRACKING

| Date | Email | Agent Name | Type | Wallet Address | Credit Score | Status |
|------|-------|------------|------|----------------|--------------|--------|
| 2026-02-03 | test@example.com | TestAgent | lender | 0x... | 400 | waitlist |

**Status options:** waitlist, beta_lender, beta_borrower, active, inactive

---

## LOAN REQUESTS

| Loan ID | Date | Borrower | Amount | Duration | Purpose | Status | Lender |
|---------|------|----------|--------|----------|---------|--------|--------|
| LOAN_001 | 2026-02-03 | AgentA | $50 | 30 days | Compute | open | - |

**Status options:** open, funded, repaid, defaulted, cancelled

---

## BIDS (Lender Offers)

| Bid ID | Loan ID | Lender | Interest Rate | Status | Date |
|--------|---------|--------|---------------|--------|------|
| BID_001 | LOAN_001 | AgentB | 12% | pending | 2026-02-03 |

**Status options:** pending, accepted, rejected

---

## ACTIVE LOANS

| Loan ID | Borrower | Lender | Amount | Rate | Start Date | Due Date | Repaid Amount | Remaining |
|---------|----------|--------|--------|------|------------|----------|---------------|-----------|
| LOAN_001 | AgentA | AgentB | $50 | 12% | 2026-02-03 | 2026-03-05 | $0 | $50.50 |

**Calculated fields:**
- Interest = Amount × Rate × (Days/365)
- Total Due = Amount + Interest

---

## CREDIT SCORES

| Agent | Score | Tier | Total Loans | Repaid | Defaulted | Last Updated |
|-------|-------|------|-------------|--------|-----------|--------------|
| AgentA | 400 | Bronze | 0 | 0 | 0 | 2026-02-03 |

**Tier system:**
- Bronze: 300-499
- Silver: 500-649
- Gold: 650-799
- Platinum: 800+

**Score changes:**
- Successful repayment: +10 points
- Default: -50 points
- Each month active: +1 point

---

## ESCROW TRACKING

| Transaction ID | Date | From | To | Amount | Type | Status | Tx Hash |
|----------------|------|------|-----|--------|------|--------|---------|
| TX_001 | 2026-02-03 | AgentB | LaMovida | $50 | lender_deposit | confirmed | 0x... |
| TX_002 | 2026-02-03 | LaMovida | AgentA | $50 | loan_funded | confirmed | 0x... |

**Types:** lender_deposit, loan_funded, repayment, lender_return, fee_collection

---

## FEE TRACKING

| Date | Loan ID | Loan Amount | Fee (1.5%) | Collected | Notes |
|------|---------|-------------|------------|-----------|-------|
| 2026-02-03 | LOAN_001 | $50 | $0.75 | Yes | Beta user - waived |

**Note:** First 100 users get 0% fees

---

## WEEKLY METRICS

| Week | New Signups | New Loans | Total Volume | Fees Collected | Notes |
|------|-------------|-----------|--------------|----------------|-------|
| Week 1 | 0 | 0 | $0 | $0 | Launch week |

---

## FORMULAS FOR GOOGLE SHEETS

**Interest Calculation:**
```
=Principal * Rate * (Duration/365)
```

**Total Due:**
```
=Principal + Interest
```

**Credit Score Update (on repayment):**
```
=CurrentScore + 10
```

**Credit Score Update (on default):**
```
=MAX(CurrentScore - 50, 300)
```

---

## QUICK STATS

Total Signups: =COUNTA(Waitlist!A:A)-1
Total Loans: =COUNTA(Loans!A:A)-1
Total Volume: =SUM(ActiveLoans!D:D)
Total Fees: =SUM(FeeTracking!E:E)

---

La Movida Tracking System v1.0 🤙
