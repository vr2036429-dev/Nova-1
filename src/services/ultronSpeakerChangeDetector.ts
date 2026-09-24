import { SpeakerChangeEvent } from '../types';
import { ultronSecurityAuditLog } from './ultronSecurityAuditLog';

export class UltronSpeakerChangeDetector {
  private static instance: UltronSpeakerChangeDetector | null = null;
  private lastPitchF0: number = 130; // Enrolled baseline for ASIK (~130Hz)
  private lastSpeakerLabel: string = 'ASIK';
  private lastUtteranceTime: number = Date.now();
  private listeners: Array<(event: SpeakerChangeEvent) => void> = [];

  private constructor() {}

  public static getInstance(): UltronSpeakerChangeDetector {
    if (!UltronSpeakerChangeDetector.instance) {
      UltronSpeakerChangeDetector.instance = new UltronSpeakerChangeDetector();
    }
    return UltronSpeakerChangeDetector.instance;
  }

  public subscribe(listener: (event: SpeakerChangeEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(event: SpeakerChangeEvent) {
    this.listeners.forEach((l) => l(event));
  }

  public resetBaseline(pitchHz: number = 130, speaker: string = 'ASIK') {
    this.lastPitchF0 = pitchHz;
    this.lastSpeakerLabel = speaker;
    this.lastUtteranceTime = Date.now();
  }

  /**
   * Evaluates if incoming utterance represents a speaker transition, voice takeover,
   * or overlapping conversational environment.
   */
  public evaluateSpeakerContinuity(params: {
    detectedPitchHz?: number;
    speakerLabel?: string;
    isOverlapping?: boolean;
    utteranceText?: string;
  }): { isSpeakerConsistent: boolean; changeEvent?: SpeakerChangeEvent } {
    const now = Date.now();
    const detectedPitch = params.detectedPitchHz ?? (125 + Math.random() * 10);
    const speakerLabel = params.speakerLabel || (Math.abs(detectedPitch - this.lastPitchF0) > 40 ? 'UNKNOWN_SPEAKER' : 'ASIK');
    const pitchShift = Math.abs(detectedPitch - this.lastPitchF0);
    const silenceDurationMs = now - this.lastUtteranceTime;

    // Check 1: Explicit overlapping speech
    if (params.isOverlapping) {
      const event: SpeakerChangeEvent = {
        timestamp: now,
        previousSpeaker: this.lastSpeakerLabel,
        detectedSpeaker: 'MULTIPLE_OVERLAPPING',
        pitchShiftHz: pitchShift,
        confidenceDrop: 0.45,
        reason: 'OVERLAPPING_SPEECH',
        actionTaken: 'PAUSE_EXECUTION',
      };
      this.handleSpeakerChange(event);
      return { isSpeakerConsistent: false, changeEvent: event };
    }

    // Check 2: Sudden voice switching (Pitch shift > 45Hz or unknown label)
    if (speakerLabel !== 'ASIK' || pitchShift > 45) {
      const isLongSilence = silenceDurationMs > 30000;
      const event: SpeakerChangeEvent = {
        timestamp: now,
        previousSpeaker: this.lastSpeakerLabel,
        detectedSpeaker: speakerLabel,
        pitchShiftHz: pitchShift,
        confidenceDrop: 0.55,
        reason: isLongSilence ? 'LONG_SILENCE_SHIFT' : 'VOICE_SWITCH',
        actionTaken: 'LOCK_SESSION',
      };
      this.handleSpeakerChange(event);
      return { isSpeakerConsistent: false, changeEvent: event };
    }

    // Speaker is consistent
    this.lastPitchF0 = detectedPitch;
    this.lastSpeakerLabel = 'ASIK';
    this.lastUtteranceTime = now;
    return { isSpeakerConsistent: true };
  }

  private handleSpeakerChange(event: SpeakerChangeEvent) {
    this.lastSpeakerLabel = event.detectedSpeaker;
    this.lastUtteranceTime = event.timestamp;
    this.notify(event);

    ultronSecurityAuditLog.logEvent({
      eventType: 'SPEAKER_CHANGE_DETECTED',
      speakerLabel: event.detectedSpeaker,
      riskLevel: 'LEVEL_2_REQUIRED',
      actionCategory: 'CONTINUOUS_VERIFICATION',
      result: 'REVOKED',
      confidenceScore: 0.30,
      antiSpoofScore: 0.85,
      failureReason: `Speaker change triggered by ${event.reason}. Pitch shift: ${event.pitchShiftHz.toFixed(1)}Hz`,
      metadata: { actionTaken: event.actionTaken, previousSpeaker: event.previousSpeaker },
    });
  }
}

export const ultronSpeakerChangeDetector = UltronSpeakerChangeDetector.getInstance();
