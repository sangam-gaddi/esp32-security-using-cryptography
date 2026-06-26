# 🛡️ Secure Web3 ESP32 OTA Updates

An end-to-end, cryptographically secure Over-The-Air (OTA) firmware update system for the ESP32. This project combines embedded C, Next.js, and Ethereum Smart Contracts to ensure that IoT devices only boot authentic, untampered firmware.

---

## 📖 Architecture Overview

This project consists of three main pillars:
1. **`smart-contracts/`**: A Solidity smart contract deployed to the Ethereum Sepolia Testnet. It acts as an immutable, decentralized registry that stores the authentic `SHA-256` hashes of firmware releases.
2. **`dashboard/`**: A Next.js web application that serves as the Admin UI. It allows you to automatically configure the device, encrypt & sign `.bin` payloads, publish hashes to the blockchain, and interact with an AI Security Sentinel.
3. **`firmware/`**: The ESP-IDF C code running on the ESP32. It downloads encrypted firmware, decrypts it using AES-128-CTR, verifies the payload hash against the Web3 Smart Contract, and securely reboots into the new partition.

---

## 🚀 Step-by-Step Quick Start

### Step 1: Deploy the Smart Contract
You need to deploy the registry contract to the Sepolia Testnet.

```bash
cd smart-contracts
npm install
```
*Note: You need a Sepolia private key with testnet ETH. If you don't have it in your `.env` yet, the dashboard can configure it later, but you need it to deploy the contract initially.*

```bash
# Run the deployment script
node scripts/deploy_raw.js
```
**Important:** Copy the **Contract Address** outputted in your terminal. You will need it in the next step.

### Step 2: Run the Admin Dashboard & Auto-Configure
The dashboard features an automatic local-project configurator. 

```bash
cd ../dashboard
npm install
npm run dev
```
Open your browser to [http://localhost:3000](http://localhost:3000).

1. Click on the **Device Setup** tab.
2. Set your **Project Root Path** (Usually `../`).
3. Enter your **WiFi SSID** and **WiFi Password**.
4. Paste the **Smart Contract Address** you got from Step 1.
5. Enter your **Sepolia Private Key**.
6. Click **Apply Configuration to Local Project**. 

*Magic happens here:* The dashboard will automatically scan your `firmware/main/main.c` and `smart-contracts/.env` files and inject these variables directly into your code!

### Step 3: Build and Flash the ESP32 Firmware
Now that the firmware is configured with your WiFi and Contract Address, it's time to build it using the **ESP-IDF framework**.

```bash
cd ../firmware

# 1. Activate your ESP-IDF environment (depends on your OS)
# Windows (Command Prompt): %userprofile%\esp\esp-idf\export.bat
# Windows (PowerShell): $HOME\esp\esp-idf\export.ps1
# Linux/Mac: . $HOME/esp/esp-idf/export.sh

# 2. Set the target to your specific chip
idf.py set-target esp32

# 3. Build the firmware
idf.py build

# 4. Flash it to the board and monitor the logs
# Replace COM3 with your actual serial port (e.g., /dev/ttyUSB0 on Linux)
idf.py -p COM3 flash monitor
```

---

## 📦 How to Publish a Secure OTA Update

Once your ESP32 is running, you can publish an update over the air!

1. Make a change to your ESP32 code in `main.c` (e.g., change a `printf` statement).
2. Rebuild the code to generate a new `.bin` file:
   ```bash
   idf.py build
   ```
3. Open the Dashboard ([http://localhost:3000](http://localhost:3000)) and go to the **Publish Firmware** tab.
4. Drag and drop the newly generated `build/firmware.bin` file.
5. Click **Encrypt & Sign**. 
   - *This generates cryptographic keys and encrypts the payload.*
   - **Download the `ota_keys.h`** file when prompted, and move it into your `firmware/main/` directory.
6. Click **Publish to Web3**.
   - *Your MetaMask wallet will pop up. Confirm the transaction to publish the secure `SHA-256` hash of this update to the Sepolia blockchain.*
7. Your ESP32 (which should be monitoring the contract) will detect the new version, download the encrypted payload, decrypt it, verify the hash against the blockchain, and securely reboot!

---

## 🔒 Security Cryptography Details

- **Confidentiality (AES-128-CTR):** Firmware payloads are encrypted before transmission. Even if an attacker intercepts the WiFi traffic or the download URL, they only see garbled ciphertext.
- **Integrity (SHA-256):** The ESP32 calculates the SHA-256 hash of the decrypted payload stream.
- **Authenticity (Web3 / ECDSA):** The ESP32 queries the Ethereum Smart Contract for the *trusted* hash. If the local hash does not match the blockchain's immutable record, the OTA update is immediately aborted, protecting the device from malicious payloads.
- **AI Sentinel:** The dashboard features an integrated AI agent that analyzes unauthorized/malicious firmware attempts and provides real-time cybersecurity heuristics.
