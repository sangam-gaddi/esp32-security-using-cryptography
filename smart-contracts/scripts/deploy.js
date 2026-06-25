import hre from "hardhat";

async function main() {
  console.log("Deploying SecureOTARegistry to Sepolia...");
  
  // The contract name must match exactly what is in SecureOTARegistry.sol
  const SecureOTARegistry = await hre.ethers.getContractFactory("SecureOTARegistry");
  
  // Deploy the contract
  const registry = await SecureOTARegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();

  console.log("========================================");
  console.log("SUCCESS!");
  console.log("Contract deployed to:", address);
  console.log("========================================");
  console.log("Next Step: Copy the address above and paste it into dashboard/src/app/page.tsx on line 10!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
