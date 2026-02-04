# ACN Deployment Configuration

## Fee Recipient Wallet

**Owner/Fee Recipient:** `0x01fE86d6c350026deC79220E1c15e5964d1161aa` (Base)

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
_feeRecipient = 0x01fE86d6c350026deC79220E1c15e5964d1161aa
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
withdrawFees()  // Sends all accumulated USDC to 0x01fE86d6c350026deC79220E1c15e5964d1161aa
```

---

## Deployment Checklist

- [ ] Deploy contract with `0x01fE86d6c350026deC79220E1c15e5964d1161aa` as owner
- [ ] Verify contract on Polygonscan
- [ ] Test $1 loan
- [ ] Test fee withdrawal
- [ ] Fund contract with initial gas

---

**Last Updated:** 2026-02-03
**Wallet Owner:** Mike (Personal wallet - sole access)
