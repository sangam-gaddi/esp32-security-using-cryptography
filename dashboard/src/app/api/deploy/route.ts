import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';

const execAsync = util.promisify(exec);

export async function POST(req: NextRequest) {
  try {
    let { privateKey, projectPath } = await req.json();

    if (!privateKey || !projectPath) {
      return NextResponse.json({ success: false, error: 'Missing privateKey or projectPath' }, { status: 400 });
    }

    projectPath = projectPath.replace(/^["'](.*)["']$/, '$1');
    const smartContractsPath = path.join(projectPath, 'smart-contracts');

    if (!fs.existsSync(smartContractsPath)) {
       return NextResponse.json({ success: false, error: 'smart-contracts folder not found' }, { status: 404 });
    }

    // Temporarily set the private key in the .env file so Hardhat uses it
    const envPath = path.join(smartContractsPath, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('SEPOLIA_PRIVATE_KEY=')) {
        envContent = envContent.replace(/SEPOLIA_PRIVATE_KEY=.*/, `SEPOLIA_PRIVATE_KEY="${privateKey}"`);
      } else {
        envContent += `\nSEPOLIA_PRIVATE_KEY="${privateKey}"\n`;
      }
    } else {
      envContent = `SEPOLIA_PRIVATE_KEY="${privateKey}"\n`;
    }
    fs.writeFileSync(envPath, envContent);

    // Run the deployment script
    const { stdout, stderr } = await execAsync('npx hardhat run scripts/deploy.js --network sepolia', {
      cwd: smartContractsPath
    });

    // Parse the contract address from stdout
    const match = stdout.match(/Contract deployed to:\s+(0x[a-fA-F0-9]{40})/);
    if (match && match[1]) {
      return NextResponse.json({ success: true, contractAddress: match[1] });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to parse contract address from output.', output: stdout, stderr });
    }
  } catch (err: any) {
    console.error("Deploy Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
