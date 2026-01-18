const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  // 1. Deploy ProviderRegistry
  const Registry = await hre.ethers.getContractFactory("ProviderRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("ProviderRegistry deployed to:", registryAddress);

  // 2. Deploy ImageAttestationRegistry
  // Note: We no longer need the Verifier address here
  const Attestation = await hre.ethers.getContractFactory("ImageAttestationRegistry");
  const attestation = await Attestation.deploy(registryAddress);
  await attestation.waitForDeployment();
  const attestationAddress = await attestation.getAddress();
  console.log("ImageAttestationRegistry deployed to:", attestationAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});