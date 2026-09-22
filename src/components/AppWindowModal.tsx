import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Search, 
  Wifi, 
  Bluetooth, 
  Volume2, 
  Camera, 
  Battery, 
  Play, 
  Globe, 
  ArrowLeft, 
  Home, 
  Maximize2 
} from 'lucide-react';

interface AppWindowModalProps {
  isOpen: boolean;
  appName: string;
  actionParam?: string;
  onClose: () => void;
}

export const AppWindowModal: React.FC<AppWindowModalProps> = ({
  isOpen,
  appName,
  actionParam,
  onClose,
}) => {
  const [calcInput, setCalcInput] = useState('0');
  const [cameraActive, setCameraActive] = useState(false);
  const [browserUrl, setBrowserUrl] = useState(actionParam || 'https://www.google.com');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none">
      <div className="bg-[#080d19] border border-cyan-500/40 rounded-3xl w-full max-w-2xl h-[75vh] max-h-[640px] flex flex-col shadow-[0_0_40px_rgba(6,182,212,0.2)] overflow-hidden">
        {/* Android Window Titlebar */}
        <div className="bg-[#05070f] px-4 py-3 border-b border-cyan-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-cyber font-bold text-white text-sm tracking-wide">
              {appName.toUpperCase()} (ANDROID RUNTIME)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content body based on app */}
        <div className="flex-1 bg-[#0b1222] p-4 overflow-y-auto font-sans">
          {appName.toLowerCase().includes('youtube') && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${actionParam || 'dQw4w9WgXcQ'}`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
                <span>Android YouTube Player Client</span>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(actionParam || 'Android AI')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:underline"
                >
                  <span>Open in YouTube App</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {appName.toLowerCase().includes('settings') && (
            <div className="space-y-3 font-mono-code text-xs">
              <h4 className="font-cyber text-sm text-cyan-400 mb-2">ANDROID SYSTEM CONFIGURATION</h4>
              <div className="space-y-2">
                <div className="p-3 bg-[#060a14] rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Wifi className="w-4 h-4 text-cyan-400" />
                    <span>Wi-Fi Network</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">CONNECTED (5GHz ULTRON-MESH)</span>
                </div>

                <div className="p-3 bg-[#060a14] rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Bluetooth className="w-4 h-4 text-cyan-400" />
                    <span>Bluetooth</span>
                  </div>
                  <span className="text-cyan-300">DISCOVERABLE (Stark Neural Buds)</span>
                </div>

                <div className="p-3 bg-[#060a14] rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Battery className="w-4 h-4 text-cyan-400" />
                    <span>Battery Saver</span>
                  </div>
                  <span className="text-slate-400">DISABLED (High Performance NPU)</span>
                </div>
              </div>
            </div>
          )}

          {appName.toLowerCase().includes('chrome') && (
            <div className="h-full flex flex-col space-y-3">
              <div className="flex items-center gap-2 bg-[#060a14] p-2 rounded-xl border border-slate-800 text-xs font-mono-code">
                <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <input
                  type="text"
                  value={browserUrl}
                  onChange={(e) => setBrowserUrl(e.target.value)}
                  className="flex-1 bg-transparent text-slate-200 focus:outline-none"
                />
                <a
                  href={browserUrl.startsWith('http') ? browserUrl : `https://${browserUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 flex items-center gap-1"
                >
                  <span>Launch</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex-1 bg-[#060a14] rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center">
                <Search className="w-10 h-10 text-cyan-400/60 mb-2" />
                <h5 className="font-cyber text-slate-200 text-sm">Google Chrome Android Navigator</h5>
                <p className="text-xs font-mono-code text-slate-400 mt-1 max-w-sm">
                  Active URL navigation: {browserUrl}. Click Launch to open in full tab or let ULTRON summarize web content directly.
                </p>
              </div>
            </div>
          )}

          {appName.toLowerCase().includes('calculator') && (
            <div className="max-w-xs mx-auto space-y-3">
              <div className="bg-[#050810] border border-cyan-500/30 p-4 rounded-2xl text-right font-mono-code text-2xl text-cyan-300 overflow-x-auto">
                {calcInput}
              </div>
              <div className="grid grid-cols-4 gap-2 font-mono-code text-sm">
                {['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => {
                      if (btn === 'C') setCalcInput('0');
                      else if (btn === '=') {
                        try {
                          // Safe arithmetic evaluation
                          const clean = calcInput.replace(/[^0-9+\-*/.]/g, '');
                          // eslint-disable-next-line no-eval
                          setCalcInput(String(Function(`'use strict'; return (${clean})`)()));
                        } catch (e) {
                          setCalcInput('Error');
                        }
                      } else {
                        setCalcInput(prev => prev === '0' ? btn : prev + btn);
                      }
                    }}
                    className={`p-3 rounded-xl transition-all active:scale-95 ${
                      btn === '='
                        ? 'bg-cyan-500 text-slate-950 font-bold col-span-2'
                        : btn === 'C'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 hover:border-cyan-500/40'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!appName.toLowerCase().includes('youtube') &&
           !appName.toLowerCase().includes('settings') &&
           !appName.toLowerCase().includes('chrome') &&
           !appName.toLowerCase().includes('calculator') && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 font-mono-code">
              <div className="w-16 h-16 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center">
                <Play className="w-8 h-8 text-cyan-400" />
              </div>
              <h4 className="font-cyber font-bold text-lg text-white">
                {appName.toUpperCase()} LAUNCHED
              </h4>
              <p className="text-xs text-slate-400 max-w-md">
                Application intent was executed via Android Intent Bridge. Action parameter: "{actionParam || 'default'}".
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                Return to ULTRON Core
              </button>
            </div>
          )}
        </div>

        {/* Android Navigation Bar */}
        <div className="bg-[#05070f] px-6 py-2.5 border-t border-cyan-950 flex items-center justify-around text-slate-500">
          <button onClick={onClose} className="p-1 hover:text-slate-200" title="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-1 hover:text-slate-200" title="Home">
            <Home className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-1 hover:text-slate-200" title="Recent Apps">
            <div className="w-4 h-4 border-2 border-current rounded-sm" />
          </button>
        </div>
      </div>
    </div>
  );
};
