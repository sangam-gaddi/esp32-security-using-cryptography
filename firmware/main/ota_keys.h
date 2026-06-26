#ifndef OTA_KEYS_H
#define OTA_KEYS_H

// Auto-generated keys from Secure Web3 Dashboard
// Version: 7

// AES-128-CTR Decryption Key
static const unsigned char aes_key[16] = {
    0xad,
    0x79,
    0x9b,
    0x82,
    0xf7,
    0xa8,
    0x20,
    0x82,
    0xcb,
    0x52,
    0x4d,
    0x91,
    0x20,
    0xc8,
    0x5e,
    0x50
};

// AES-128-CTR Initialization Vector (IV)
static const unsigned char aes_iv[16] = {
    0x97,
    0x1e,
    0x4c,
    0x49,
    0xac,
    0x24,
    0x95,
    0x7a,
    0x9a,
    0x03,
    0x38,
    0x78,
    0xe3,
    0xe1,
    0x15,
    0x78
};

// ECDSA Public Key (Prime256v1 / secp256r1) for Signature Verification
static const char *public_key_pem = 
    "-----BEGIN PUBLIC KEY-----\n"
    "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEwhQdrjmDAvjDVVaiMYMN3rB49ZpT\n"
    "LQhNsqY16Qh9WHioAc9TBRsemTH7PkEu/sLfTVYF5pqFzbHQruQMlWTLZg==\n"
    "-----END PUBLIC KEY-----\n";

#endif // OTA_KEYS_H
