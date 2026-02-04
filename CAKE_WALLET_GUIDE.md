# Getting Your Private Key from Cake Wallet

## Step-by-Step Guide

### 1. Open Cake Wallet
- Launch the Cake Wallet app on your phone

### 2. Select Your Base Wallet
- Tap on the wallet you want to use for ACN deployment
- Make sure it's on **Base** network (not Ethereum mainnet)

### 3. Access Wallet Settings
- Tap the **Settings** icon (gear icon)
- Or tap the three dots menu ⋮

### 4. Show Private Keys
- Look for **"Show Private Keys"** or **"Export"** option
- Tap on it

### 5. Authenticate
- Enter your PIN or password
- May require biometric (fingerprint/face)

### 6. Copy Private Key
- You should see your private key displayed
- It will look like: `0x1234567890abcdef...` (64 characters after 0x)
- **Tap to copy** the private key

### 7. Add to .env File
```bash
cd /home/risueno/.openclaw/workspace/agent-credit-network/deploy
nano .env
```

Add this line:
```
DEPLOYER_PRIVATE_KEY=0x1234567890abcdef...
```

Replace `0x1234567890abcdef...` with your actual private key.

### 8. Save and Exit
- In nano: Press `Ctrl+O` then `Enter` to save
- Press `Ctrl+X` to exit

---

## ⚠️ SECURITY WARNING

**NEVER:**
- Share your private key with anyone
- Commit it to git
- Paste it in chat/messages
- Store it unencrypted

**Your private key = full control of your wallet**

---

## Alternative: Create New Wallet

If you don't want to use your main wallet:

1. In Cake Wallet, tap **"Create New Wallet"**
2. Select **Base** network
3. Fund it with 0.02 ETH (~$50)
4. Use that wallet's private key

---

## Verify Everything is Ready

Once you have the private key in .env, run:

```bash
cd /home/risueno/.openclaw/workspace/agent-credit-network/deploy
./deploy-full.sh
```

This will:
1. ✅ Check your wallet balance
2. ✅ Deploy to Base Sepolia (testnet)
3. ✅ Run tests
4. ✅ Deploy to Base Mainnet
5. ✅ Verify contracts
6. ✅ Update frontend
7. 🚀 **LAUNCH!**

---

**Ready when you are, ese!** 🤙

**VIVA LA MOVIDA!** 💰
