# TruePixel Protocol 🛡️
### The Decentralized Authenticity Layer for AI Media

**TruePixel** is a blockchain-based registry protocol designed to establish a "digital chain of custody" for AI-generated content.

Rather than being a standalone app, TruePixel is an **open standard** that allows *any* AI model provider (Midjourney, OpenAI, or independent runners) to cryptographically attest to the origin of their content. By anchoring image hashes to the Ethereum blockchain, we create a tamper-proof history that proves **who** generated an image, **which model** was used, and **when** it was created.

---

## 🏗️ Architecture

The system consists of three core components:

1.  **The Provider Registry (Smart Contract):**
    A decentralized whitelist that manages identity. It maps Ethereum addresses to real-world AI Providers.

2.  **The Attestation Ledger (Smart Contract):**
    The immutable record. When a Provider generates an image, they calculate a `Keccak256` hash of the binary data and store it here.

3.  **The Verification Standard (Protocol):**
    A logic layer that allows any third-party application (social media, news outlets, browsers) to verify an image file against the on-chain registry without relying on centralized APIs.

---

## 📦 Protocol Contracts

### 1. `ProviderRegistry.sol`
The governance layer.
*   **Role:** Manages authorized signers.
*   **Key Function:** `registerModel(string modelId, bytes32 pubKeyHash)`
*   **Why:** Ensures that only known entities can submit attestations, preventing spam while maintaining transparency.

### 2. `ImageAttestationRegistry.sol`
The storage layer.
*   **Role:** Stores the "Birth Certificate" of every image.
*   **Key Function:** `registerAttestation(bytes32 imageHash, string modelId)`
*   **Verification:** `verifyImage(bytes32 imageHash)` returns the Provider Address, ModelId and Timestamp.

---

## ⚡ Deployment & Setup

Follow these steps to deploy the TruePixel Registry on your own network.

### Prerequisites
*   Node.js (v18+)
*   Hardhat
*   Ethereum Wallet (Private Key)

### 1. Installation

```bash
git clone https://github.com/your-repo/truepixel-protocol.git
npm install
cd backend && npm install && cd ..
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```ini
RPC_URL="http://127.0.0.1:8545" # Or Sepolia/Base RPC
PRIVATE_KEY="0x..."             # Deployer Wallet
```

### 3. Deploy the Protocol

This script deploys both the `ProviderRegistry` and `ImageAttestationRegistry`.

```bash
npx hardhat run scripts/deploy.js --network localhost
```

> 📝 **Note:** Save the contract addresses output by this script.

### 4. Onboard a Provider

Before an AI Node can start signing images, it must be registered in the protocol.

1.  Open `scripts/register.js`.
2.  Update `REGISTRY_ADDRESS` with your deployed contract address.
3.  Run the script:

```bash
npx hardhat run scripts/register.js --network localhost
```

---

## 🔌 Integration Guide

### For AI Model Providers
To make your AI model "TruePixel Verified," integrate our signing logic into your generation pipeline:

```javascript
// 1. Generate Image (Internal Logic)
const imageBuffer = await myAIModel.generate(prompt);

// 2. Hash the Image (Keccak256)
const imageHash = ethers.keccak256(imageBuffer);

// 3. Submit to Registry
await attestationContract.registerAttestation(imageHash, "my-model-v1");

// 4. Send Image to User
return imageBuffer;
```

### For Verifiers / 3rd Party Apps
To verify an image in your own application:

```javascript
// 1. Hash the uploaded file
const fileHash = ethers.keccak256(uploadedFileBuffer);

// 2. Query the Registry (Free, Read-Only)
const result = await attestationContract.verifyImage(fileHash);

if (result.provider !== ethers.ZeroAddress) {
    console.log(`Verified! Created by ${result.provider} on ${new Date(Number(result.issuedAt) * 1000)}`);
}
```

---

## 🖥️ Reference Implementation (Demo)

This repository includes a **Reference Node** (`/backend`) and a **Demo UI** (`index.html`) to demonstrate the protocol in action.

*   **Backend:** Acts as an example "AI Provider Node" that wraps the Google Gemini API and automatically handles on-chain attestation.
*   **Frontend:** A minimal React interface showing how to implement the drag-and-drop verification logic.

To run the reference implementation:
```bash
cd backend
# Ensure .env contains CONTRACT_ADDRESS and OPENROUTER_API_KEY
node server.js
```

---

## 🗺️ Roadmap

*   **Zero-Knowledge (ZK) Privacy:** Upgrading the registry to support ZK-SNARKs, allowing providers to prove they generated an image without revealing their private signing key publicly.
*   **Perceptual Hashing:** Moving beyond Keccak256 to robust hashing algorithms (pHash) that survive image compression and resizing.
*   **Decentralized Storage:** Integrating IPFS/Arweave pinning for the image files themselves, linked directly to the attestation.

---

## 📄 License

This protocol is open-source and licensed under the **MIT License**.
