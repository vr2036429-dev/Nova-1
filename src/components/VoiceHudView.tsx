import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Terminal, 
  Radio, 
  CheckCircle2, 
  Search, 
  Smartphone, 
  FileText, 
  Compass,
  ArrowRight
} from 'lucide-react';
import { UltronState, VoiceMode } from '../types';
import { UltronOrb } from './UltronOrb';

interface VoiceHudViewProps {
  state: UltronState;
  isListening: boolean;
  isSpeaking: boolean;
  transcription: string;
  assistantResponseText: string;
  wakeWord: string;
  voiceMode: VoiceMode;
  onToggleListening: () => void;
  onStopSpeaking: () => void;
  onSubmitCommand: (command: string, isVoiceInput?: boolean) => void;
}

export const VoiceHudView: React.FC<VoiceHudViewProps> = ({
  state,
  isListening,
  isSpeaking,
  transcription,
  assistantResponseText,
  wakeWord,
  voiceMode,
  onToggleListening,
  onStopSpeaking,
  onSubmitCommand,
}) => {
  const [manualText, setManualText] = useState('');

  const quickCommands = [
    { label: 'Open YouTube', prompt: 'Open YouTube' },
    { label: 'Research Android AI', prompt: 'Research the latest Android AI assistant technologies' },
    { label: 'What is on my screen?', prompt: 'What is on my screen?' },
    { label: 'Check Battery Level', prompt: 'Check device battery diagnostics' },
    { label: 'Turn on Flashlight', prompt: 'Turn on flashlight' },
    { label: 'Find PDF Notes', prompt: 'Find my PDF files and summarize them' },
    { label: 'Call John', prompt: 'Call John' },
    { label: 'Morning Tech Briefing', prompt: 'Research tech news and save summary' },
  ];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    onSubmitCommand(manualText.trim(), false);
    setManualText('');
  };

  return (
    <div className="flex-1 flex flex-col justify-between items-center relative overflow-hidden px-4 py-3 hologram-grid">
      {/* Background Holographic Ring Accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] rounded-full border border-cyan-500/5 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full border border-cyan-500/5 pointer-events-none" />

      {/* Top Banner: Mode & Wake Word Indicator */}
      <div className="w-full max-w-xl flex items-center justify-between gap-2 px-3 py-1.5 bg-[#0a1122]/70 backdrop-blur border border-cyan-500/20 rounded-xl text-xs font-mono-code">
        <div className="flex items-center gap-2">
          <Radio className={`w-3.5 h-3.5 ${isListening ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
          <span className="text-slate-400">
            {voiceMode === 'continuous' ? (
              <span className="text-cyan-300">Continuous Voice Active</span>
            ) : (
              <span>Wake Mode: <strong className="text-cyan-400">"{wakeWord}"</strong></span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <button
              onClick={onStopSpeaking}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors"
            >
              <VolumeX className="w-3 h-3" />
              <span>Mute Voice</span>
            </button>
          )}
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            {state}
          </span>
        </div>
      </div>

      {/* Central Interactive Orb */}
      <div className="relative my-auto flex flex-col items-center justify-center">
        <UltronOrb 
          state={state} 
          onClick={onToggleListening}
          size={300}
        />

        {/* Live Audio Frequency Meter Bar */}
        <div className="flex items-center gap-1 mt-4 h-6 px-4 py-1 bg-[#070b14]/80 border border-cyan-500/20 rounded-full">
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-75 ${
                isListening || isSpeaking
                  ? 'bg-gradient-to-t from-cyan-500 to-sky-300'
                  : 'bg-slate-700'
              }`}
              style={{
                height: isListening || isSpeaking
                  ? `${Math.max(4, Math.sin((i / 18) * Math.PI) * (20 + (i % 3) * 4))}px`
                  : '4px',
              }}
            />
          ))}
        </div>

        {/* Subtitle / Transcription Box */}
        <div className="mt-4 max-w-lg w-full text-center min-h-[48px] px-4 flex flex-col items-center justify-center">
          {transcription ? (
            <div className="animate-fade-in">
              <span className="text-xs font-mono-code text-cyan-400/80 uppercase tracking-widest block mb-0.5">
                Incoming Voice
              </span>
              <p className="text-base text-slate-100 font-medium tracking-wide">
                "{transcription}"
              </p>
            </div>
          ) : assistantResponseText && state === 'SPEAKING' ? (
            <div className="animate-fade-in">
              <span className="text-xs font-mono-code text-emerald-400/80 uppercase tracking-widest block mb-0.5">
                ULTRON Speaking
              </span>
              <p className="text-sm text-slate-200 line-clamp-2">
                {assistantResponseText}
              </p>
            </div>
          ) : (
            <p className="text-xs font-mono-code text-slate-400">
              {isListening 
                ? 'Speak naturally or summon "ULTRON" followed by your command...' 
                : 'Tap central orb or mic button below to activate voice recognition.'}
            </p>
          )}
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="w-full max-w-2xl mt-1 mb-3">
        <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Jarvis Voice Directives</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {quickCommands.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => onSubmitCommand(cmd.prompt, false)}
              className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-[#0e172a]/80 hover:bg-cyan-950/60 border border-cyan-500/20 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 text-xs font-mono-code transition-all active:scale-95 flex items-center gap-1"
            >
              <span>{cmd.label}</span>
              <ArrowRight className="w-2.5 h-2.5 opacity-60" />
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Command Bar: Mic Button + Keyboard Input Drawer */}
      <div className="w-full max-w-xl">
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2 bg-[#090f1d]/90 p-1.5 rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
          {/* Main Voice Activation Toggle */}
          <button
            type="button"
            onClick={onToggleListening}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              isListening
                ? 'bg-gradient-to-br from-cyan-400 to-sky-600 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.6)] animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700'
            }`}
            title={isListening ? 'Stop Voice Listening' : 'Start Voice Listening'}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Fallback Text Input */}
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Speak or type Jarvis command (e.g. Open YouTube, research AI)..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-mono-code"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!manualText.trim()}
            className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-40 disabled:pointer-events-none border border-cyan-500/40 flex items-center justify-center transition-all active:scale-95"
            title="Execute Command"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
