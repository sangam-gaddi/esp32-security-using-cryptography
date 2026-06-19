import crypto from 'crypto';

export function encryptAndSignFirmware(
  rawBuffer: Buffer,
  privateKeyPem: string,
  aesKey: Buffer,
  iv: Buffer
) {
  // 1. Calculate SHA-256 Hash of the original firmware
  const hash = crypto.createHash('sha256');
  hash.update(rawBuffer);
  const sha256Hash = hash.digest();

  // 2. Sign the Hash using ECDSA (secp256r1/Prime256v1)
  const sign = crypto.createSign('SHA256');
  // We use the raw buffer to create the signature to ensure authenticity of the exact file
  sign.update(rawBuffer);
  sign.end();
  const signature = sign.sign(privateKeyPem);

  // 3. Encrypt the raw firmware using AES-128-CTR
  // We use createCipheriv, which requires a 16-byte key and a 16-byte IV for AES-128
  const cipher = crypto.createCipheriv('aes-128-ctr', aesKey, iv);
  
  // CTR is a stream cipher, so no padding is necessary. The exact size is preserved.
  const encryptedBuffer = Buffer.concat([cipher.update(rawBuffer), cipher.final()]);

  return {
    encryptedBuffer,
    sha256Hash: sha256Hash.toString('hex'), // Return hex string for the smart contract
    signature
  };
}

export function generateKeys() {
  // Generate random AES key and IV
  const aesKey = crypto.randomBytes(16); // 128-bit key
  const iv = crypto.randomBytes(16);     // 128-bit IV

  // Generate ECDSA Key Pair for Signing (Prime256v1 is standard for many IoT)
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return { aesKey, iv, publicKey, privateKey };
}
