import { 
  UltronTrustSession, 
  TrustLevel, 
  AdaptiveRiskLevel, 
  AuthenticationMethod 
} from '../types';
import { ultronSecurityAuditLog } from './ultronSecurityAuditLog';

const DEFAULT_SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes sliding window

export class UltronTrustSessionService {
  private static instance: UltronTrustSessionService | null = null;
  private currentSession: UltronTrustSession;
  private listeners: Array<(session: UltronTrustSession) => void> = [];
  private expirationTimer: any = null;

  private constructor() {
    this.currentSession = this.createInitialSession();
  }

  public static getInstance(): UltronTrustSessionService {
    if (!UltronTrustSessionService.instance) {
      UltronTrustSessionService.instance = new UltronTrustSessionService();
    }
    return UltronTrustSessionService.instance;
  }

  public subscribe(listener: (session: UltronTrustSession) => void): () => void {
    this.listeners.push(listener);
    listener({ ...this.currentSession });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const copy = { ...this.currentSession };
    this.listeners.forEach((l) => l(copy));
  }

  private createInitialSession(): UltronTrustSession {
    const now = Date.now();
    return {
      sessionId: `trust_${now}_${Math.random().toString(36).substring(2, 7)}`,
      ownerVerified: false,
      verificationTime: 0,
      trustLevel: 'UNTRUSTED',
      lastSpeakerCheck: now,
      lastActivity: now,
      expirationTime: now,
      riskLevel: 'LEVEL_0_PUBLIC',
      authMethod: 'VOICE_ACOUSTIC',
    };
  }

  public getSession(): UltronTrustSession {
    // Check auto-expiration on read
    if (this.currentSession.ownerVerified && Date.now() > this.currentSession.expirationTime) {
      this.revokeTrust('Session time-to-live expired.');
    }
    return { ...this.currentSession };
  }

  public isOwnerVerified(): boolean {
    const session = this.getSession();
    return session.ownerVerified && session.trustLevel !== 'UNTRUSTED';
  }

  /**
   * Escalates trust upon verified owner identity.
   */
  public escalateTrust(method: AuthenticationMethod, confidence: number = 0.95): UltronTrustSession {
    const now = Date.now();
    let newLevel: TrustLevel = 'ELEVATED';

    if (method === 'DYNAMIC_CHALLENGE' || method === 'BIOMETRIC_ENCLAVE') {
      newLevel = 'MAXIMUM_SECURITY';
    } else if (confidence >= 0.88) {
      newLevel = 'HIGH_TRUST';
    }

    this.currentSession = {
      sessionId: this.currentSession.sessionId || `trust_${now}`,
      ownerVerified: true,
      verificationTime: now,
      trustLevel: newLevel,
      lastSpeakerCheck: now,
      lastActivity: now,
      expirationTime: now + DEFAULT_SESSION_TTL_MS,
      riskLevel: newLevel === 'MAXIMUM_SECURITY' ? 'LEVEL_3_STRONG' : 'LEVEL_2_REQUIRED',
      authMethod: method,
    };

    ultronSecurityAuditLog.logEvent({
      eventType: 'TRUST_ESCALATED',
      speakerLabel: 'ASIK (Owner)',
      riskLevel: this.currentSession.riskLevel,
      actionCategory: 'SESSION_MANAGEMENT',
      result: 'AUTHORIZED',
      confidenceScore: confidence,
      antiSpoofScore: 0.95,
      metadata: { newTrustLevel: newLevel, authMethod: method },
    });

    this.resetTimer();
    this.notify();
    return { ...this.currentSession };
  }

  /**
   * Touches the session to extend activity TTL within sliding window.
   */
  public touchActivity() {
    if (!this.currentSession.ownerVerified) return;
    const now = Date.now();
    this.currentSession.lastActivity = now;
    this.currentSession.expirationTime = now + DEFAULT_SESSION_TTL_MS;
    this.resetTimer();
    this.notify();
  }

  /**
   * Immediately revokes trust (fail-closed, emergency lock, or speaker change).
   */
  public revokeTrust(reason: string = 'Security revocation triggered'): UltronTrustSession {
    const previousLevel = this.currentSession.trustLevel;
    this.currentSession = {
      sessionId: `trust_${Date.now()}_revoked`,
      ownerVerified: false,
      verificationTime: 0,
      trustLevel: 'UNTRUSTED',
      lastSpeakerCheck: Date.now(),
      lastActivity: Date.now(),
      expirationTime: 0,
      riskLevel: 'LEVEL_0_PUBLIC',
      authMethod: 'VOICE_ACOUSTIC',
    };

    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }

    ultronSecurityAuditLog.logEvent({
      eventType: 'TRUST_REVOKED',
      speakerLabel: 'Security Boundary',
      riskLevel: 'LEVEL_2_REQUIRED',
      actionCategory: 'SESSION_MANAGEMENT',
      result: 'REVOKED',
      confidenceScore: 0,
      antiSpoofScore: 0,
      failureReason: reason,
      metadata: { previousLevel },
    });

    this.notify();
    return { ...this.currentSession };
  }

  private resetTimer() {
    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer);
    }
    const remainingMs = Math.max(0, this.currentSession.expirationTime - Date.now());
    this.expirationTimer = setTimeout(() => {
      this.revokeTrust('Automatic session sliding window expiration.');
    }, remainingMs);
  }
}

export const ultronTrustSession = UltronTrustSessionService.getInstance();
