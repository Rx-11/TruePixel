const hre = require("hardhat");

async function main() {
  const [provider] = await hre.ethers.getSigners();
  console.log("Acting as Provider:", provider.address);

  // 1. ⚠️ PASTE YOUR NEW REGISTRY ADDRESS HERE
  const REGISTRY_ADDRESS = "0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8"; // <--- Update this!

  const registry = await hre.ethers.getContractAt(
    "ProviderRegistry",
    REGISTRY_ADDRESS
  );

  // 2. Register the Provider (if your contract requires this step)
  // Some versions of ProviderRegistry might auto-register on model creation, 
  // but keeping it explicit is safer.
  console.log("Registering Provider...");
  try {
      const tx = await registry.registerProvider(); 
      await tx.wait();
  } catch (e) {
      console.log("Provider might already be registered, continuing...");
  }

  // 3. Register the Model
  // Even without ZK, the Registry usually expects a 'hash' argument.
  // We can just use the provider's address hash or ZeroHash.
  const pubKeyHash = hre.ethers.keccak256(
    hre.ethers.solidityPacked(["address"], [provider.address])
  );
  
  const modelId = "mockvision-v1";
  const price = 100; // If your registry takes a price argument

  console.log(`Registering Model: ${modelId}...`);

  // ⚠️ CHECK: Does your ProviderRegistry.registerModel take 2 args or 3?
  // If it is: function registerModel(string memory modelId, uint256 price, bytes32 key)
  // Use this:
  // await registry.registerModel(modelId, price, pubKeyHash);
  
  // If it is the version from your snippet:
  await registry.registerModel(modelId, pubKeyHash);

  console.log("✅ Success!");
  console.log("   Provider:", provider.address);
  console.log("   Model ID:", modelId);
  console.log("   PubKeyHash (Stored):", pubKeyHash);
}

main().catch(console.error);