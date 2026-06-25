import { ethers } from "ethers";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
  if (!privateKey) throw new Error("Missing SEPOLIA_PRIVATE_KEY");

  const url = process.env.ALCHEMY_API_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(url);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Deploying from address:", wallet.address);

  // Read ABI and Bytecode
  const artifactPath = "./artifacts/contracts/SecureOTARegistry.sol/SecureOTARegistry.json";
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  console.log("Sending deployment transaction to Sepolia...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("========================================");
  console.log("SUCCESS!");
  console.log("Contract deployed to:", address);
  console.log("========================================");
}

main().catch(console.error);
