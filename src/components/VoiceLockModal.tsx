import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Mic, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Play, 
  RefreshCw, 
  Volume2, 
  Sparkles, 
  ShieldAlert, 
  Activity, 
  Check, 
  Sliders, 
  Trash2,
  Fingerprint
} from 'lucide-react';
import { ultronVoiceAuth, UltronVoiceAuthService } from '../services/ultronVoiceAuthService';
import { OwnerVoiceProfile, VoiceSecuritySensitivity, VoiceSecurityTestCase } from '../types';

interface VoiceLockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceLockModal: React.FC<VoiceLockModalProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<OwnerVoiceProfile | null>(ultronVoiceAuth.getProfile());
  const [activeTab, setActiveTab] = useState<'status' | 'enrollment' | 'settings' | 'test_suite'>('status');
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState<number>(0);
  const [isRecordingSample, setIsRecordingSample] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<VoiceSecurityTestCase[]>([]);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  useEffect(() => {
    const unsub = ultronVoiceAuth.subscribe(() => {
      setProfile(ultronVoiceAuth.getProfile());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleEnrollStep = async () => {
    setIsRecordingSample(true);
    // Simulate recording phrase
    await new Promise((r) => setTimeout(r, 1200));
    await ultronVoiceAuth.enrollVoiceSample(currentPhraseIndex);
    setIsRecordingSample(false);
    if (currentPhraseIndex < UltronVoiceAuthService.ENROLLMENT_PHRASES.length - 1) {
      setCurrentPhraseIndex((prev) => prev + 1);
    }
  };

  const handleRunSecurityTests = async () => {
    setIsRunningTests(true);
    const results = await ultronVoiceAuth.runSecurityTestSuite();
    setTestResults(results);
    setIsRunningTests(false);
  };

  const handleToggleLock = (enabled: boolean) => {
    ultronVoiceAuth.updateSettings({ isVoiceLockEnabled: enabled });
  };

  const handleSensitivityChange = (sens: VoiceSecuritySensitivity) => {
    ultronVoiceAuth.updateSettings({ sensitivity: sens });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#090f1d] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#0a1426] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
              <Fingerprint className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-cyber font-bold tracking-wider text-cyan-300 text-sm">
                  OWNER VOICE AUTHENTICATION & VOICE LOCK
                </h3>
                <span className={`text-[10px] font-mono-code px-2 py-0.2 rounded-full border ${
                  profile?.isVoiceLockEnabled 
                    ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400' 
                    : 'bg-amber-950/70 border-amber-500/40 text-amber-400'
                }`}>
                  {profile?.isVoiceLockEnabled ? 'LOCK ENABLED' : 'LOCK DISABLED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono-code">
                Owner biometric voiceprint protection for ASIK. Unrecognized voices are discarded.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#060a14] px-4 text-xs font-mono-code">
          {[
            { id: 'status', label: 'Lock Status' },
            { id: 'enrollment', label: 'Voice Enrollment' },
            { id: 'settings', label: 'Security Policy' },
            { id: 'test_suite', label: 'Security Test Mode' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono-code text-xs">
          {/* TAB 1: STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 mb-1">Owner Voice Guard</h4>
                  <p className="text-[11px] text-slate-400">
                    Restricts voice command execution strictly to ASIK's authenticated voice.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleLock(!profile?.isVoiceLockEnabled)}
                  className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition ${
                    profile?.isVoiceLockEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {profile?.isVoiceLockEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  <span>{profile?.isVoiceLockEnabled ? 'Voice Lock Active' : 'Enable Voice Lock'}</span>
                </button>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#070d18] border border-cyan-500/20">
                  <span className="text-slate-500 text-[10px] block">AUTHENTICATED OWNER</span>
                  <span className="text-slate-100 font-bold text-sm">{profile?.ownerName || 'ASIK'}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#070d18] border border-cyan-500/20">
                  <span className="text-slate-500 text-[10px] block">SECURITY SENSITIVITY</span>
                  <span className="text-cyan-300 font-bold text-sm uppercase">{profile?.sensitivity || 'Balanced'}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#070d18] border border-cyan-500/20">
                  <span className="text-slate-500 text-[10px] block">ENROLLED SAMPLES</span>
                  <span className="text-emerald-400 font-bold text-sm">{profile?.samplesCount || 0} / 4 Calibrated</span>
                </div>
                <div className="p-3 rounded-xl bg-[#070d18] border border-cyan-500/20">
                  <span className="text-slate-500 text-[10px] block">ANTI-SPOOFING SHIELD</span>
                  <span className="text-purple-300 font-bold text-sm">
                    {profile?.antiSpoofingEnabled ? 'Synthetic / Replay Filtered' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Master Security Rule Banner */}
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-200 text-[11px] leading-relaxed">
                <span className="font-bold text-cyan-300 block mb-1">MASTER SECURITY RULE:</span>
                "Voice detected → Identify speaker → Authenticate speaker → Authorize command → Execute if permitted. Unauthenticated speakers are discarded with zero execution."
              </div>
            </div>
          )}

          {/* TAB 2: VOICE ENROLLMENT WIZARD */}
          {activeTab === 'enrollment' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <h4 className="text-sm font-bold text-cyan-300 mb-1">Multi-Phrase Voiceprint Calibration</h4>
                <p className="text-[11px] text-slate-400 mb-4">
                  Enroll multiple natural speech phrases to capture pitch, harmonics, and vocal tract formants.
                </p>

                {/* Phrase Stepper */}
                <div className="space-y-2 mb-4">
                  {UltronVoiceAuthService.ENROLLMENT_PHRASES.map((phrase, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                        idx === currentPhraseIndex
                          ? 'bg-cyan-950/50 border-cyan-400/50 text-cyan-100'
                          : idx < (profile?.samplesCount || 0)
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-950/40 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs">"{phrase}"</span>
                      </div>
                      {idx < (profile?.samplesCount || 0) && (
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => ultronVoiceAuth.resetEnrollment()}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Reset Profile
                  </button>

                  <button
                    onClick={handleEnrollStep}
                    disabled={isRecordingSample}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  >
                    <Mic className={`w-3.5 h-3.5 ${isRecordingSample ? 'animate-pulse text-rose-600' : ''}`} />
                    <span>{isRecordingSample ? 'Calibrating Acoustic Vector...' : `Record Phrase ${currentPhraseIndex + 1}`}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY POLICY SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              {/* Sensitivity Selection */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-200 block">Security Sensitivity</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['strict', 'balanced', 'relaxed'] as VoiceSecuritySensitivity[]).map((sens) => (
                    <button
                      key={sens}
                      onClick={() => handleSensitivityChange(sens)}
                      className={`p-2.5 rounded-lg border text-center transition ${
                        profile?.sensitivity === sens
                          ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 font-bold'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span className="capitalize block text-xs">{sens}</span>
                      <span className="text-[10px] text-slate-500">
                        {sens === 'strict' ? '0.85 Threshold' : sens === 'balanced' ? '0.75 Threshold' : '0.65 Threshold'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                  <div>
                    <span className="text-xs text-slate-200 font-semibold block">Anti-Spoofing & Replay Filter</span>
                    <span className="text-[10px] text-slate-500">
                      Detects synthetic TTS voices, speaker replayed audio, and clipping.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile?.antiSpoofingEnabled ?? true}
                    onChange={(e) => ultronVoiceAuth.updateSettings({ antiSpoofingEnabled: e.target.checked })}
                    className="w-4 h-4 accent-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                  <div>
                    <span className="text-xs text-slate-200 font-semibold block">Silently Ignore Unknown Voices</span>
                    <span className="text-[10px] text-slate-500">
                      Do not vocalize error messages or notify strangers when they speak.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile?.silentRejectUnknown ?? true}
                    onChange={(e) => ultronVoiceAuth.updateSettings({ silentRejectUnknown: e.target.checked })}
                    className="w-4 h-4 accent-cyan-400"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY TEST MODE */}
          {activeTab === 'test_suite' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">10-Point Voice Security Test Suite</h4>
                  <p className="text-[10px] text-slate-400">
                    Verify behavior against unknown voices, synthetic audio, and overlapping speech.
                  </p>
                </div>
                <button
                  onClick={handleRunSecurityTests}
                  disabled={isRunningTests}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>{isRunningTests ? 'Running Audit...' : 'Run 10-Point Audit'}</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {testResults.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-slate-500 text-xs">
                    Click "Run 10-Point Audit" to execute the voice security test cases.
                  </div>
                ) : (
                  testResults.map((tc) => (
                    <div
                      key={tc.id}
                      className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-xs">{tc.name}</span>
                          <span className="text-[9px] text-slate-500">({tc.speaker})</span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{tc.sampleDescription}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          tc.passed
                            ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                            : 'text-rose-400 bg-rose-950/40 border-rose-500/30'
                        }`}>
                          {tc.actualOutcome}
                        </span>
                        {tc.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0a1426] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code transition"
          >
            Close & Save
          </button>
        </div>
      </div>
    </div>
  );
};
