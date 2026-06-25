'use client';

import { useState, useRef, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { secureOtaRegistryAbi } from '@/lib/abi';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, CheckCircle, Loader2, Key, ShieldCheck, XCircle, BotMessageSquare, Send, User, Download } from 'lucide-react';

const CONTRACT_ADDRESS = '0x4dcbF6a124764b2af85Ca770fe3024246Dfb7948';
const API_KEY = "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";

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<'publish' | 'verify'>('publish');
  
  // Publish State
  const [deployFile, setDeployFile] = useState<File | null>(null);
  const [deployVersion, setDeployVersion] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  
  // Verify State
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyVersion, setVerifyVersion] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<'success' | 'rejected' | null>(null);
  const [verifyingStep, setVerifyingStep] = useState<string>('');
  const [localHashDisplay, setLocalHashDisplay] = useState<string>('');
  const [networkHashDisplay, setNetworkHashDisplay] = useState<string>('');

  // AI Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const publicClient = usePublicClient();

  useEffect(() => {
    // Scroll to bottom of chat
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  useEffect(() => {
    // Startup greeting
    startAiChatSession('startup');
  }, []);

  const handlePublishFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDeployFile(e.target.files[0]);
    }
  };

  const handleVerifyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVerifyFile(e.target.files[0]);
    }
  };

  const handleEncryptAndSign = async () => {
    if (!deployFile || !deployVersion) return;
    setIsUploading(true);
    try {
      const res = await fetch(`/api/upload?version=${deployVersion}`, { 
        method: 'POST', 
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: deployFile 
      });
      const data = await res.json();
      if (data.success) {
        setUploadResult(data);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Encryption failed.');
    }
    setIsUploading(false);
  };

  const handlePublishToWeb3 = () => {
    if (!uploadResult) return;
    const formattedHash = uploadResult.data.sha256Hash.startsWith('0x') 
      ? uploadResult.data.sha256Hash 
      : `0x${uploadResult.data.sha256Hash}`;
      
    try {
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: secureOtaRegistryAbi,
        functionName: 'publishRelease',
        args: [BigInt(uploadResult.data.version), formattedHash as `0x${string}`, uploadResult.data.encryptedFileUrl],
      }, {
        onError: (err) => {
          console.error("Transaction Error:", err);
          alert(`Transaction failed! Are you connected to Sepolia? Error: ${err.message}`);
        },
        onSuccess: () => {
          startAiChatSession('publish', null, uploadResult.data.version.toString(), formattedHash);
        }
      });
    } catch (err: any) {
      console.error("Sync Error:", err);
      alert(`Failed to trigger wallet: ${err.message}`);
    }
  };

  const downloadKeys = () => {
    if (!uploadResult) return;
    
    const headerContent = `#ifndef OTA_KEYS_H\n#define OTA_KEYS_H\n\n// Auto-generated keys from Secure Web3 Dashboard\n// Version: ${uploadResult.data.version}\n\n// AES-128-CTR Decryption Key\nstatic const unsigned char aes_key[16] = {\n${uploadResult.data.aesKeyHex.match(/.{1,2}/g)?.map((byte: string) => `    0x${byte}`).join(',\\n')}\n};\n\n// AES-128-CTR Initialization Vector (IV)\nstatic const unsigned char aes_iv[16] = {\n${uploadResult.data.ivHex.match(/.{1,2}/g)?.map((byte: string) => `    0x${byte}`).join(',\\n')}\n};\n\n// ECDSA Public Key (Prime256v1 / secp256r1) for Signature Verification\nstatic const char *public_key_pem = \n${uploadResult.generatedPublicKey.split('\\n').map((line: string) => `    "${line}\\n"`).join('\\n')};\n\n#endif // OTA_KEYS_H\n`;

    const blob = new Blob([headerContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ota_keys.h';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleVerify = async () => {
    if (!verifyFile || !verifyVersion || !publicClient) return;
    setIsVerifying(true);
    setVerifyResult(null);
    setLocalHashDisplay('');
    setNetworkHashDisplay('');
    
    try {
      // 1. Calculate local hash
      setVerifyingStep('Calculating SHA-256 Hash of uploaded file...');
      const arrayBuffer = await verifyFile.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const localHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const formattedLocalHash = `0x${localHashHex}`;
      setLocalHashDisplay(formattedLocalHash);

      await new Promise(resolve => setTimeout(resolve, 800));

      // 2. Read from Smart Contract
      setVerifyingStep(`Fetching trusted hash from Sepolia Smart Contract for Version ${verifyVersion}...`);
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: secureOtaRegistryAbi,
        functionName: 'getRelease',
        args: [BigInt(verifyVersion)]
      }) as [bigint, string, string];

      const onChainHash = data[1];
      setNetworkHashDisplay(onChainHash);

      await new Promise(resolve => setTimeout(resolve, 800));
      setVerifyingStep('Comparing hashes...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Compare
      const isMatch = formattedLocalHash.toLowerCase() === onChainHash.toLowerCase();
      if (isMatch) {
        setVerifyResult('success');
        setVerifyingStep('Match! Firmware is authentic.');
      } else {
        setVerifyResult('rejected');
        setVerifyingStep('CRITICAL ALERT: Hash mismatch! Firmware modified!');
      }
      startAiChatSession('verify', arrayBuffer, verifyVersion, formattedLocalHash, onChainHash, isMatch);
    } catch (err: any) {
      console.error(err);
      alert('Verification failed: ' + err.message);
      setVerifyingStep('');
    } finally {
      setIsVerifying(false);
    }
  };

  const startAiChatSession = async (action: 'startup' | 'publish' | 'verify', buffer?: ArrayBuffer | null, version?: string, localHash?: string, web3Hash?: string, isMatch?: boolean) => {
    setIsAnalyzing(true);
    
    let prompt = "";
    if (action === 'startup') {
      prompt = "Hello AI! I am starting up my Secure Web3 OTA Dashboard. I'm ready to manage secure firmware. Give me a brief 1-sentence greeting.";
    } else if (action === 'publish') {
      prompt = `I have just published Firmware Version ${version} to the Web3 Smart Contract. The hash is ${localHash}. Please acknowledge and provide a brief security tip for maintaining OTA keys.`;
    } else if (action === 'verify') {
      if (isMatch) {
        prompt = `I just verified Firmware Version ${version}. The local hash ${localHash} matched the Web3 Smart Contract hash perfectly! Please acknowledge.`;
      } else {
        const text = new TextDecoder().decode(buffer || new ArrayBuffer(0));
        const sample = text.substring(0, 1000);
        prompt = `CRITICAL ALERT: I just tried to verify Firmware Version ${version} but the hash DID NOT MATCH! Local: ${localHash}, Web3: ${web3Hash}. Here is a sample of the malicious file I uploaded: \n\n${sample}\n\nPlease act as a cybersecurity expert and analyze this payload to explain what the attacker is trying to do.`;
      }
    }

    const newMessage: Message = { role: 'user', content: prompt };
    setMessages(prev => {
      const updated = [...prev, newMessage];
      callOpenRouter(updated);
      return updated;
    });
  };

  const callOpenRouter = async (messageHistory: Message[]) => {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
          messages: messageHistory,
        })
      });
      
      const data = await res.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const aiMessage = data.choices[0].message.content;
        setMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);
      }
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAnalyzing) return;
    
    const userMsg = chatInput.trim();
    setChatInput('');
    setIsAnalyzing(true);
    
    const newMessage: Message = { role: 'user', content: userMsg };
    setMessages(prev => {
      const updated = [...prev, newMessage];
      callOpenRouter(updated);
      return updated;
    });
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(20,40,30,0.3),rgba(0,0,0,1))] py-8 px-4 flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full max-w-7xl flex items-center justify-between mb-8 px-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-cyan-500" />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            Secure OTA Admin
          </h1>
        </div>
        <ConnectButton />
      </div>

      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-8 items-start justify-center">
        
        {/* LEFT COLUMN: Main App */}
        <div className="flex-1 w-full flex flex-col">
          {/* Tabs */}
          <div className="flex gap-4 mb-8 bg-slate-900/50 p-2 rounded-2xl border border-slate-800 w-full max-w-3xl mx-auto">
            <button 
              onClick={() => setActiveTab('publish')}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${activeTab === 'publish' ? 'bg-cyan-900/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
              Publish Firmware
            </button>
            <button 
              onClick={() => setActiveTab('verify')}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${activeTab === 'verify' ? 'bg-emerald-900/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
              Verify Security
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'publish' && (
              <motion.div 
                key="publish"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-3xl mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col"
              >
                <h2 className="text-xl font-semibold mb-6 text-slate-200">Prepare & Publish Firmware</h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Version Number</label>
                      <input 
                        type="number" 
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        placeholder="e.g. 1"
                        value={deployVersion}
                        onChange={(e) => setDeployVersion(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Firmware Binary (.bin)</label>
                    <div className="relative border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center hover:bg-slate-800/30 transition-colors cursor-pointer group">
                      <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".bin" onChange={handlePublishFileChange} />
                      <UploadCloud className="w-10 h-10 text-slate-500 mx-auto mb-3 group-hover:text-cyan-400 transition-colors" />
                      <p className="text-slate-300 font-medium">{deployFile ? deployFile.name : "Drag & Drop .bin file"}</p>
                    </div>
                  </div>

                  <button 
                    onClick={handleEncryptAndSign}
                    disabled={!deployFile || !deployVersion || isUploading}
                    className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    {isUploading ? 'Processing...' : '1. Encrypt & Sign'}
                  </button>
                </div>

                {uploadResult && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 pt-8 border-t border-slate-800">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6">
                      <h3 className="text-cyan-400 font-medium mb-3 flex items-center gap-2"><Key className="w-4 h-4" /> Secure Keys Generated</h3>
                      <p className="text-slate-400 text-sm mb-4">Click below to download the C header file containing your encryption and signature keys. Place it in your ESP32 main folder.</p>
                      <button
                        onClick={downloadKeys}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium text-emerald-400 border border-slate-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Download ota_keys.h
                      </button>
                    </div>

                    <button 
                      onClick={handlePublishToWeb3}
                      disabled={isWriting || isConfirming || isConfirmed}
                      className="w-full py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      {(isWriting || isConfirming) ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                      {isConfirmed ? 'Published to Sepolia!' : '2. Publish to Web3'}
                    </button>
                    {txHash && <p className="text-center text-sm text-slate-500 mt-4">Tx: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">{txHash.substring(0, 10)}...</a></p>}
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'verify' && (
              <motion.div 
                key="verify"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-3xl mx-auto bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col"
              >
                <h2 className="text-xl font-semibold mb-6 text-slate-200">Verify Firmware Security</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Version to Verify</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="e.g. 1"
                      value={verifyVersion}
                      onChange={(e) => setVerifyVersion(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Suspicious Firmware Binary (.bin)</label>
                    <div className="relative border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center hover:bg-slate-800/30 transition-colors cursor-pointer group">
                      <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".bin" onChange={handleVerifyFileChange} />
                      <UploadCloud className="w-10 h-10 text-slate-500 mx-auto mb-3 group-hover:text-emerald-400 transition-colors" />
                      <p className="text-slate-300 font-medium">{verifyFile ? verifyFile.name : "Drag & Drop .bin file"}</p>
                    </div>
                  </div>

                  <button 
                    onClick={handleVerify}
                    disabled={!verifyFile || !verifyVersion || isVerifying}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    {isVerifying ? 'Verifying on Web3...' : 'Verify Firmware Integrity'}
                  </button>
                </div>

                {isVerifying && (
                  <div className="mt-6 flex flex-col items-center p-6 bg-white/5 rounded-xl border border-white/10">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
                    <p className="text-white/80 font-medium text-center">{verifyingStep}</p>
                  </div>
                )}

                {localHashDisplay && networkHashDisplay && !isVerifying && (
                  <div className="mt-6 p-4 bg-black/40 rounded-lg border border-white/10 font-mono text-xs overflow-x-auto space-y-2">
                    <div className="flex flex-col">
                      <span className="text-white/50 mb-1">Local File Hash:</span>
                      <span className={verifyResult === 'success' ? 'text-green-400' : 'text-red-400'}>{localHashDisplay}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white/50 mb-1">Trusted Web3 Hash:</span>
                      <span className="text-purple-400">{networkHashDisplay}</span>
                    </div>
                  </div>
                )}

                {verifyResult === 'success' && !isVerifying && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 bg-emerald-950/30 border border-emerald-500/50 rounded-xl p-6 text-center">
                   <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                   <h3 className="text-lg font-semibold text-emerald-400">Firmware Verified!</h3>
                   <p className="text-emerald-200/70 mt-2">The hash of this binary exactly matches the trusted hash published on the Sepolia smart contract.</p>
                 </motion.div>
                )}

                {verifyResult === 'rejected' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 bg-rose-950/30 border border-rose-500/50 rounded-xl overflow-hidden flex flex-col max-h-[600px]">
                    <div className="p-4 bg-rose-950 border-b border-rose-900/50 flex items-center gap-3">
                      <XCircle className="w-8 h-8 text-rose-500" />
                      <div>
                        <h3 className="font-bold text-rose-500 leading-tight">REJECTED: Malicious Firmware</h3>
                        <p className="text-xs text-rose-200/70">Hash mismatch! The AI analyst is investigating the threat payload...</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: AI Chatbot */}
        <div className="w-full lg:w-[450px] shrink-0 bg-slate-900/50 backdrop-blur-xl border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] rounded-3xl overflow-hidden flex flex-col h-[800px] sticky top-8">
          <div className="p-4 bg-purple-950/40 border-b border-purple-900/50 flex items-center gap-3">
            <BotMessageSquare className="w-6 h-6 text-purple-400" />
            <h3 className="font-bold text-purple-200">Pre-Built AI Sentinel</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30 custom-scrollbar">
            {messages.length === 0 && !isAnalyzing && (
              <p className="text-sm text-slate-500 italic text-center py-8">Initializing AI Security Agent...</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-cyan-900 text-cyan-400' : 'bg-purple-900 text-purple-400'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <BotMessageSquare className="w-4 h-4" />}
                </div>
                <div className={`rounded-2xl p-4 max-w-[85%] ${msg.role === 'user' ? 'bg-cyan-900/40 text-cyan-50 rounded-tr-none text-xs' : 'bg-purple-950/50 border border-purple-900/30 text-purple-100 rounded-tl-none prose prose-invert max-w-none text-sm whitespace-pre-wrap'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isAnalyzing && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-900 text-purple-400 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="rounded-2xl p-4 bg-purple-950/50 border border-purple-900/30 text-purple-100 rounded-tl-none text-sm flex items-center gap-2">
                  Processing logic...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-slate-900/80 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask the AI a question..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-purple-500/50 text-sm"
              disabled={isAnalyzing}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isAnalyzing}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}
