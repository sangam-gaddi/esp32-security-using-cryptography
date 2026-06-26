import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    let { wifiSsid, wifiPass, contractAddress, privateKey, projectPath } = await req.json();

    if (!wifiSsid || !wifiPass || !contractAddress || !privateKey || !projectPath) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Strip surrounding quotes from projectPath if any
    projectPath = projectPath.replace(/^["'](.*)["']$/, '$1');

    // 1. Modify firmware/main/main.c
    const projectRoot = path.resolve(process.cwd(), projectPath); // Resolves relative to dashboard root

    const mainCPath = path.join(projectRoot, 'firmware', 'main', 'main.c');
    
    if (fs.existsSync(mainCPath)) {
      let mainCContent = fs.readFileSync(mainCPath, 'utf8');
      
      mainCContent = mainCContent.replace(/#define\s+WIFI_SSID\s+".*"/, `#define WIFI_SSID "${wifiSsid}"`);
      mainCContent = mainCContent.replace(/#define\s+WIFI_PASS\s+".*"/, `#define WIFI_PASS "${wifiPass}"`);
      mainCContent = mainCContent.replace(/#define\s+CONTRACT_ADDRESS\s+".*"/, `#define CONTRACT_ADDRESS "${contractAddress}"`);
      
      fs.writeFileSync(mainCPath, mainCContent);
    } else {
      console.warn(`main.c not found at ${mainCPath}`);
      return NextResponse.json({ success: false, error: 'main.c not found' }, { status: 404 });
    }

    // 2. Modify smart-contracts/.env
    const envPath = path.join(projectRoot, 'smart-contracts', '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envContent.includes('SEPOLIA_PRIVATE_KEY=')) {
        envContent = envContent.replace(/SEPOLIA_PRIVATE_KEY=.*/, `SEPOLIA_PRIVATE_KEY="${privateKey}"`);
      } else {
        envContent += `\nSEPOLIA_PRIVATE_KEY="${privateKey}"\n`;
      }
      
      fs.writeFileSync(envPath, envContent);
    } else {
      // Create it if it doesn't exist
      fs.writeFileSync(envPath, `SEPOLIA_PRIVATE_KEY="${privateKey}"\n`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Setup API Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
