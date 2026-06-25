#ifndef OTA_KEYS_H
#define OTA_KEYS_H

// Auto-generated keys from Secure Web3 Dashboard
// Version: 7

// AES-128-CTR Decryption Key
static const unsigned char aes_key[16] = {
    0xad,\n    0x79,\n    0x9b,\n    0x82,\n    0xf7,\n    0xa8,\n    0x20,\n    0x82,\n    0xcb,\n    0x52,\n    0x4d,\n    0x91,\n    0x20,\n    0xc8,\n    0x5e,\n    0x50
};

// AES-128-CTR Initialization Vector (IV)
static const unsigned char aes_iv[16] = {
    0x97,\n    0x1e,\n    0x4c,\n    0x49,\n    0xac,\n    0x24,\n    0x95,\n    0x7a,\n    0x9a,\n    0x03,\n    0x38,\n    0x78,\n    0xe3,\n    0xe1,\n    0x15,\n    0x78
};

// ECDSA Public Key (Prime256v1 / secp256r1) for Signature Verification
static const char *public_key_pem = 
    "-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEwhQdrjmDAvjDVVaiMYMN3rB49ZpT
LQhNsqY16Qh9WHioAc9TBRsemTH7PkEu/sLfTVYF5pqFzbHQruQMlWTLZg==
-----END PUBLIC KEY-----
\n";

#endif // OTA_KEYS_H
