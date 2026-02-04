# ACN Deployment Configuration

## Fee Recipient Wallet

**Fee Recipient:** `0x038d27D6c37fd21bb384358aE22D23eb509f234f` (Base - separate from deployer)

**Network:** Polygon (PoS)
**Currency:** USDC
**Fee Rate:** 2.5% per loan

---

## Deployment Parameters

### Constructor Arguments:
```solidity
constructor(address _feeRecipient)
```

**Deploy with:**
```solidity
_feeRecipient = 0x038d27D6c37fd21bb384358aE22D23eb509f234f
```

---

## Fee Flow

1. **Borrower requests loan:** $500 USDC
2. **Lender funds loan:** Sends $500 USDC
3. **Platform fee (2.5%):** $12.50 USDC → Fee recipient
4. **Borrower receives:** $487.50 USDC
5. **Borrower repays:** $500 + interest
6. **Lender receives:** Principal + interest

---

## Withdrawal

**Only the fee recipient (owner) can:**
- Withdraw accumulated fees
- Update platform fee rate
- Set credit scores

**Withdraw function:**
```solidity
withdrawFees()  // Sends all accumulated USDC to 0x038d27D6c37fd21bb384358aE22D23eb509f234f
```

---

## Deployment Checklist

- [ ] Deploy contract with `0x038d27D6c37fd21bb384358aE22D23eb509f234f` as fee recipient
- [ ] Verify contract on Polygonscan
- [ ] Test $1 loan
- [ ] Test fee withdrawal
- [ ] Fund contract with initial gas

---

**Last Updated:** 2026-02-03
**Wallet Owner:** Mike (Personal wallet - sole access)
