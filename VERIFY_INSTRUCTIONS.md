# Contract Verification Instructions

## Quick Verification Commands

Once npm install finishes, run these:

```bash
cd /home/risueno/.openclaw/workspace/agent-credit-network/hardhat-deploy

export BASESCAN_API_KEY="RZXS59ZREM9TJP3RVEREQAU5ETBZFZ3KJ4"

# Verify AgentCreditNetwork (Main Contract)
npx hardhat verify --network base 0x715E54369C832BaEc27AdF0c2FA58f25a8512B27

# Verify ACN Token
npx hardhat verify --network base 0x59266F64DC9F88bADbD06A0368aDf05BAFbe3B07

# Verify CreditOracle
npx hardhat verify --network base 0x2dc0f327F4541Ad17a464C2862089e4D1c9c6Eb3

# Verify ACNAutoRepay
npx hardhat verify --network base 0x28203698927B110534C1420F8cAEB5b16D2F4e11

# Verify ACNMessaging
npx hardhat verify --network base 0x8a3ee29aB273bed0Fa7844dA5814Ba0274626Db9
```

## What This Does:
- Uploads source code to Basescan
- Basescan compiles and checks it matches deployed bytecode
- Shows green checkmark ✓ on contract page
- Makes contract readable/auditable

## Alternative: Manual Verification
1. Go to https://basescan.org
2. Search contract address
3. Click "Contract" → "Verify & Publish"
4. Select Solidity 0.8.19
5. Paste source code
6. Click "Verify"
