import React, { useState } from 'react';
import { Sparkles, Upload, Send, X, Camera, CameraOff, MousePointer2, Info } from 'lucide-react';
import { HandState } from '../types';

interface InterfaceProps {
  onAddWish: (text: string) => void;
  onUploadImage: (file: File) => void;
  isCameraEnabled: boolean;
  toggleCamera: () => void;
  handState: HandState;
}

const Interface: React.FC<InterfaceProps> = ({ 
  onAddWish, 
  onUploadImage, 
  isCameraEnabled, 
  toggleCamera,
  handState
}) => {
  const [showWishModal, setShowWishModal] = useState(false);
  const [wishText, setWishText] = useState('');
  const [showHelp, setShowHelp] = useState(true);

  const handleWishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wishText.trim()) {
      onAddWish(wishText);
      setWishText('');
      setShowWishModal(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
      
      {/* Top Bar */}
      <div className="flex justify-between items-start w-full pointer-events-auto">
        <div className="flex flex-col gap-2">
            <h1 className="text-2xl md:text-4xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-cyan-200 drop-shadow-lg tracking-wider">
            CELESTIAL TREE
            </h1>
            <button 
                onClick={toggleCamera}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full border border-white/10 transition-all text-sm text-cyan-100 w-fit"
            >
                {isCameraEnabled ? <Camera size={16} /> : <CameraOff size={16} />}
                {isCameraEnabled ? "Disable Camera" : "Enable Camera"}
            </button>
        </div>

        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur border border-white/10 text-white/70 hover:text-white transition-colors"
        >
          <Info size={20} />
        </button>
      </div>

      {/* Help / Status Tip */}
      {showHelp && (
        <div className="absolute top-24 left-6 max-w-xs p-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-sm text-gray-200 pointer-events-auto transition-opacity">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-amber-200">How to Interact</h3>
                <button onClick={() => setShowHelp(false)}><X size={14}/></button>
            </div>
            <ul className="space-y-2">
                <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">✋</span>
                    <span>Show <strong>Open Palm</strong> to expand the tree.</span>
                </li>
                <li className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">✊</span>
                    <span>Make a <strong>Fist</strong> to contract it.</span>
                </li>
                 <li className="flex items-center gap-2">
                    <MousePointer2 size={14} className="ml-1" />
                    <span>Or click & drag to rotate manually.</span>
                </li>
            </ul>
             <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/50">
                Current Status: <span className="text-cyan-300 font-mono">{handState}</span>
            </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="flex justify-between items-end w-full pointer-events-auto">
        
        {/* Upload Memory */}
        <label className="group flex flex-col items-center gap-2 cursor-pointer">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-900/50 to-blue-900/50 backdrop-blur-md border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,255,255,0.2)]">
            <Upload className="text-cyan-200 group-hover:text-white transition-colors" size={24} />
          </div>
          <span className="text-xs font-light tracking-widest text-cyan-200/70 uppercase">Upload Memory</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>

        {/* Make a Wish */}
        <button 
          onClick={() => setShowWishModal(true)}
          className="group flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-md border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,179,71,0.3)] animate-pulse">
            <Sparkles className="text-amber-200 group-hover:text-white transition-colors" size={28} />
          </div>
          <span className="text-xs font-light tracking-widest text-amber-200/70 uppercase">Make a Wish</span>
        </button>
      </div>

      {/* Wish Modal */}
      {showWishModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-auto">
          <div className="bg-[#0f172a] border border-white/10 p-8 rounded-2xl w-full max-w-md relative shadow-2xl transform transition-all scale-100">
            <button 
              onClick={() => setShowWishModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-2xl font-serif text-amber-100 mb-2 text-center">Cast a Wish</h2>
            <p className="text-sm text-gray-400 mb-6 text-center font-light">
              Your wish will become a star in the celestial tree.
            </p>

            <form onSubmit={handleWishSubmit} className="flex flex-col gap-4">
              <textarea 
                value={wishText}
                onChange={(e) => setWishText(e.target.value)}
                placeholder="I wish for..."
                className="w-full h-32 bg-black/30 border border-white/10 rounded-lg p-4 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 resize-none transition-all"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!wishText.trim()}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg text-white font-medium tracking-wide hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Send size={16} /> Send to the Stars
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interface;
