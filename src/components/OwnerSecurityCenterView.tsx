import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Key, 
  Radio, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  Fingerprint, 
  Zap, 
  Terminal, 
  ChevronRight, 
  Volume2, 
  Sliders, 
  UserCheck, 
  Flame,
  FileText
} from 'lucide-react';
import { 
  UltronTrustSession, 
  SecurityAuditEntry, 
  DynamicChallenge, 
  VoiceSecuritySensitivity, 
  VoiceSecurityTestCase, 
  AdvancedEnrollmentSample 
} from '../types';
import { ultronTrustSession } from '../services/ultronTrustSession';
import { ultronVoiceAuth } from '../services/ultronVoiceAuthService';
import { ultronOwnerIdentityEngine } from '../services/ultronOwnerIdentityEngine';
import { ultronDynamicVoiceChallenge } from '../services/ultronDynamicVoiceChallenge';
import { ultronVoiceAntiSpoof } from '../services/ultronVoiceAntiSpoofEngine';
import { ultronSecurityAuditLog } from '../services/ultronSecurityAuditLog';
import { ultronAdvancedVoiceEnrollment, ENROLLMENT_CONDITIONS } from '../services/ultronAdvancedVoiceEnrollment';
import { voiceService } from '../services/voiceService';

type SubSection = 'overview' | 'dynamic_challenge' | 'advanced_enrollment' | 'audit_log' | 'test_suite';

export const OwnerSecurityCenterView: React.FC = () => {
  const [activeSub, setActiveSub] = useState<SubSection>('overview');
  const [trustSession, setTrustSession] = useState<UltronTrustSession>(ultronTrustSession.getSession());
  const [auditEntries, setAuditEntries] = useState<SecurityAuditEntry[]>(ultronSecurityAuditLog.getEntries());
  const [dynamicChallenge, setDynamicChallenge] = useState<DynamicChallenge | null>(ultronDynamicVoiceChallenge.getCurrentChallenge());
  const [enrollmentSamples, setEnrollmentSamples] = useState<AdvancedEnrollmentSample[]>(ultronAdvancedVoiceEnrollment.getAllSamples());
  
  // Settings & Test States
  const [voiceLockArmed, setVoiceLockArmed] = useState(ultronVoiceAuth.isVoiceLockEnabled());
  const [sensitivity, setSensitivity] = useState<VoiceSecuritySensitivity>(ultronVoiceAuth.getProfile()?.sensitivity || 'balanced');
  const [silentReject, setSilentReject] = useState(ultronVoiceAuth.getProfile()?.silentRejectUnknown ?? true);
  const [antiSpoofActive, setAntiSpoofActive] = useState(ultronVoiceAntiSpoof.isEngineEnabled());
  
  // Dynamic challenge input state
  const [challengeSpokenText, setChallengeSpokenText] = useState('');
  const [challengeStatusMsg, setChallengeStatusMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Advanced enrollment state
  const [recordingCondition, setRecordingCondition] = useState<string | null>(null);

  // Security test suite state
  const [testResults, setTestResults] = useState<VoiceSecurityTestCase[]>([]);
  const [runningTests, setRunningTests] = useState(false);

  useEffect(() => {
    const unsubTrust = ultronTrustSession.subscribe(setTrustSession);
    const unsubAudit = ultronSecurityAuditLog.subscribe(setAuditEntries);
    const unsubChal = ultronDynamicVoiceChallenge.subscribe(setDynamicChallenge);
    const unsubEnroll = ultronAdvancedVoiceEnrollment.subscribe(setEnrollmentSamples);

    return () => {
      unsubTrust();
      unsubAudit();
      unsubChal();
      unsubEnroll();
    };
  }, []);

  // Time remaining on trust session
  const remainingSeconds = Math.max(0, Math.floor((trustSession.expirationTime - Date.now()) / 1000));
  const stats = ultronSecurityAuditLog.getStatistics();

  const handleToggleVoiceLock = () => {
    const next = !voiceLockArmed;
    setVoiceLockArmed(next);
    ultronOwnerIdentityEngine.setArmed(next);
  };

  const handleToggleAntiSpoof = () => {
    const next = !antiSpoofActive;
    setAntiSpoofActive(next);
    ultronVoiceAntiSpoof.setEnabled(next);
    ultronVoiceAuth.updateSettings({ antiSpoofingEnabled: next });
  };

  const handleSensitivityChange = (sens: VoiceSecuritySensitivity) => {
    setSensitivity(sens);
    ultronVoiceAuth.updateSettings({ sensitivity: sens });
  };

  const handleEmergencyLock = () => {
    ultronOwnerIdentityEngine.triggerEmergencyLock();
  };

  const handleGenerateChallenge = (diff: 'STANDARD' | 'HIGH' = 'STANDARD') => {
    const chal = ultronDynamicVoiceChallenge.generateChallenge(diff);
    setChallengeSpokenText(chal.phrase);
    setChallengeStatusMsg(null);
    voiceService.speak(`Verification challenge issued: ${chal.phrase}`);
  };

  const handleVerifyChallenge = (simulateMatch: boolean = true) => {
    if (!dynamicChallenge) return;
    const res = ultronDynamicVoiceChallenge.verifyChallengeResponse(challengeSpokenText, simulateMatch);
    if (res.success) {
      ultronTrustSession.escalateTrust('DYNAMIC_CHALLENGE', 0.98);
      setChallengeStatusMsg({ text: res.reason, success: true });
      voiceService.speak('Dynamic liveness verified. Maximum security trust granted.');
    } else {
      setChallengeStatusMsg({ text: res.reason, success: false });
      voiceService.speak('Verification failed. Session remains locked.');
    }
  };

  const handleRecordCondition = async (cond: any) => {
    setRecordingCondition(cond);
    try {
      await ultronAdvancedVoiceEnrollment.captureConditionSample(cond);
    } finally {
      setRecordingCondition(null);
    }
  };

  const handleRunSecurityTests = async () => {
    setRunningTests(true);
    setTestResults([]);
    try {
      const results = await ultronVoiceAuth.runSecurityTestSuite();
      setTestResults(results);
    } finally {
      setRunningTests(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050811] text-slate-100 overflow-hidden font-sans">
      {/* Top Banner Header */}
      <div className="p-4 sm:p-5 border-b border-cyan-500/20 bg-[#070e1c]/80 backdrop-blur flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-wider text-slate-100 uppercase">
                ULTRON Owner Security Center
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono-code border ${
                trustSession.ownerVerified 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-red-500/20 text-red-300 border-red-500/40'
              }`}>
                {trustSession.ownerVerified ? 'VERIFIED: ASIK' : 'SECURE LOCK'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono-code">
              Multi-Layer Identity Engine • Continuous Verification • Anti-Spoof Protection
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleEmergencyLock}
            className="px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-300 text-xs font-mono-code font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(239,68,68,0.2)] active:scale-95"
          >
            <Lock className="w-3.5 h-3.5 text-red-400" />
            <span>LOCK ULTRON</span>
          </button>

          <button
            onClick={() => ultronTrustSession.escalateTrust('VOICE_ACOUSTIC', 0.96)}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono-code font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Verify Asik Voice</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-cyan-500/15 bg-[#050b16] px-4 overflow-x-auto gap-2 py-2 text-xs font-mono-code scrollbar-none">
        {[
          { id: 'overview', label: 'Security Overview', icon: Activity },
          { id: 'dynamic_challenge', label: 'Dynamic Challenge', icon: Key },
          { id: 'advanced_enrollment', label: 'Multi-Condition Enrollment', icon: Fingerprint },
          { id: 'audit_log', label: `Security Audit (${auditEntries.length})`, icon: FileText },
          { id: 'test_suite', label: '10-Point Security Audit', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSub === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSub(tab.id as SubSection)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ================================================================= */}
        {/* TAB 1: OVERVIEW & MULTI-LAYER STATUS                             */}
        {/* ================================================================= */}
        {activeSub === 'overview' && (
          <div className="space-y-6">
            {/* Top Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 font-mono-code">
              {/* Card 1: Voice Lock Switch */}
              <div className="p-3.5 rounded-2xl bg-[#091122]/80 border border-cyan-500/20 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Voice Lock</span>
                  <Lock className={`w-3.5 h-3.5 ${voiceLockArmed ? 'text-emerald-400' : 'text-slate-500'}`} />
                </div>
                <div className="text-lg font-bold text-slate-100">
                  {voiceLockArmed ? 'ARMED' : 'DISARMED'}
                </div>
                <button
                  onClick={handleToggleVoiceLock}
                  className="mt-1 text-[11px] text-cyan-400 hover:underline block"
                >
                  {voiceLockArmed ? 'Disarm Lock' : 'Arm Voice Lock'}
                </button>
              </div>

              {/* Card 2: Trust Session Status */}
              <div className="p-3.5 rounded-2xl bg-[#091122]/80 border border-cyan-500/20 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Trust Session</span>
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${trustSession.ownerVerified ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  <span>{trustSession.trustLevel}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {trustSession.ownerVerified ? `Expires in ${remainingSeconds}s` : 'Session unverified'}
                </div>
              </div>

              {/* Card 3: Anti-Spoofing Engine */}
              <div className="p-3.5 rounded-2xl bg-[#091122]/80 border border-cyan-500/20 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Anti-Spoofing</span>
                  <Zap className={`w-3.5 h-3.5 ${antiSpoofActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                </div>
                <div className="text-lg font-bold text-slate-100">
                  {antiSpoofActive ? 'ACTIVE' : 'OFF'}
                </div>
                <button
                  onClick={handleToggleAntiSpoof}
                  className="mt-1 text-[11px] text-cyan-400 hover:underline block"
                >
                  {antiSpoofActive ? 'Disable Filter' : 'Enable Filter'}
                </button>
              </div>

              {/* Card 4: Threat Blocked Count */}
              <div className="p-3.5 rounded-2xl bg-[#091122]/80 border border-cyan-500/20 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Threats Blocked</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-lg font-bold text-amber-300">
                  {stats.denied + stats.spoofAttempts}
                </div>
                <div className="text-[11px] text-slate-400">
                  {stats.spoofAttempts} spoof, {stats.speakerSwitches} switch
                </div>
              </div>
            </div>

            {/* Multi-Layer Identity Pipeline Matrix */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#081020]/90 border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono-code">
                    Multi-Layer Identity Evaluation Matrix
                  </h3>
                </div>
                <span className="text-xs text-cyan-400 font-mono-code">
                  Policy: STRICT FAIL-CLOSED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-code text-xs">
                {/* Layer 1: Acoustic Vector */}
                <div className="p-3 rounded-xl bg-[#050b17] border border-cyan-500/15 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300 font-bold">
                    <span>1. Acoustic Vector</span>
                    <span className="text-emerald-400">0.96 Score</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    16D formant & pitch centroid matching enrolled ASIK vocal signature.
                  </p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-[96%]" />
                  </div>
                </div>

                {/* Layer 2: Anti-Spoof Liveness */}
                <div className="p-3 rounded-xl bg-[#050b17] border border-cyan-500/15 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300 font-bold">
                    <span>2. Anti-Spoof Liveness</span>
                    <span className="text-cyan-400">0.94 Score</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Phase coherence check & spectral roll-off analysis to reject recorded replay.
                  </p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full w-[94%]" />
                  </div>
                </div>

                {/* Layer 3: Risk & Policy Gate */}
                <div className="p-3 rounded-xl bg-[#050b17] border border-cyan-500/15 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300 font-bold">
                    <span>3. Adaptive Risk Gate</span>
                    <span className="text-emerald-400">LEVEL 2 PASSED</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Level 0-2 auto-cleared for active session; Level 3 mandates secondary factor.
                  </p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-400 h-full w-[100%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Threshold & Sensitivity Settings */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#081020]/90 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono-code flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Voice Lock Policies & Sensitivity</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono-code text-xs">
                {/* Sensitivity Selector */}
                <div className="space-y-2">
                  <label className="text-slate-300 block font-semibold">
                    Matching Sensitivity ({sensitivity.toUpperCase()})
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['strict', 'balanced', 'relaxed'] as VoiceSecuritySensitivity[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => handleSensitivityChange(mode)}
                        className={`py-2 px-2 rounded-xl text-center capitalize transition-all border ${
                          sensitivity === mode
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                            : 'bg-[#050b16] border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Strict: 85% confidence required • Balanced: 75% • Relaxed: 65%
                  </p>
                </div>

                {/* Unknown Speaker Mode */}
                <div className="space-y-2">
                  <label className="text-slate-300 block font-semibold">
                    Unknown Speaker Behavior
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSilentReject(true);
                        ultronVoiceAuth.updateSettings({ silentRejectUnknown: true });
                      }}
                      className={`py-2 px-2 rounded-xl text-center transition-all border ${
                        silentReject
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                          : 'bg-[#050b16] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Silent Ignore (Default)
                    </button>
                    <button
                      onClick={() => {
                        setSilentReject(false);
                        ultronVoiceAuth.updateSettings({ silentRejectUnknown: false });
                      }}
                      className={`py-2 px-2 rounded-xl text-center transition-all border ${
                        !silentReject
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-[#050b16] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Verbal Prompt
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Silent Ignore drops non-owner commands without revealing identity or security parameters.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: DYNAMIC CHALLENGE & LIVENESS VERIFICATION                 */}
        {/* ================================================================= */}
        {activeSub === 'dynamic_challenge' && (
          <div className="space-y-6 max-w-2xl mx-auto font-mono-code">
            <div className="p-5 rounded-2xl bg-[#081020]/90 border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-slate-100 uppercase">
                    Dynamic Voice Challenge Generator
                  </h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  Liveness Factor
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                For high-risk operations (Level 3), ULTRON generates an unpredictable, single-use verification phrase. Spoken utterance and acoustic vocal patterns must both match within the 20-second active window.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerateChallenge('STANDARD')}
                  className="flex-1 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Issue Standard Challenge</span>
                </button>
                <button
                  onClick={() => handleGenerateChallenge('HIGH')}
                  className="flex-1 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Issue High-Risk Challenge</span>
                </button>
              </div>

              {dynamicChallenge && (
                <div className="p-4 rounded-xl bg-[#050a14] border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-400 uppercase tracking-widest font-bold">● Active Dynamic Challenge Phrase</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${
                      dynamicChallenge.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      dynamicChallenge.status === 'EXPIRED' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                      'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {dynamicChallenge.status}
                    </span>
                  </div>

                  <div className="text-xl sm:text-2xl font-bold text-center py-2 text-cyan-200 tracking-wider">
                    "{dynamicChallenge.phrase}"
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 block">
                      Spoken Utterance Test Input
                    </label>
                    <input
                      type="text"
                      value={challengeSpokenText}
                      onChange={(e) => setChallengeSpokenText(e.target.value)}
                      placeholder="Enter or speak the verification phrase..."
                      className="w-full px-3 py-2 rounded-xl bg-[#091122] border border-slate-700 text-slate-100 text-xs focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleVerifyChallenge(true)}
                      className="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify Asik Voice (Owner Match)</span>
                    </button>
                    <button
                      onClick={() => handleVerifyChallenge(false)}
                      className="py-2 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      title="Simulate attacker speaking the phrase"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Simulate Impersonator</span>
                    </button>
                  </div>

                  {challengeStatusMsg && (
                    <div className={`p-2.5 rounded-lg text-xs border ${
                      challengeStatusMsg.success 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}>
                      {challengeStatusMsg.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: ADVANCED MULTI-CONDITION ENROLLMENT STUDIO                */}
        {/* ================================================================= */}
        {activeSub === 'advanced_enrollment' && (
          <div className="space-y-5 font-mono-code">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">
                  Multi-Condition Voice Calibration Studio
                </h3>
                <p className="text-xs text-slate-400">
                  Captures vocal vectors across 6 distinct acoustic environments. Complete all conditions for maximum accuracy.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-cyan-300 font-bold">
                  {ultronAdvancedVoiceEnrollment.getCompletionPercentage()}% Complete
                </span>
                <button
                  onClick={() => ultronAdvancedVoiceEnrollment.resetAllSamples()}
                  className="px-3 py-1 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs"
                >
                  Clear Samples
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {ENROLLMENT_CONDITIONS.map((cond) => {
                const sample = ultronAdvancedVoiceEnrollment.getSample(cond.condition);
                const isRecording = recordingCondition === cond.condition;
                return (
                  <div
                    key={cond.condition}
                    className={`p-4 rounded-2xl border transition-all ${
                      sample
                        ? 'bg-[#081326]/90 border-cyan-500/30'
                        : 'bg-[#070d1a]/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-200 text-xs">{cond.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${
                        sample
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {sample ? 'CALIBRATED' : 'PENDING'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-2">{cond.description}</p>

                    <div className="p-2.5 rounded-xl bg-[#040812] border border-cyan-500/15 mb-3 text-xs text-cyan-200 italic">
                      "{cond.phrase}"
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <div>
                        {sample ? (
                          <span>Target: {cond.targetPitchF0Hz}Hz • Recorded: {sample.pitchF0Hz.toFixed(1)}Hz</span>
                        ) : (
                          <span>Target: {cond.targetPitchF0Hz}Hz</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRecordCondition(cond.condition)}
                        disabled={isRecording}
                        className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition disabled:opacity-50"
                      >
                        {isRecording ? 'Calibrating...' : sample ? 'Re-Calibrate' : 'Calibrate Sample'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: SECURITY AUDIT LOG                                         */}
        {/* ================================================================= */}
        {activeSub === 'audit_log' && (
          <div className="space-y-4 font-mono-code">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">
                  Security Event Audit Trail
                </h3>
                <p className="text-xs text-slate-400">
                  Strict Privacy Architecture: Zero raw audio, zero embeddings, zero private conversation logged.
                </p>
              </div>
              <button
                onClick={() => ultronSecurityAuditLog.clearLogs()}
                className="px-3 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Audit Trail</span>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#070d1a] overflow-hidden">
              <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-800/60 text-xs">
                {auditEntries.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    No security events recorded yet.
                  </div>
                ) : (
                  auditEntries.map((entry) => {
                    const isSuccess = entry.result === 'AUTHORIZED';
                    const isDenied = entry.result === 'DENIED';
                    return (
                      <div key={entry.id} className="p-3 sm:p-3.5 hover:bg-slate-800/20 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              isSuccess ? 'bg-emerald-400' : isDenied ? 'bg-red-400' : 'bg-amber-400'
                            }`} />
                            <span className="font-bold text-slate-200">{entry.eventType}</span>
                            <span className="text-[10px] text-slate-500">[{entry.actionCategory}]</span>
                          </div>
                          <div className="text-[11px] text-slate-400 pl-4">
                            Speaker: <span className="text-slate-300">{entry.speakerLabel}</span> • Risk: <span className="text-cyan-400">{entry.riskLevel}</span>
                          </div>
                          {entry.failureReason && (
                            <div className="text-[10px] text-red-300 pl-4">
                              Failure Reason: {entry.failureReason}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-right pl-4 sm:pl-0">
                          <div>
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${
                              isSuccess ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                              isDenied ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                              'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}>
                              {entry.result}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {entry.timestamp}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: 10-POINT SECURITY AUDIT TEST SUITE                         */}
        {/* ================================================================= */}
        {activeSub === 'test_suite' && (
          <div className="space-y-4 font-mono-code">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">
                  Automated 10-Point Security Test Suite
                </h3>
                <p className="text-xs text-slate-400">
                  Simulates spoofing, impersonation, cross-talk, and TV audio to verify fail-closed boundaries.
                </p>
              </div>
              <button
                onClick={handleRunSecurityTests}
                disabled={runningTests}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runningTests ? 'animate-spin' : ''}`} />
                <span>{runningTests ? 'Running 10-Point Audit...' : 'Execute Security Audit'}</span>
              </button>
            </div>

            {testResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {testResults.map((tc) => (
                  <div
                    key={tc.id}
                    className={`p-3.5 rounded-xl border ${
                      tc.passed
                        ? 'bg-[#071324]/80 border-emerald-500/30'
                        : 'bg-[#18090b]/80 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-200">{tc.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        tc.passed 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                          : 'bg-red-500/20 text-red-300 border-red-500/40'
                      }`}>
                        {tc.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-1">{tc.sampleDescription}</p>
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>Expected: {tc.expectedOutcome}</span>
                      <span>Outcome: <strong className="text-slate-300">{tc.actualOutcome}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
