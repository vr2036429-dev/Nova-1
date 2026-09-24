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
  Flashlight,
  Compass,
  Eye,
  Globe,
  Activity,
  Code,
  Lock
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
  onOpenVoiceLock?: () => void;
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
  onOpenVoiceLock,
}) => {
  const getStateBadge = () => {
    switch (state) {
      case 'LISTENING':
      case 'USER_SPEAKING':
        return { text: 'LISTENING', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', dot: 'bg-cyan-400 animate-ping' };
      case 'UNDERSTANDING':
        return { text: 'PERCEPTION / VISION REASONING', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', dot: 'bg-indigo-400 animate-pulse' };
      case 'THINKING':
      case 'PROCESSING':
        return { text: 'NEURAL PROCESSING', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40', dot: 'bg-purple-400 animate-spin' };
      case 'SEARCHING':
        return { text: 'WEB RESEARCH', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', dot: 'bg-amber-400 animate-pulse' };
      case 'EXECUTING':
        return { text: 'EXECUTING TOOL', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40', dot: 'bg-blue-400 animate-bounce' };
      case 'SPEAKING':
      case 'AI_SPEAKING':
        return { text: 'VOICE SYNTHESIS', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400 animate-pulse' };
      case 'INTERRUPTED':
        return { text: 'USER BARGE-IN', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', dot: 'bg-amber-400' };
      case 'RECONNECTING':
        return { text: 'RECONNECTING AUDIO', bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', dot: 'bg-yellow-400 animate-spin' };
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
        <nav className="flex items-center bg-[#0d1424]/90 p-0.5 rounded-xl border border-slate-800/80 overflow-x-auto max-w-[55vw] sm:max-w-none no-scrollbar">
          <button
            onClick={() => onTabChange('orb_hud')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === 'orb_hud'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Voice HUD and Energy Orb"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Voice HUD</span>
          </button>

          <button
            onClick={() => onTabChange('chat')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === 'chat'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Conversation Stream"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Chat</span>
          </button>

          <button
            onClick={() => onTabChange('tasks')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === 'tasks'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Task Continuity & Planner"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Tasks</span>
          </button>

          <button
            onClick={() => onTabChange('multimodal')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === 'multimodal'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Screen Intelligence & Vision"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Vision</span>
          </button>

          <button
            onClick={() => onTabChange('research')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === 'research'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Deep Web Research Agent"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Research</span>
          </button>

          <button
            onClick={() => onTabChange('automation')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === 'automation'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Smart Workflows & Routines"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Automations</span>
          </button>

          <button
            onClick={() => onTabChange('tools')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === 'tools'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tools & Android Apps"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Tools</span>
          </button>

          <button
            onClick={() => onTabChange('coder')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === 'coder'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="ULTRON Coder & Developer Mode"
          >
            <Code className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Coder</span>
          </button>

          <button
            onClick={() => onTabChange('diagnostics')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === 'diagnostics'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="System Diagnostics & Telemetry"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Diagnostics</span>
          </button>

          <button
            onClick={() => onTabChange('security')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeTab === 'security'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Owner Voice Security Center & Biometric Identity"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Security</span>
          </button>

          <button
            onClick={() => onTabChange('settings')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
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

          {/* Owner Voice Lock Status */}
          <button
            onClick={onOpenVoiceLock}
            className="flex items-center gap-1 px-2 py-1 bg-cyan-950/50 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 rounded-lg text-[11px] transition-colors"
            title="Owner Voice Lock & Biometric Speaker Authentication"
          >
            <Lock className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">VOICE-LOCK</span>
          </button>

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
