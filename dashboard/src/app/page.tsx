'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { secureOtaRegistryAbi } from '@/lib/abi';
import { motion } from 'framer-motion';
import { UploadCloud, CheckCircle, Loader2, Key, ShieldCheck } from 'lucide-react';

// Replace this with the actual deployed contract address on Sepolia
const CONTRACT_ADDRESS = '0xYourDeployedContractAddressHere';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState<string>('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const { data: hash, writeContract, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleEncryptAndSign = async () => {
    if (!file || !version) return;

    setIsEncrypting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUploadResult(data);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload and encrypt firmware');
    } finally {
      setIsEncrypting(false);
    }
  };

  const handlePublishToWeb3 = () => {
    if (!uploadResult) return;
    
    // Hash is stored as hex string without '0x' prefix from crypto module, we need to add it
    const formattedHash = uploadResult.data.sha256Hash.startsWith('0x') 
      ? uploadResult.data.sha256Hash 
      : `0x${uploadResult.data.sha256Hash}`;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: secureOtaRegistryAbi,
      functionName: 'publishRelease',
      args: [
        BigInt(uploadResult.data.version),
        formattedHash as `0x${string}`,
        uploadResult.data.encryptedFileUrl
      ],
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-12 px-4 selection:bg-cyan-500/30">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute top-0 w-full h-[500px] bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none"></div>

      <div className="z-10 w-full max-w-5xl flex justify-between items-center mb-16">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-cyan-400" />
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            Secure OTA Admin
          </h1>
        </div>
        <ConnectButton />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-2xl bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl"
      >
        <h2 className="text-xl font-semibold mb-6 text-slate-200">Upload New Firmware</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Version Number (Integer)</label>
            <input 
              type="number" 
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              placeholder="e.g. 2"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Firmware Binary (.bin)</label>
            <div className="relative border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center hover:bg-slate-800/30 transition-colors cursor-pointer group">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".bin"
                onChange={handleFileChange}
              />
              <UploadCloud className="w-10 h-10 text-slate-500 mx-auto mb-3 group-hover:text-cyan-400 transition-colors" />
              <p className="text-slate-300 font-medium">{file ? file.name : "Drag & Drop or Click to Browse"}</p>
              <p className="text-slate-500 text-sm mt-1">Raw ESP32 binary file</p>
            </div>
          </div>

          <button 
            onClick={handleEncryptAndSign}
            disabled={!file || !version || isEncrypting || !!uploadResult}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2"
          >
            {isEncrypting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
            {isEncrypting ? 'Encrypting & Signing...' : '1. Encrypt & Sign Firmware'}
          </button>
        </div>

        {uploadResult && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-8 pt-8 border-t border-slate-800"
          >
            <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4 mb-6 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-emerald-400 font-medium">Successfully Processed</h3>
                <p className="text-slate-400 text-sm mt-1 break-all">
                  SHA256: <span className="font-mono text-slate-300">{uploadResult.data.sha256Hash}</span>
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6">
              <h3 className="text-cyan-400 font-medium mb-2 flex items-center gap-2"><Key className="w-4 h-4" /> Copy these to your ESP32 main.c</h3>
              <p className="text-slate-400 text-xs mb-1">AES_KEY_HEX:</p>
              <code className="block bg-black/50 text-emerald-300 p-2 rounded text-xs break-all mb-3">{uploadResult.data.aesKeyHex}</code>
              <p className="text-slate-400 text-xs mb-1">AES_IV_HEX:</p>
              <code className="block bg-black/50 text-emerald-300 p-2 rounded text-xs break-all mb-3">{uploadResult.data.ivHex}</code>
              <p className="text-slate-400 text-xs mb-1">PUBLIC_KEY_PEM (One-liner for C):</p>
              <pre className="block bg-black/50 text-emerald-300 p-2 rounded text-[10px] overflow-x-auto whitespace-pre-wrap">{uploadResult.generatedPublicKey.replace(/\r?\n/g, '\\n')}</pre>
            </div>

            <button 
              onClick={handlePublishToWeb3}
              disabled={isWriting || isConfirming || isConfirmed}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              {(isWriting || isConfirming) ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isConfirmed ? 'Published to Sepolia!' : '2. Publish to Web3 Registry'}
            </button>

            {hash && (
              <p className="text-center text-sm text-slate-500 mt-4">
                Tx: <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">{hash.substring(0, 10)}...</a>
              </p>
            )}
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}
