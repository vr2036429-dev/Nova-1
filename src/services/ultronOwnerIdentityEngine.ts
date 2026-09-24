import { 
  IdentityEvaluationResult, 
  AdaptiveRiskLevel, 
  OwnerIdentitySignals, 
  VoiceAuthResult 
} from '../types';
import { ultronTrustSession } from './ultronTrustSession';
import { ultronVoiceAntiSpoof } from './ultronVoiceAntiSpoofEngine';
import { ultronSpeakerChangeDetector } from './ultronSpeakerChangeDetector';
import { ultronAdaptiveAuth } from './ultronAdaptiveAuthenticationEngine';
import { ultronSecurityAuditLog } from './ultronSecurityAuditLog';
import { ultronVoiceAuth } from './ultronVoiceAuthService';
import { voiceService } from './voiceService';

export class UltronOwnerIdentityEngine {
  private static instance: UltronOwnerIdentityEngine | null = null;
  private isVoiceLockArmed: boolean = true;
  private isContinuousSpeakerCheckEnabled: boolean = true;
  private listeners: Array<(result: IdentityEvaluationResult) => void> = [];

  private constructor() {
    this.isVoiceLockArmed = ultronVoiceAuth.isVoiceLockEnabled();
  }

  public static getInstance(): UltronOwnerIdentityEngine {
    if (!UltronOwnerIdentityEngine.instance) {
      UltronOwnerIdentityEngine.instance = new UltronOwnerIdentityEngine();
    }
    return UltronOwnerIdentityEngine.instance;
  }

  public subscribe(listener: (result: IdentityEvaluationResult) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(result: IdentityEvaluationResult) {
    this.listeners.forEach((l) => l(result));
  }

  public isArmed(): boolean {
    return this.isVoiceLockArmed;
  }

  public setArmed(armed: boolean) {
    this.isVoiceLockArmed = armed;
    ultronVoiceAuth.updateSettings({ isVoiceLockEnabled: armed });
    if (!armed) {
      ultronTrustSession.revokeTrust('Voice Lock disarmed by user policy.');
    }
  }

  /**
   * The central Master Security Rule:
   * HEAR -> IDENTIFY -> VERIFY -> AUTHORIZE -> EXECUTE
   */
  public async evaluateVoiceCommand(params: {
    utteranceText: string;
    isVoiceInput: boolean;
    simulatedSpeaker?: 'ASIK' | 'UNKNOWN_MALE' | 'UNKNOWN_FEMALE' | 'SYNTHETIC' | 'REPLAY';
    isWakeWordTrigger?: boolean;
    rawAudio?: Float32Array;
  }): Promise<IdentityEvaluationResult> {
    const { utteranceText, isVoiceInput, simulatedSpeaker = 'ASIK', isWakeWordTrigger } = params;

    // 1. Evaluate Risk Level of the target command
    const assignedRiskLevel: AdaptiveRiskLevel = ultronAdaptiveAuth.evaluateCommandRisk(utteranceText);
    const session = ultronTrustSession.getSession();

    // 2. Check Emergency Lock voice directives ("ULTRON, LOCK", "SECURE MODE", "STOP LISTENING")
    const lower = utteranceText.toLowerCase().trim();
    if (
      lower === 'ultron lock' || 
      lower === 'lock' || 
      lower === 'secure mode' || 
      lower === 'ultron secure mode' || 
      lower === 'stop listening' ||
      lower === 'emergency lock' ||
      lower === 'ruk jao'
    ) {
      this.triggerEmergencyLock();
      return {
        authorized: true,
        assignedRiskLevel: 'LEVEL_3_STRONG',
        compositeScore: 1.0,
        primarySignal: 'EMERGENCY_LOCK_COMMAND',
        trustSession: ultronTrustSession.getSession(),
        requiresChallenge: false,
        requiresBiometrics: false,
        reason: 'Emergency lock engaged. All sessions revoked and protected features sealed.',
      };
    }

    // If Voice Lock is turned off by user preference, allow public / standard execution
    if (!this.isVoiceLockArmed) {
      return {
        authorized: true,
        assignedRiskLevel,
        compositeScore: 1.0,
        primarySignal: 'VOICE_LOCK_DISARMED',
        trustSession: session,
        requiresChallenge: false,
        requiresBiometrics: false,
        reason: 'Voice Lock disarmed in preferences.',
      };
    }

    // 3. For typed input (non-voice), check if it's Level 3 restricted
    if (!isVoiceInput) {
      if (assignedRiskLevel === 'LEVEL_3_STRONG') {
        return {
          authorized: false,
          assignedRiskLevel,
          compositeScore: 0.5,
          primarySignal: 'TYPED_HIGH_RISK',
          trustSession: session,
          requiresChallenge: false,
          requiresBiometrics: true,
          reason: 'High-risk action requires biometric enclave or owner confirmation.',
        };
      }
      return {
        authorized: true,
        assignedRiskLevel,
        compositeScore: 1.0,
        primarySignal: 'KEYBOARD_INPUT',
        trustSession: session,
        requiresChallenge: false,
        requiresBiometrics: false,
        reason: 'Direct local user input accepted for Level 0-2.',
      };
    }

    // 4. Voice Input Pipeline: Anti-Spoof Check
    const spoofEval = await ultronVoiceAntiSpoof.evaluateSample({
      simulatedThreat: 
        simulatedSpeaker === 'SYNTHETIC' ? 'SYNTHETIC_CLONE' :
        simulatedSpeaker === 'REPLAY' ? 'RECORDED_REPLAY' : 'NONE',
      utteranceText,
    });

    if (!spoofEval.isAuthenticLiveVoice) {
      ultronTrustSession.revokeTrust('Anti-spoofing failure detected.');
      ultronSecurityAuditLog.logEvent({
        eventType: 'SPOOF_ATTEMPT_DETECTED',
        speakerLabel: 'Synthetic / Replay Detected',
        riskLevel: assignedRiskLevel,
        actionCategory: 'VOICE_AUTH_GATE',
        result: 'DENIED',
        confidenceScore: spoofEval.overallScore,
        antiSpoofScore: spoofEval.overallScore,
        failureReason: spoofEval.diagnosticSummary,
      });

      if (!ultronVoiceAuth.getProfile()?.silentRejectUnknown) {
        voiceService.speak('Voice authentication failed. Synthetic audio rejected.');
      }

      const res: IdentityEvaluationResult = {
        authorized: false,
        assignedRiskLevel,
        compositeScore: spoofEval.overallScore,
        primarySignal: 'ANTI_SPOOF_REJECT',
        trustSession: ultronTrustSession.getSession(),
        requiresChallenge: false,
        requiresBiometrics: false,
        reason: spoofEval.diagnosticSummary,
      };
      this.notify(res);
      return res;
    }

    // 5. Speaker Change Detection
    if (this.isContinuousSpeakerCheckEnabled) {
      const changeEval = ultronSpeakerChangeDetector.evaluateSpeakerContinuity({
        speakerLabel: simulatedSpeaker === 'ASIK' ? 'ASIK' : 'UNKNOWN_SPEAKER',
        detectedPitchHz: simulatedSpeaker === 'ASIK' ? 128 : 190,
        utteranceText,
      });

      if (!changeEval.isSpeakerConsistent) {
        ultronTrustSession.revokeTrust('Speaker change detected mid-session.');
        const res: IdentityEvaluationResult = {
          authorized: false,
          assignedRiskLevel,
          compositeScore: 0.35,
          primarySignal: 'SPEAKER_CHANGE_DETECTED',
          trustSession: ultronTrustSession.getSession(),
          requiresChallenge: true,
          requiresBiometrics: false,
          reason: 'Speaker transition detected. Session locked until owner re-authenticates.',
        };
        this.notify(res);
        return res;
      }
    }

    // 6. Voice Acoustic Authentication
    const authResult: VoiceAuthResult = await ultronVoiceAuth.authenticateSpeaker({
      simulatedSpeaker,
      textUtterance: utteranceText,
    });

    if (authResult.status === 'UNKNOWN_SPEAKER' || authResult.status === 'SPOOF_DETECTED') {
      ultronTrustSession.revokeTrust('Unknown speaker voice pattern detected.');
      ultronSecurityAuditLog.logEvent({
        eventType: 'AUTHENTICATION_FAILURE',
        speakerLabel: authResult.speakerLabel,
        riskLevel: assignedRiskLevel,
        actionCategory: 'VOICE_AUTH_GATE',
        result: 'DENIED',
        confidenceScore: authResult.confidenceScore,
        antiSpoofScore: authResult.antiSpoofScore,
        failureReason: 'Unknown speaker voice rejected by Owner Voice Lock.',
      });

      // Unknown speaker mode: silent reject by default
      if (!ultronVoiceAuth.getProfile()?.silentRejectUnknown) {
        voiceService.speak('Owner authentication required.');
      }

      const res: IdentityEvaluationResult = {
        authorized: false,
        assignedRiskLevel,
        compositeScore: authResult.confidenceScore,
        primarySignal: 'UNKNOWN_SPEAKER',
        trustSession: ultronTrustSession.getSession(),
        requiresChallenge: false,
        requiresBiometrics: false,
        reason: 'Voice pattern does not match enrolled owner ASIK.',
      };
      this.notify(res);
      return res;
    }

    // 7. Owner Verified - Escalate Session Trust
    const updatedSession = ultronTrustSession.escalateTrust('VOICE_ACOUSTIC', authResult.confidenceScore);

    // 8. Adaptive Risk Gate
    const authDecision = ultronAdaptiveAuth.isAuthorized(
      assignedRiskLevel,
      updatedSession.trustLevel,
      true
    );

    ultronSecurityAuditLog.logEvent({
      eventType: 'AUTHENTICATION_SUCCESS',
      speakerLabel: 'ASIK (Enrolled Owner)',
      riskLevel: assignedRiskLevel,
      actionCategory: 'VOICE_COMMAND_EXECUTION',
      result: authDecision.authorized ? 'AUTHORIZED' : 'DENIED',
      confidenceScore: authResult.confidenceScore,
      antiSpoofScore: authResult.antiSpoofScore,
      failureReason: authDecision.authorized ? undefined : authDecision.reason,
    });

    const res: IdentityEvaluationResult = {
      authorized: authDecision.authorized,
      assignedRiskLevel,
      compositeScore: authResult.confidenceScore,
      primarySignal: 'OWNER_ACOUSTIC_VERIFIED',
      trustSession: updatedSession,
      requiresChallenge: authDecision.requiresSecondaryAuth,
      requiresBiometrics: authDecision.requiresSecondaryAuth,
      reason: authDecision.reason,
    };
    this.notify(res);
    return res;
  }

  /**
   * Emergency Voice Lock (Section 22)
   */
  public triggerEmergencyLock() {
    ultronTrustSession.revokeTrust('Owner Emergency Voice Lock triggered.');
    ultronVoiceAuth.resetEnrollmentStateOnly();
    voiceService.stopListening();
    voiceService.stopSpeaking();

    ultronSecurityAuditLog.logEvent({
      eventType: 'EMERGENCY_LOCK',
      speakerLabel: 'ASIK (Emergency Voice Directive)',
      riskLevel: 'LEVEL_3_STRONG',
      actionCategory: 'SYSTEM_LOCKDOWN',
      result: 'REVOKED',
      confidenceScore: 1.0,
      antiSpoofScore: 1.0,
      failureReason: 'Owner explicitly locked ULTRON via emergency voice command.',
    });

    voiceService.speak('ULTRON secured. All protected sessions locked, ASIK.');
  }
}

export const ultronOwnerIdentityEngine = UltronOwnerIdentityEngine.getInstance();
