import { DynamicChallenge } from '../types';
import { ultronSecurityAuditLog } from './ultronSecurityAuditLog';

const NATO_WORDS = [
  'Echo', 'Bravo', 'Falcon', 'Titan', 'Delta', 'Apex', 'Obsidian', 'Quantum',
  'Vector', 'Cipher', 'Vanguard', 'Orion', 'Kodiak', 'Specter', 'Zephyr'
];

const CODE_WORDS = [
  'Shield', 'Matrix', 'Nexus', 'Horizon', 'Orbit', 'Pulse', 'Vertex', 'Chronos',
  'Zenith', 'Phantom', 'Aegis', 'Sentry', 'Solar', 'Nova', 'Mirage'
];

export class UltronDynamicVoiceChallengeService {
  private static instance: UltronDynamicVoiceChallengeService | null = null;
  private currentChallenge: DynamicChallenge | null = null;
  private listeners: Array<(challenge: DynamicChallenge | null) => void> = [];

  private constructor() {}

  public static getInstance(): UltronDynamicVoiceChallengeService {
    if (!UltronDynamicVoiceChallengeService.instance) {
      UltronDynamicVoiceChallengeService.instance = new UltronDynamicVoiceChallengeService();
    }
    return UltronDynamicVoiceChallengeService.instance;
  }

  public subscribe(listener: (challenge: DynamicChallenge | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentChallenge);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentChallenge));
  }

  public getCurrentChallenge(): DynamicChallenge | null {
    if (this.currentChallenge && Date.now() > this.currentChallenge.expiresAt) {
      this.currentChallenge.status = 'EXPIRED';
      this.notify();
    }
    return this.currentChallenge;
  }

  /**
   * Issues a dynamic, unpredictable liveness challenge for ASIK.
   * Challenge expires in 20 seconds.
   */
  public generateChallenge(difficulty: 'STANDARD' | 'HIGH' = 'STANDARD'): DynamicChallenge {
    const word1 = NATO_WORDS[Math.floor(Math.random() * NATO_WORDS.length)];
    const word2 = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
    const number = Math.floor(10 + Math.random() * 89); // 2-digit random number

    const phrase = difficulty === 'HIGH' 
      ? `Verify ${word1} ${word2} ${number}`
      : `${word1} ${word2} ${number}`;

    const challenge: DynamicChallenge = {
      challengeId: `chal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      phrase,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 20000, // 20s TTL
      status: 'PENDING',
      difficulty,
    };

    this.currentChallenge = challenge;
    this.notify();

    ultronSecurityAuditLog.logEvent({
      eventType: 'CHALLENGE_ISSUED',
      speakerLabel: 'Awaiting Owner Utterance',
      riskLevel: difficulty === 'HIGH' ? 'LEVEL_3_STRONG' : 'LEVEL_2_REQUIRED',
      actionCategory: 'LIVENESS_VERIFICATION',
      result: 'CHALLENGE_REQUIRED',
      confidenceScore: 0,
      antiSpoofScore: 0,
      metadata: { challengeId: challenge.challengeId, phraseHash: challenge.phrase.length },
    });

    return challenge;
  }

  /**
   * Verifies the user's spoken response against the active challenge.
   */
  public verifyChallengeResponse(
    spokenUtterance: string,
    isOwnerAcoustics: boolean
  ): { success: boolean; reason: string } {
    if (!this.currentChallenge) {
      return { success: false, reason: 'No active dynamic challenge pending.' };
    }

    if (Date.now() > this.currentChallenge.expiresAt) {
      this.currentChallenge.status = 'EXPIRED';
      this.notify();
      ultronSecurityAuditLog.logEvent({
        eventType: 'AUTHENTICATION_FAILURE',
        speakerLabel: 'Challenge Timeout',
        riskLevel: 'LEVEL_2_REQUIRED',
        actionCategory: 'LIVENESS_VERIFICATION',
        result: 'DENIED',
        confidenceScore: 0,
        antiSpoofScore: 0,
        failureReason: 'Dynamic verification challenge expired.',
      });
      return { success: false, reason: 'Challenge window expired. Please request a new verification phrase.' };
    }

    const cleanSpoken = spokenUtterance.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const cleanChallenge = this.currentChallenge.phrase.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    // Check if spoken words contain the challenge key tokens
    const challengeTokens = cleanChallenge.split(' ').filter(Boolean);
    const matchedTokens = challengeTokens.filter((token) => cleanSpoken.includes(token));
    const phraseMatched = matchedTokens.length >= Math.ceil(challengeTokens.length * 0.7);

    if (!phraseMatched) {
      this.currentChallenge.status = 'FAILED';
      this.notify();
      ultronSecurityAuditLog.logEvent({
        eventType: 'AUTHENTICATION_FAILURE',
        speakerLabel: 'Unrecognized Utterance',
        riskLevel: 'LEVEL_2_REQUIRED',
        actionCategory: 'LIVENESS_VERIFICATION',
        result: 'DENIED',
        confidenceScore: 0.35,
        antiSpoofScore: 0.5,
        failureReason: 'Spoken phrase did not match dynamic liveness challenge.',
      });
      return { success: false, reason: 'Phrase mismatch. Verification challenge rejected.' };
    }

    if (!isOwnerAcoustics) {
      this.currentChallenge.status = 'FAILED';
      this.notify();
      ultronSecurityAuditLog.logEvent({
        eventType: 'AUTHENTICATION_FAILURE',
        speakerLabel: 'Non-Owner Vocal Profile',
        riskLevel: 'LEVEL_3_STRONG',
        actionCategory: 'LIVENESS_VERIFICATION',
        result: 'DENIED',
        confidenceScore: 0.38,
        antiSpoofScore: 0.8,
        failureReason: 'Phrase matched but vocal tract acoustics did not verify as owner ASIK.',
      });
      return { success: false, reason: 'Acoustic vocal signature does not match authorized owner ASIK.' };
    }

    this.currentChallenge.status = 'VERIFIED';
    this.notify();

    ultronSecurityAuditLog.logEvent({
      eventType: 'CHALLENGE_VERIFIED',
      speakerLabel: 'ASIK (Owner Authenticated)',
      riskLevel: 'LEVEL_3_STRONG',
      actionCategory: 'LIVENESS_VERIFICATION',
      result: 'AUTHORIZED',
      confidenceScore: 0.98,
      antiSpoofScore: 0.96,
      metadata: { verifiedChallengeId: this.currentChallenge.challengeId },
    });

    return { success: true, reason: 'Dynamic challenge verified. Owner identity fully confirmed.' };
  }

  public clearChallenge() {
    this.currentChallenge = null;
    this.notify();
  }
}

export const ultronDynamicVoiceChallenge = UltronDynamicVoiceChallengeService.getInstance();
