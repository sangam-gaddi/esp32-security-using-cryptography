import { NextRequest, NextResponse } from 'next/server';
import { encryptAndSignFirmware, generateKeys } from '@/lib/crypto';
import dbConnect from '@/lib/mongodb';
import Firmware from '@/models/Firmware';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // await dbConnect(); // Disabled for local testing
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const versionStr = formData.get('version') as string;

    if (!file || !versionStr) {
      return NextResponse.json({ error: 'File and version are required' }, { status: 400 });
    }

    const version = parseInt(versionStr, 10);
    
    // Read the file into a Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    // In a real system, the private key would be loaded from a secure vault or .env
    // For this demonstration, we generate a fresh AES key, but we SHOULD use a consistent
    // Private Key for the signature so the ESP32 can verify it with a single hardcoded Public Key.
    // We'll generate a dummy key pair here just to show the crypto working.
    // If you plan to flash the ESP32, you MUST copy the generated Public Key into the C code.
    const { aesKey, iv, privateKey, publicKey } = generateKeys();

    const { encryptedBuffer, sha256Hash, signature } = encryptAndSignFirmware(
      rawBuffer,
      privateKey,
      aesKey,
      iv
    );

    // Save files to public/firmware so they can be downloaded by the ESP32
    const firmwareDir = path.join(process.cwd(), 'public', 'firmware');
    if (!fs.existsSync(firmwareDir)) {
      fs.mkdirSync(firmwareDir, { recursive: true });
    }

    const encryptedFileName = `firmware_v${version}.enc.bin`;
    const signatureFileName = `signature_v${version}.bin`;

    fs.writeFileSync(path.join(firmwareDir, encryptedFileName), encryptedBuffer);
    fs.writeFileSync(path.join(firmwareDir, signatureFileName), signature);

    // Save metadata to MongoDB - DISABLED FOR LOCAL TESTING
    // const newFirmware = await Firmware.create({ ... });

    return NextResponse.json({
      success: true,
      message: 'Firmware encrypted and signed successfully',
      data: {
        version,
        sha256Hash,
        encryptedFileUrl: `/firmware/${encryptedFileName}`,
        signatureFileUrl: `/firmware/${signatureFileName}`,
        aesKeyHex: aesKey.toString('hex'),
        ivHex: iv.toString('hex'),
      },
      generatedPublicKey: publicKey, // We return this so the user can copy it to ESP-IDF
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
