require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const crypto = require("crypto");
const { PNG } = require("pngjs");

// Provider private key (Hardhat account #0)
const PRIVATE_KEY = process.env.PROVIDER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  throw new Error("Missing PROVIDER_PRIVATE_KEY in .env");
}

const wallet = new ethers.Wallet(PRIVATE_KEY);

/* ---------------------------------- */
/* Pixel-based image commitment        */
/* ---------------------------------- */
function computePixelCommitment(imageBuffer) {
  const png = PNG.sync.read(imageBuffer);

  const dimBuf = Buffer.allocUnsafe(8);
  dimBuf.writeUInt32BE(png.width, 0);
  dimBuf.writeUInt32BE(png.height, 4);

  const payload = Buffer.concat([dimBuf, png.data]);
  return ethers.keccak256(payload);
}

/* ---------------------------------- */
/* Canonical attestation               */
/* ---------------------------------- */
function canonicalize(att) {
  return {
    provider: att.provider,
    modelId: att.modelId,
    issuedAt: Number(att.issuedAt),
    imageCommitment: att.imageCommitment,
    nullifier: att.nullifier,
    schemaVersion: Number(att.schemaVersion),
  };
}

/* ---------------------------------- */
/* Main generator                      */
/* ---------------------------------- */
async function generateProvenance() {
  const imageBuffer = fs.readFileSync("./image/demo_art.png");

  // 1️⃣ Image commitment
  const imageCommitment = computePixelCommitment(imageBuffer);

  // 2️⃣ Replay protection
  const nonce = crypto.randomBytes(32);
  const nullifier = ethers.keccak256(nonce);

  // 3️⃣ Canonical attestation
  const attestation = canonicalize({
    provider: wallet.address,
    modelId: "mockvision-v1",
    issuedAt: Math.floor(Date.now() / 1000),
    imageCommitment,
    nullifier,
    schemaVersion: 1,
  });

  // 4️⃣ Deterministic hash
  const attestationDigest = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(attestation))
  );

  // 5️⃣ Sign (MVP – replaced by ZK later)
  const signature = await wallet.signMessage(
    ethers.getBytes(attestationDigest)
  );

  const result = { attestation, signature };

  // 6️⃣ Save for embedding / debugging
  fs.writeFileSync(
    "./image/provenance.json",
    JSON.stringify(result, null, 2)
  );

  // 7️⃣ Print values for on-chain submission
  console.log("🔐 Provider:", attestation.provider);
  console.log("🖼️ Image Commitment:", imageCommitment);
  console.log("⏱️ Issued At:", attestation.issuedAt);
  console.log("🔁 Nullifier:", nullifier);
  console.log("📄 Saved provenance.json");

  return result;
}

/* ---------------------------------- */
/* CLI usage                           */
/* ---------------------------------- */
if (require.main === module) {
  generateProvenance().catch((err) => {
    console.error("❌ Error generating provenance:", err);
    process.exit(1);
  });
}

module.exports = { generateProvenance };
