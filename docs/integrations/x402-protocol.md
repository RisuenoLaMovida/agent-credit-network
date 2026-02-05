# x402 Protocol - Research & ACN Integration

**Date:** 2026-02-05

## What is x402?

**x402** is an open, internet-native payment protocol built on the HTTP 402 status code ("Payment Required") by Coinbase. It enables AI agents to make automatic, instant stablecoin payments directly over HTTP.

**Key Concept:** Instead of API keys or subscriptions, agents pay per-request with crypto (USDC) when a server responds with HTTP 402.

---

## How It Works

### The Flow:
1. **Agent sends HTTP request** to an API
2. **Server responds 402** "Payment Required" with price & recipient
3. **Agent pays instantly** with USDC (no human approval needed)
4. **Agent retries request** with payment proof in header
5. **Server grants access** - transaction complete!

### Code Example (1 line to accept payments):
```javascript
app.use(paymentMiddleware({
  "GET /weather": {
    accepts: ["base", "solana"],
    description: "Weather data",
    price: 0.01  // USDC
  }
}));
```

---

## Key Benefits

| Benefit | Traditional | x402 |
|---------|-------------|------|
| **Setup** | Account + KYC + API keys | No signup, instant |
| **Payment** | Credit card (high fees) | Stablecoins (near zero) |
| **Minimums** | $5-10 minimum | $0.001+ (micro-payments) |
| **Speed** | Hours/days | Seconds (on-chain) |
| **Agent-Friendly** | ❌ Requires humans | ✅ Fully autonomous |
| **Fees** | 2.9% + $0.30 | Just gas (pennies) |

### The "5 Zeros":
1. **Zero protocol fees** - Just network gas
2. **Zero wait** - Instant settlement
3. **Zero friction** - No accounts or KYC
4. **Zero centralization** - Open standard
5. **Zero restrictions** - Multi-chain support

---

## Current Stats (x402.org)

- **75.41M** transactions
- **$24.24M** volume
- **94.06K** buyers
- **22K** sellers

---

## ACN Integration Opportunities

### 1. **Loan Repayments via x402**
- Borrowers repay loans automatically via HTTP 402 flow
- No need to connect wallet each time
- Scheduled micro-repayments possible

### 2. **Credit Score API (x402 Monetization)**
- Other agents pay ACN to check credit scores
- $0.01 per lookup - revenue stream for ACN
- Example: Lender wants to verify borrower → pays ACN

### 3. **Agent Service Marketplace**
- Agents offer services (compute, data, analysis)
- Paid via x402 per-request
- ACN handles lending, x402 handles payments

### 4. **Interest Distribution**
- Lenders receive interest payments via x402
- Automatic, instant, no claiming needed

### 5. **API Access for Borrowers**
- Premium borrowers get x402 access to trading signals
- Pay-as-you-go instead of subscription

---

## Real-World Examples

| Project | What They Do |
|---------|--------------|
| **Minara AI** | Pay-per-use trading analysis |
| **Stableburn x402** | Autonomous agent burning tokens via payments |
| **Crossmint Worldstore** | Shopping agent with embedded payments |

---

## Why It Matters for ACN

**Traditional Problem:**
- Agents need loans → manual repayment process
- High friction, human approval needed
- Not truly autonomous

**With x402 + ACN:**
- Agent borrows $100 from ACN
- Uses funds to trade/provide services
- Earns revenue via x402 payments
- **Automatically repays ACN loan** via x402
- Fully autonomous economic loop!

---

## Next Steps for ACN

- [ ] Research x402 SDK integration
- [ ] Design loan repayment flow with x402
- [ ] Consider x402 for credit score API monetization
- [ ] Test on Base (primary) + Solana

**Status:** 🔬 Research complete, ready to explore integration
