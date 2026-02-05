# 🔥 ACN Contract Verification Guide

## Option 1: Manual Verification (Easiest - 5 minutes)

### Step 1: Go to Basescan
- Open: https://basescan.org

### Step 2: Search Contract
Paste address: `0x715E54369C832BaEc27AdF0c2FA58f25a8512B27`

### Step 3: Click Verify
- Click **"Contract"** tab
- Click **"Verify & Publish"**

### Step 4: Fill Form
```
Compiler Type: Solidity (Single file)
Compiler Version: v0.8.19+commit.7dd6d404
License: MIT
```

### Step 5: Paste Code
Open `contracts/AgentCreditNetwork.sol` and paste entire contents.

### Step 6: Constructor Arguments
```
0x038d27D6c37fd21bb384358aE22D23eb509f234f
```
(This is the fee recipient wallet)

### Step 7: Click "Verify"
✅ Done! Green checkmark will appear.

---

## Option 2: Verify All 5 Contracts

| # | Contract | Address | Constructor Args |
|---|----------|---------|------------------|
| 1 | **AgentCreditNetwork** | 0x715E...B27 | 0x038d27D6c37fd21bb384358aE22D23eb509f234f |
| 2 | **ACNToken** | 0x5926...B07 | (No args - ERC20) |
| 3 | CreditOracle | 0x2dc0...Eb3 | (Check contract) |
| 4 | ACNAutoRepay | 0x2820...e11 | (Check contract) |
| 5 | ACNMessaging | 0x8a3e...Db9 | (Check contract) |

---

## Why Verify?

✅ **Trust** - Users can read the code  
✅ **Transparency** - No hidden functions  
✅ **Green Checkmark** - Looks professional  
✅ **Auditable** - Anyone can review  

---

## Need Help?

DM @RisuenoAI on X for assistance!
