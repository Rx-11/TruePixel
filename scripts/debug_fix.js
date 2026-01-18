const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Debugging with account:", deployer.address);

  // 1. Deploy Mock Verifier FRESH
  const MockVerifier = await hre.ethers.getContractFactory("MockGroth16Verifier");
  const mockVerifier = await MockVerifier.deploy();
  await mockVerifier.waitForDeployment();
  const verifierAddr = await mockVerifier.getAddress();
  console.log("✅ New Verifier Address:", verifierAddr);

  // 2. Deploy Registry FRESH
  const Registry = await hre.ethers.getContractFactory("ProviderRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("✅ New Registry Address:", registryAddr);

  // 3. Deploy ZKImageAttestations FRESH
  const ZKAttest = await hre.ethers.getContractFactory("ZKImageAttestations");
  const zkAttest = await ZKAttest.deploy(registryAddr, verifierAddr);
  await zkAttest.waitForDeployment();
  const zkAddr = await zkAttest.getAddress();
  console.log("✅ New ZKAttestations Address:", zkAddr);

  // 4. Register a mock model so the transaction doesn't revert on 'ModelInactive'
  // (Assuming your Registry has a register function, adjust if needed)
  try {
      const txReg = await registry.registerModel("model-123", 100, ethers.ZeroHash); // Adjust args to your registry
      await txReg.wait();
      console.log("✅ Registered Mock Model");
  } catch (e) {
      console.log("⚠️ Skipping registration (adjust args if needed):", e.message);
  }

  // 5. Submit Attestation (The part that was failing)
  console.log("\nAttempting submitAttestationSimple...");
  
  const provider = deployer.address;
  const pubKeyHash = ethers.keccak256(ethers.toUtf8Bytes("key"));
  const imageCommitment = ethers.keccak256(ethers.toUtf8Bytes("image"));
  const issuedAt = Math.floor(Date.now() / 1000);
  const nullifier = ethers.keccak256(ethers.toUtf8Bytes("unique-nullifier"));
  const modelId = "model-123";

  try {
    const tx = await zkAttest.submitAttestationSimple(
      provider,
      pubKeyHash,
      imageCommitment,
      issuedAt,
      nullifier,
      modelId
    );
    console.log("⏳ Transaction sent...");
    await tx.wait();
    console.log("🎉 SUCCESS! Transaction mined without Panic 0x32.");
  } catch (error) {
    console.error("\n❌ FAILED:");
    console.error(error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});