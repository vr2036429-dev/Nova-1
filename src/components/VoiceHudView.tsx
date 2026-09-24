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
  ArrowRight,
  Zap,
  RotateCcw,
  Headphones,
  Sliders,
  Lock,
  Fingerprint,
  ShieldCheck
} from 'lucide-react';
import { UltronState, VoiceMode, VoiceEngineType, LiveVoiceState } from '../types';
import { UltronOrb } from './UltronOrb';
import { VoicePipelineDiagnosticsPanel } from './VoicePipelineDiagnosticsPanel';
import { ultronVoiceAuth } from '../services/ultronVoiceAuthService';

interface VoiceHudViewProps {
  state: UltronState;
  isListening: boolean;
  isSpeaking: boolean;
  transcription: string;
  assistantResponseText: string;
  wakeWord: string;
  voiceMode: VoiceMode;
  voiceEngine?: VoiceEngineType;
  liveVoiceState?: LiveVoiceState;
  isMuted?: boolean;
  onToggleListening: () => void;
  onStopSpeaking: () => void;
  onToggleMute?: () => void;
  onToggleEngine?: () => void;
  onInterruptAi?: () => void;
  onOpenVoiceLock?: () => void;
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
  voiceEngine = 'live_audio',
  liveVoiceState,
  isMuted = false,
  onToggleListening,
  onStopSpeaking,
  onToggleMute,
  onToggleEngine,
  onInterruptAi,
  onOpenVoiceLock,
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

  const getStatusLabel = () => {
    if (state === 'USER_SPEAKING') return 'User Speaking (Microphone Active)';
    if (state === 'AI_SPEAKING' || state === 'SPEAKING') return 'ULTRON Speaking (Barge-in Ready)';
    if (state === 'INTERRUPTED') return 'Interrupted / Barged-In';
    if (state === 'PROCESSING' || state === 'THINKING') return 'Processing Directive...';
    if (state === 'RECONNECTING') return 'Reconnecting Live Stream...';
    if (state === 'LISTENING') return 'Listening Continuously';
    if (state === 'ERROR') return 'Notice / Reconnecting';
    return 'Standby / Voice Ready';
  };

  const getStatusColor = () => {
    if (state === 'USER_SPEAKING') return 'text-sky-400 border-sky-500/30 bg-sky-950/40';
    if (state === 'AI_SPEAKING' || state === 'SPEAKING') return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40';
    if (state === 'INTERRUPTED') return 'text-amber-300 border-amber-500/40 bg-amber-950/50';
    if (state === 'PROCESSING' || state === 'THINKING') return 'text-purple-400 border-purple-500/30 bg-purple-950/40';
    if (state === 'LISTENING') return 'text-cyan-300 border-cyan-500/30 bg-cyan-950/40';
    return 'text-slate-400 border-slate-700 bg-slate-900/60';
  };

  return (
    <div className="flex-1 flex flex-col justify-between items-center relative overflow-hidden px-4 py-3 hologram-grid">
      {/* Background Holographic Ring Accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] rounded-full border border-cyan-500/5 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full border border-cyan-500/5 pointer-events-none" />

      {/* Top Banner: Mode, Engine & Wake Word Indicator */}
      <div className="w-full max-w-xl flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#0a1122]/85 backdrop-blur border border-cyan-500/20 rounded-xl text-xs font-mono-code shadow-lg">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <Radio className={`w-3.5 h-3.5 ${isListening ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            {isListening && (
              <span className="absolute w-2 h-2 rounded-full bg-cyan-400/50 animate-ping" />
            )}
          </div>
          
          {/* Engine Selector Pill */}
          {onToggleEngine && (
            <button
              onClick={onToggleEngine}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-300 text-[11px] transition-all hover:scale-105 active:scale-95"
              title="Click to toggle between Native Live Audio-to-Audio and Standard Speech-to-Text/TTS"
            >
              <Zap className={`w-3 h-3 ${voiceEngine === 'live_audio' ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
              <span className="font-semibold">
                {voiceEngine === 'live_audio' ? 'Live Audio-to-Audio (24kHz)' : 'Standard Voice (STT/TTS)'}
              </span>
            </button>
          )}

          <span className="text-slate-400 hidden sm:inline">
            Wake: <strong className="text-cyan-400">"{wakeWord}"</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Microphone Mute Toggle */}
          {onToggleMute && isListening && (
            <button
              onClick={onToggleMute}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors ${
                isMuted 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone stream'}
            >
              {isMuted ? <MicOff className="w-3 h-3 text-amber-400" /> : <Mic className="w-3 h-3 text-cyan-400" />}
              <span>{isMuted ? 'Muted' : 'Mic Active'}</span>
            </button>
          )}

          {/* Barge-In / Interrupt Button */}
          {(isSpeaking || state === 'AI_SPEAKING') && (
            <button
              onClick={onInterruptAi || onStopSpeaking}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition-all active:scale-95 animate-pulse text-[11px]"
              title="Instantly stop ULTRON playback (or simply speak into your mic to barge in naturally)"
            >
              <VolumeX className="w-3 h-3" />
              <span>Interrupt Voice</span>
            </button>
          )}

          {/* State Indicator Pill */}
          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusColor()}`}>
            {state}
          </span>
        </div>
      </div>

      {/* Central Interactive Orb */}
      <div className="relative my-auto flex flex-col items-center justify-center">
        <UltronOrb 
          state={state} 
          onClick={onToggleListening}
          size={290}
        />

        {/* Live Status Sub-header */}
        <div className="mt-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono-code text-cyan-300/90 font-medium">
            {getStatusLabel()}
          </span>
        </div>

        {/* Live Audio Frequency Meter Bar */}
        <div className="flex items-center gap-1 mt-3 h-6 px-4 py-1 bg-[#070b14]/90 border border-cyan-500/25 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-75 ${
                state === 'AI_SPEAKING' || state === 'SPEAKING'
                  ? 'bg-gradient-to-t from-emerald-500 to-cyan-300'
                  : isListening || state === 'USER_SPEAKING'
                  ? 'bg-gradient-to-t from-cyan-500 to-sky-300'
                  : 'bg-slate-700/60'
              }`}
              style={{
                height: state === 'AI_SPEAKING' || state === 'SPEAKING'
                  ? `${Math.max(4, Math.sin((i / 24) * Math.PI) * (22 + (i % 4) * 3))}px`
                  : isListening || state === 'USER_SPEAKING'
                  ? `${Math.max(4, Math.sin((i / 24) * Math.PI) * (18 + (i % 3) * 3))}px`
                  : '4px',
              }}
            />
          ))}
        </div>

        {/* Owner Voice Lock Indicator Badge */}
        {onOpenVoiceLock && (
          <button
            onClick={onOpenVoiceLock}
            className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0a1222]/80 border border-cyan-500/30 hover:border-cyan-400 text-xs font-mono-code text-cyan-300 transition-all hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
          >
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>VOICE LOCK: ASIK ONLY</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </button>
        )}

        {/* Subtitle / Transcription Box */}
        <div className="mt-3 max-w-lg w-full text-center min-h-[52px] px-4 flex flex-col items-center justify-center">
          {transcription ? (
            <div className="animate-fade-in bg-[#080f1e]/80 border border-cyan-500/20 px-4 py-2 rounded-xl backdrop-blur">
              <span className="text-[10px] font-mono-code text-cyan-400 uppercase tracking-widest block mb-0.5">
                ● Live Spoken Input
              </span>
              <p className="text-sm sm:text-base text-slate-100 font-medium tracking-wide">
                "{transcription}"
              </p>
            </div>
          ) : assistantResponseText && (state === 'SPEAKING' || state === 'AI_SPEAKING') ? (
            <div className="animate-fade-in bg-[#061418]/80 border border-emerald-500/25 px-4 py-2 rounded-xl backdrop-blur">
              <span className="text-[10px] font-mono-code text-emerald-400 uppercase tracking-widest block mb-0.5">
                ● ULTRON Spoken Response (Live Audio)
              </span>
              <p className="text-xs sm:text-sm text-slate-200 line-clamp-3">
                {assistantResponseText}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs font-mono-code text-slate-400">
                {isListening 
                  ? voiceEngine === 'live_audio'
                    ? 'Continuous Audio-to-Audio active. Speak naturally — speak to interrupt at any time.'
                    : 'Speak naturally or summon "ULTRON" followed by your command...' 
                  : 'Tap central orb or mic button below to activate real-time voice conversation.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Live 10-Stage Voice Pipeline Telemetry & Self-Test Panel */}
      <VoicePipelineDiagnosticsPanel 
        className="my-1.5"
        onRunTestUtterance={(testPrompt) => onSubmitCommand(testPrompt, true)}
      />

      {/* Quick Action Chips */}
      <div className="w-full max-w-2xl mt-1 mb-2">
        <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Jarvis Voice Directives</span>
          </div>
          <span className="text-slate-500 text-[9px]">Tap to execute or speak aloud</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {quickCommands.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => onSubmitCommand(cmd.prompt, false)}
              className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-[#0e172a]/85 hover:bg-cyan-950/60 border border-cyan-500/20 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 text-xs font-mono-code transition-all active:scale-95 flex items-center gap-1"
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
                ? 'bg-gradient-to-br from-cyan-400 to-sky-600 text-slate-950 shadow-[0_0_18px_rgba(6,182,212,0.7)] animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700'
            }`}
            title={isListening ? 'Stop Voice Listening' : 'Start Real-time Voice Session'}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={
              voiceEngine === 'live_audio'
                ? "Speak aloud or type command (e.g. Open YouTube, research AI)..."
                : "Type or speak Jarvis command..."
            }
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

