import mongoose from 'mongoose';

const FirmwareSchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true,
    unique: true,
  },
  sha256Hash: {
    type: String,
    required: true,
  },
  encryptedFileUrl: {
    type: String,
    required: true,
  },
  signatureFileUrl: {
    type: String,
    required: true,
  },
  aesKeyHex: {
    type: String,
    required: true,
  },
  ivHex: {
    type: String,
    required: true,
  },
  publishedToWeb3: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Firmware || mongoose.model('Firmware', FirmwareSchema);
