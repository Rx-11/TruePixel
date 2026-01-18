const hre = require("hardhat");

async function main() {
  // ⚠️ 1. Paste your deployed ImageAttestationRegistry address here
  const ATTEST_ADDRESS = "0x851356ae760d987E095750cCeb3bC6014560891C";

  // ⚠️ 2. The Image Commitment hash you want to look up
  // (This must match the one you submitted earlier)
  const imageCommitment =
    "0xd0dfc2b2e83e96514de117a742fff8c347cc6379d73fa8de4cb3a9efa41abae3";

  console.log("🔍 Looking up Attestation for:");
  console.log(`   ${imageCommitment}`);
  console.log("---------------------------------------------------");

  // Connect to the contract
  const attest = await hre.ethers.getContractAt(
    "ImageAttestationRegistry",
    ATTEST_ADDRESS
  );

  // Call the view function
  const result = await attest.verifyImage(imageCommitment);

  // Destructure the result
  // The contract returns: (address provider, string modelId, uint64 issuedAt)
  const provider = result[0];
  const modelId = result[1];
  const issuedAt = result[2];

  // Check if it exists
  if (provider === hre.ethers.ZeroAddress) {
    console.log("❌ No attestation found for this image.");
    console.log("   (The hash does not exist on the registry)");
  } else {
    // Convert timestamp from BigInt to readable Date
    const date = new Date(Number(issuedAt) * 1000).toLocaleString();

    console.log("✅ VERIFIED! Image is authentic.");
    console.log(`   👨‍🎨 Provider:  ${provider}`);
    console.log(`   🤖 Model ID:  ${modelId}`);
    console.log(`   📅 Issued At: ${date}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});