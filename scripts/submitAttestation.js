const hre = require("hardhat");

async function main() {
  // ⚠️ UPDATE THIS to your new ImageAttestationRegistry address from the deploy step
  const ATTEST_ADDRESS = "0x851356ae760d987E095750cCeb3bC6014560891C"; 

  // Get the signer. This MUST be the account you registered in the previous step.
  const [signer] = await hre.ethers.getSigners();
  console.log("Submitting with account:", signer.address);

  // Connect to the NEW contract (ImageAttestationRegistry)
  const attest = await hre.ethers.getContractAt(
    "ImageAttestationRegistry", 
    ATTEST_ADDRESS,
    signer // Connect the signer explicitly
  );

  // ===== VALUES =====
  // Note: We removed 'nullifier', 'issuedAt', and 'pubKeyHash'
  // because the smart contract now handles timestamp and auth automatically.

  const imageCommitment =
    "0xd0dfc2b2e83e96514de117a742fff8c347cc6379d73fa8de4cb3a9efa41abae3";
  
  const modelId = "mockvision-v1";

  // ===== SUBMIT ATTESTATION =====
  console.log(`\nRegistering attestation...`);
  console.log(`Model ID: ${modelId}`);
  console.log(`Image Hash: ${imageCommitment}`);

  try {
      const tx = await attest.registerAttestation(
        imageCommitment,
        modelId
      );

      console.log("⏳ Transaction sent:", tx.hash);
      await tx.wait();
      console.log("✅ Attestation anchored on-chain!");
      
  } catch (error) {
      if (error.message.includes("AttestationAlreadyExists")) {
          console.error("❌ Failed: This image has already been attested.");
      } else if (error.message.includes("NotRegisteredProvider")) {
          console.error("❌ Failed: Your wallet is not registered as a provider.");
      } else {
          console.error("❌ Submission failed:", error);
      }
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Script Error:", err);
  process.exit(1);
});