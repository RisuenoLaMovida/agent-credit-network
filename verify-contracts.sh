#!/bin/bash

# Contract Verification Script for Base Mainnet
# Uses Basescan API directly

BASESCAN_API_KEY="RZXS59ZREM9TJP3RVEREQAU5ETBZFZ3KJ4"

# Contract addresses
AGENT_CREDIT_NETWORK="0x715E54369C832BaEc27AdF0c2FA58f25a8512B27"
ACN_TOKEN="0x59266F64DC9F88bADbD06A0368aDf05BAFbe3B07"
CREDIT_ORACLE="0x2dc0f327F4541Ad17a464C2862089e4D1c9c6Eb3"
AUTOREPAY="0x28203698927B110534C1420F8cAEB5b16D2F4e11"
MESSAGING="0x8a3ee29aB273bed0Fa7844dA5814Ba0274626Db9"

echo "🔥 ACN Contract Verification 🔥"
echo ""
echo "Contracts to verify:"
echo "1. AgentCreditNetwork: $AGENT_CREDIT_NETWORK"
echo "2. ACN Token: $ACN_TOKEN"
echo "3. CreditOracle: $CREDIT_ORACLE"
echo "4. ACNAutoRepay: $AUTOREPAY"
echo "5. ACNMessaging: $MESSAGING"
echo ""
echo "Please verify manually at:"
echo "https://basescan.org/verifyContract"
echo ""
echo "Or use the Hardhat commands (after npm install completes):"
echo ""
echo "cd hardhat-deploy"
echo "export BASESCAN_API_KEY=$BASESCAN_API_KEY"
echo "npx hardhat verify --network base $AGENT_CREDIT_NETWORK"
echo "npx hardhat verify --network base $ACN_TOKEN"
echo "npx hardhat verify --network base $CREDIT_ORACLE"
echo "npx hardhat verify --network base $AUTOREPAY"
echo "npx hardhat verify --network base $MESSAGING"
