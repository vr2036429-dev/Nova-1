import React, { useState } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  User, 
  Volume2, 
  ShieldCheck, 
  Fingerprint, 
  Database, 
  Trash2, 
  Radio, 
  Check, 
  Sliders, 
  Sparkles,
  Lock,
  Key,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';
import { UserPreferences, VoiceMode } from '../types';
import { voiceService } from '../services/voiceService';
import { biometricService } from '../services/biometricService';
import { ultronVoiceAuth } from '../services/ultronVoiceAuthService';

interface SettingsModalProps {
  isOpen: boolean;
  preferences: UserPreferences;
  contextFacts: string[];
  onClose: () => void;
  onUpdatePreferences: (prefs: Partial<UserPreferences>) => void;
  onClearMemory: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  preferences,
  contextFacts,
  onClose,
  onUpdatePreferences,
  onClearMemory,
}) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'security' | 'memory' | 'api_key'>('voice');
  const [enrollingBio, setEnrollingBio] = useState(false);
  const [enrollStatus, setEnrollStatus] = useState<string | null>(null);

  // Gemini API Key state management in local device storage
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return localStorage.getItem('ultron_gemini_api_key') || '';
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [keySaveMessage, setKeySaveMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    const cleanKey = apiKeyInput.trim();
    if (cleanKey) {
      localStorage.setItem('ultron_gemini_api_key', cleanKey);
      setKeySaveMessage('Gemini API Key successfully saved to device storage.');
    } else {
      localStorage.removeItem('ultron_gemini_api_key');
      setKeySaveMessage('API Key removed. System will use default environment configuration.');
    }
    setTimeout(() => setKeySaveMessage(null), 3000);
  };

  const handleEnrollBiometrics = async () => {
    setEnrollingBio(true);
    setEnrollStatus('Requesting hardware authenticator...');
    const res = await biometricService.enrollBiometrics(preferences.userName);
    setEnrollingBio(false);
    setEnrollStatus(res.message);
    if (res.success) {
      onUpdatePreferences({ biometricEnrolled: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-[#090f1d] border border-cyan-500/40 rounded-3xl p-6 max-w-xl w-full max-h-[85vh] flex flex-col hologram-glow">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-950 pb-3 mb-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <SettingsIcon className="w-5 h-5" />
            <h3 className="font-cyber font-bold text-white text-base">
              ULTRON SYSTEM CONFIGURATION
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-cyan-950 pb-3 mb-4 text-xs font-mono-code">
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'voice'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice & Audio</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'security'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Biometrics & Security</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'memory'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Context Memory</span>
          </button>

          <button
            onClick={() => setActiveTab('api_key')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'api_key'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Gemini API Key</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs font-mono-code">
          {/* TAB 1: VOICE */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Primary Voice Engine
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => onUpdatePreferences({ voiceEngine: 'live_audio', audioToAudioEnabled: true })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      preferences.voiceEngine !== 'fallback_stt_tts'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-[#060a14] border-slate-800 text-slate-400 hover:border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-200">Live Audio-to-Audio</span>
                      {preferences.voiceEngine !== 'fallback_stt_tts' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] opacity-75">Gemini Live native bidirectional 24kHz audio with instant barge-in</p>
                  </div>

                  <div
                    onClick={() => onUpdatePreferences({ voiceEngine: 'fallback_stt_tts', audioToAudioEnabled: false })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      preferences.voiceEngine === 'fallback_stt_tts'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-[#060a14] border-slate-800 text-slate-400 hover:border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-200">Standard Voice</span>
                      {preferences.voiceEngine === 'fallback_stt_tts' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] opacity-75">Browser Web Speech API (STT → Pipeline → TTS)</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    Voice Activity Detection (VAD) Sensitivity ({preferences.vadSensitivity || 3}/5)
                  </label>
                  <span className="text-[11px] text-cyan-400">
                    {preferences.vadSensitivity === 5 ? 'Ultra-High' : preferences.vadSensitivity === 1 ? 'Low' : 'Balanced'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={preferences.vadSensitivity || 3}
                  onChange={(e) => onUpdatePreferences({ vadSensitivity: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Controls threshold for triggering speech start and real-time interruption (barge-in) when ULTRON is speaking.
                </p>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Interaction Voice Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'continuous', label: 'Continuous Listening', desc: 'Always ready for speech after activation' },
                    { id: 'wakeword', label: 'Wake Word Trigger', desc: 'Responds when "ULTRON" is spoken' },
                    { id: 'push_to_talk', label: 'Push to Talk', desc: 'Manual mic tap only' },
                  ].map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onUpdatePreferences({ voiceMode: m.id as VoiceMode })}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        preferences.voiceMode === m.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-[#060a14] border-slate-800 text-slate-400 hover:border-cyan-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-200">{m.label}</span>
                        {preferences.voiceMode === m.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <p className="text-[11px] opacity-75">{m.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Summon Wake Word
                </label>
                <input
                  type="text"
                  value={preferences.wakeWord}
                  onChange={(e) => onUpdatePreferences({ wakeWord: e.target.value })}
                  className="w-full bg-[#060a14] border border-slate-700 px-3 py-2 rounded-xl text-slate-100"
                  placeholder="ULTRON"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    TTS Voice Pitch ({preferences.ttsPitch})
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={preferences.ttsPitch}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onUpdatePreferences({ ttsPitch: val });
                      voiceService.setPitch(val);
                    }}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    TTS Speech Rate ({preferences.ttsRate})
                  </label>
                  <input
                    type="range"
                    min="0.7"
                    max="1.5"
                    step="0.05"
                    value={preferences.ttsRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onUpdatePreferences({ ttsRate: val });
                      voiceService.setRate(val);
                    }}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => voiceService.speak('ULTRON voice synthesis online and operational at your command.')}
                className="w-full py-2 bg-[#0d1629] hover:bg-cyan-950/60 border border-cyan-500/30 rounded-xl text-cyan-300 transition-colors flex items-center justify-center gap-2"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Voice Synthesis Sample</span>
              </button>
            </div>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* Owner Voice Lock Section */}
              <div className="p-3.5 bg-[#060a14] border border-cyan-500/20 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Lock className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold">Owner Voice Lock (ASIK Only)</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${
                    ultronVoiceAuth.isVoiceLockEnabled()
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {ultronVoiceAuth.isVoiceLockEnabled() ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Strict acoustic vector verification. Automatically rejects unknown voices, synthetic audio clones, and background conversations.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      ultronVoiceAuth.updateSettings({ isVoiceLockEnabled: !ultronVoiceAuth.isVoiceLockEnabled() });
                    }}
                    className="flex-1 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs transition"
                  >
                    {ultronVoiceAuth.isVoiceLockEnabled() ? 'Disable Lock' : 'Enable Voice Lock'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      ultronVoiceAuth.resetEnrollment();
                    }}
                    className="flex-1 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60 text-xs transition"
                  >
                    Re-Enroll Voiceprint
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-[#060a14] border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Fingerprint className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold">Hardware Biometric Authentication</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${
                    preferences.biometricEnrolled 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {preferences.biometricEnrolled ? 'ENROLLED' : 'NOT ENROLLED'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Protects Level 3 restricted tools (security vault, phone dialer, system parameters) using Android fingerprint or WebAuthn platform authenticator.
                </p>

                <button
                  type="button"
                  onClick={handleEnrollBiometrics}
                  disabled={enrollingBio}
                  className="mt-2 w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {enrollingBio ? 'Enrolling Hardware Enclave...' : 'Enroll / Test Biometric Sensor'}
                </button>
                {enrollStatus && (
                  <p className="text-[10px] text-cyan-300 mt-1">{enrollStatus}</p>
                )}
              </div>

              <div className="p-3 bg-[#060a14] border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-semibold block">Auto-Execute Safe Tools</span>
                  <span className="text-[11px] text-slate-400">Open apps, web search, read public screen</span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.autoExecuteSafeTools}
                  onChange={(e) => onUpdatePreferences({ autoExecuteSafeTools: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400"
                />
              </div>

              <div className="p-3 bg-[#060a14] border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-semibold block">Offline Voice Engine Fallback</span>
                  <span className="text-[11px] text-slate-400">Use local rule matching when offline or server unreachable</span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.offlineVoiceEnabled}
                  onChange={(e) => onUpdatePreferences({ offlineVoiceEnabled: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400"
                />
              </div>
            </div>
          )}

          {/* TAB 3: MEMORY */}
          {activeTab === 'memory' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold">
                  Personalized Long-Term Memory ({contextFacts.length})
                </span>
                <button
                  onClick={onClearMemory}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 text-[11px]"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              </div>

              <div className="space-y-2">
                {contextFacts.map((fact, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-[#060a14] border border-slate-800 rounded-xl text-slate-300 text-xs flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span>{fact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: GEMINI API KEY */}
          {activeTab === 'api_key' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#060a14] border border-cyan-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Key className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold">Gemini Multi-Modal API Key</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${
                    apiKeyInput.trim()
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {apiKeyInput.trim() ? 'KEY SAVED' : 'NOT CONFIGURED'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Apni personal Google Gemini API key yahan enter karein. Yeh key aapke device ke secure localStorage mein save hoti hai aur kisi external server par store nahi hoti.
                </p>

                {/* Input container */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 text-xs font-semibold block">
                    API Key (AIzaSy...)
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Paste your Gemini API Key here"
                      className="w-full bg-[#0d1629] border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 pr-10 font-mono-code focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {keySaveMessage && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>{keySaveMessage}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono-code transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    Save Key to Device
                  </button>
                  {apiKeyInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setApiKeyInput('');
                        localStorage.removeItem('ultron_gemini_api_key');
                        setKeySaveMessage('API Key successfully removed.');
                        setTimeout(() => setKeySaveMessage(null), 3000);
                      }}
                      className="px-3.5 py-2 rounded-xl border border-red-500/40 bg-red-950/30 text-red-300 hover:bg-red-900/40 text-xs font-mono-code transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Helpful tips box */}
              <div className="p-3 bg-[#060a14]/60 border border-slate-800 rounded-xl space-y-2 text-slate-400 text-[11px]">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span>Free Gemini API Key kaise lein:</span>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p>1. Google AI Studio (aistudio.google.com) par Google account se login karein.</p>
                <p>2. "Get API key" par click karein aur free key generate karein.</p>
                <p>3. Yahan paste karke "Save Key" dabayein. Done!</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-cyan-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs font-mono-code transition-all"
          >
            Save & Return to HUD
          </button>
        </div>
      </div>
    </div>
  );
};
