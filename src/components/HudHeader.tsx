import React from 'react';
import { 
  ShieldCheck, 
  BatteryCharging, 
  Battery, 
  Wifi, 
  Mic, 
  MicOff, 
  Radio, 
  Sparkles,
  Zap,
  Layers,
  Settings,
  MessageSquare,
  Wrench,
  Flashlight
} from 'lucide-react';
import { UltronState, ViewTab, DeviceStatus } from '../types';

interface HudHeaderProps {
  state: UltronState;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  deviceStatus: DeviceStatus;
  isListening: boolean;
  biometricEnrolled: boolean;
  onToggleTorch?: () => void;
  onToggleMic?: () => void;
}

export const HudHeader: React.FC<HudHeaderProps> = ({
  state,
  activeTab,
  onTabChange,
  deviceStatus,
  isListening,
  biometricEnrolled,
  onToggleTorch,
  onToggleMic,
}) => {
  const getStateBadge = () => {
    switch (state) {
      case 'LISTENING':
        return { text: 'LISTENING', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', dot: 'bg-cyan-400 animate-ping' };
      case 'THINKING':
        return { text: 'NEURAL PROCESSING', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40', dot: 'bg-purple-400 animate-spin' };
      case 'SEARCHING':
        return { text: 'WEB RESEARCH', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', dot: 'bg-amber-400 animate-pulse' };
      case 'EXECUTING':
        return { text: 'EXECUTING TOOL', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40', dot: 'bg-blue-400 animate-bounce' };
      case 'SPEAKING':
        return { text: 'VOICE SYNTHESIS', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400 animate-pulse' };
      case 'ERROR':
        return { text: 'SYSTEM ALERT', bg: 'bg-red-500/20 text-red-300 border-red-500/40', dot: 'bg-red-400 animate-ping' };
      case 'STANDBY':
      default:
        return { text: 'STANDBY', bg: 'bg-slate-800/60 text-slate-400 border-slate-700/50', dot: 'bg-slate-500' };
    }
  };

  const badge = getStateBadge();

  return (
    <header className="w-full bg-[#070b14]/90 backdrop-blur-md border-b border-cyan-950/40 px-3 py-2.5 z-40 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand Identity & State Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center relative overflow-hidden group">
              <Zap className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-cyan-400/10 blur-sm pointer-events-none" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-cyber font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-white text-base">
                  ULTRON
                </span>
                <span className="text-[10px] font-mono-code px-1 py-0.2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                  v2.5 AI
                </span>
              </div>
              <div className="text-[9px] font-mono-code text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>ANDROID JARVIS CORE</span>
              </div>
            </div>
          </div>

          {/* Active State Pill */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono-code tracking-wider transition-colors duration-300 ${badge.bg}`}>
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            <span>{badge.text}</span>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center bg-[#0d1424]/80 p-0.5 rounded-xl border border-slate-800/80">
          <button
            onClick={() => onTabChange('orb_hud')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'orb_hud'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Voice HUD and Energy Orb"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Voice HUD</span>
          </button>

          <button
            onClick={() => onTabChange('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Conversation Stream"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Chat</span>
          </button>

          <button
            onClick={() => onTabChange('automation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'automation'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Smart Workflows & Routines"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Automations</span>
          </button>

          <button
            onClick={() => onTabChange('tools')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'tools'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tools & Android Apps"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Tools</span>
          </button>

          <button
            onClick={() => onTabChange('settings')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="System Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </nav>

        {/* Right: Telemetry & Hardware Indicators */}
        <div className="flex items-center gap-2 font-mono-code text-xs">
          {/* Quick Torch Toggle */}
          <button
            onClick={onToggleTorch}
            className={`p-1.5 rounded-lg border transition-colors ${
              deviceStatus.torchOn
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title={deviceStatus.torchOn ? 'Flashlight ON' : 'Flashlight OFF'}
          >
            <Flashlight className="w-3.5 h-3.5" />
          </button>

          {/* Quick Mic Toggle */}
          <button
            onClick={onToggleMic}
            className={`p-1.5 rounded-lg border transition-colors ${
              isListening
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title={isListening ? 'Microphone Active' : 'Microphone Muted'}
          >
            {isListening ? <Mic className="w-3.5 h-3.5 text-cyan-400" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>

          {/* Biometric Enclave Status */}
          <div 
            className="hidden sm:flex items-center gap-1 px-2 py-1 bg-emerald-950/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px]"
            title="Biometric Hardware Enclave Active"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="hidden lg:inline">BIO-LOCK</span>
          </div>

          {/* Battery Status */}
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-900/60 border border-slate-800 rounded-lg text-slate-300 text-[11px]">
            {deviceStatus.isCharging ? (
              <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Battery className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{(deviceStatus.batteryLevel * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </header>
  );
};
