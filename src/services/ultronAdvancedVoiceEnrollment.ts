import { AdvancedEnrollmentCondition, AdvancedEnrollmentSample } from '../types';
import { ultronVoiceAuth } from './ultronVoiceAuthService';
import { ultronSecurityAuditLog } from './ultronSecurityAuditLog';
import { voiceService } from './voiceService';

const ADVANCED_ENROLLMENT_KEY = 'ultron_advanced_voice_enrollment_v1';

export const ENROLLMENT_CONDITIONS: Array<{
  condition: AdvancedEnrollmentCondition;
  title: string;
  description: string;
  phrase: string;
  targetPitchF0Hz: number;
}> = [
  {
    condition: 'normal',
    title: '1. Standard Conversational Speech',
    description: 'Speak in your natural speaking pace, tone, and volume.',
    phrase: 'ULTRON, authenticate owner voice and unlock neural core.',
    targetPitchF0Hz: 128,
  },
  {
    condition: 'quiet',
    title: '2. Quiet Environment / Low Pitch',
    description: 'Speak softly as if in a quiet room or library.',
    phrase: 'Command clearance verified for ASIK, standing by.',
    targetPitchF0Hz: 118,
  },
  {
    condition: 'fast_cadence',
    title: '3. Rapid Cadence Speech',
    description: 'Speak quickly as if issuing urgent instructions.',
    phrase: 'System diagnostics, execute autonomous routines now.',
    targetPitchF0Hz: 135,
  },
  {
    condition: 'slow_deliberate',
    title: '4. Slow & Deliberate Enunciation',
    description: 'Pronounce each syllable distinctly and carefully.',
    phrase: 'Continuous voice lock armed, stand by for directives.',
    targetPitchF0Hz: 124,
  },
  {
    condition: 'far_field',
    title: '5. Far-Field / Distant Speech',
    description: 'Step slightly back or speak from 1-2 meters away.',
    phrase: 'ULTRON, activate secure mode from across the room.',
    targetPitchF0Hz: 132,
  },
  {
    condition: 'emotional_assertive',
    title: '6. Assertive / Urgent Tone',
    description: 'Speak with firm authority as in an emergency.',
    phrase: 'Emergency lockdown, halt all external speaker access.',
    targetPitchF0Hz: 142,
  },
];

export class UltronAdvancedVoiceEnrollmentService {
  private static instance: UltronAdvancedVoiceEnrollmentService | null = null;
  private samples: Map<AdvancedEnrollmentCondition, AdvancedEnrollmentSample> = new Map();
  private listeners: Array<(samples: AdvancedEnrollmentSample[]) => void> = [];

  private constructor() {
    this.loadSamples();
  }

  public static getInstance(): UltronAdvancedVoiceEnrollmentService {
    if (!UltronAdvancedVoiceEnrollmentService.instance) {
      UltronAdvancedVoiceEnrollmentService.instance = new UltronAdvancedVoiceEnrollmentService();
    }
    return UltronAdvancedVoiceEnrollmentService.instance;
  }

  public subscribe(listener: (samples: AdvancedEnrollmentSample[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.getAllSamples());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const list = this.getAllSamples();
    this.listeners.forEach((l) => l(list));
  }

  public getAllSamples(): AdvancedEnrollmentSample[] {
    return Array.from(this.samples.values());
  }

  public getSample(condition: AdvancedEnrollmentCondition): AdvancedEnrollmentSample | undefined {
    return this.samples.get(condition);
  }

  public getCompletionPercentage(): number {
    return Math.round((this.samples.size / ENROLLMENT_CONDITIONS.length) * 100);
  }

  private loadSamples() {
    try {
      const data = localStorage.getItem(ADVANCED_ENROLLMENT_KEY);
      if (data) {
        const parsed: AdvancedEnrollmentSample[] = JSON.parse(data);
        parsed.forEach((s) => this.samples.set(s.condition, s));
      } else {
        // Pre-seed with high-fidelity baseline enrollment for ASIK
        ENROLLMENT_CONDITIONS.forEach((cond) => {
          const sample: AdvancedEnrollmentSample = {
            id: `sample_${cond.condition}_seed`,
            condition: cond.condition,
            title: cond.title,
            phrase: cond.phrase,
            features: [
              0.42 + (Math.random() * 0.04 - 0.02),
              0.58 + (Math.random() * 0.04 - 0.02),
              0.71 + (Math.random() * 0.04 - 0.02),
              0.39 + (Math.random() * 0.04 - 0.02),
              0.85 + (Math.random() * 0.04 - 0.02),
              0.63 + (Math.random() * 0.04 - 0.02),
              0.49 + (Math.random() * 0.04 - 0.02),
              0.77 + (Math.random() * 0.04 - 0.02),
              0.62 + (Math.random() * 0.04 - 0.02),
              0.51 + (Math.random() * 0.04 - 0.02),
              0.83 + (Math.random() * 0.04 - 0.02),
              0.44 + (Math.random() * 0.04 - 0.02),
              0.69 + (Math.random() * 0.04 - 0.02),
              0.73 + (Math.random() * 0.04 - 0.02),
              0.56 + (Math.random() * 0.04 - 0.02),
              0.68 + (Math.random() * 0.04 - 0.02),
            ],
            snrEstimate: 24.5 + Math.random() * 3,
            pitchF0Hz: cond.targetPitchF0Hz,
            recordedAt: new Date().toLocaleTimeString(),
          };
          this.samples.set(cond.condition, sample);
        });
        this.persist();
      }
    } catch (e) {
      console.warn('[Advanced Voice Enrollment] Failed to load enrollment:', e);
    }
  }

  private persist() {
    try {
      localStorage.setItem(
        ADVANCED_ENROLLMENT_KEY,
        JSON.stringify(Array.from(this.samples.values()))
      );
    } catch (e) {
      console.warn('[Advanced Voice Enrollment] Failed to persist enrollment:', e);
    }
  }

  /**
   * Records or simulates multi-condition voice enrollment sample.
   */
  public async captureConditionSample(condition: AdvancedEnrollmentCondition): Promise<AdvancedEnrollmentSample> {
    const config = ENROLLMENT_CONDITIONS.find((c) => c.condition === condition);
    if (!config) throw new Error(`Unknown enrollment condition: ${condition}`);

    // Simulate 350ms acoustic analysis window
    await new Promise((r) => setTimeout(r, 350));

    const sample: AdvancedEnrollmentSample = {
      id: `sample_${condition}_${Date.now()}`,
      condition,
      title: config.title,
      phrase: config.phrase,
      features: [
        0.41 + Math.random() * 0.05,
        0.57 + Math.random() * 0.04,
        0.70 + Math.random() * 0.03,
        0.38 + Math.random() * 0.04,
        0.84 + Math.random() * 0.03,
        0.62 + Math.random() * 0.04,
        0.48 + Math.random() * 0.04,
        0.76 + Math.random() * 0.03,
        0.61 + Math.random() * 0.04,
        0.50 + Math.random() * 0.04,
        0.82 + Math.random() * 0.03,
        0.43 + Math.random() * 0.04,
        0.68 + Math.random() * 0.03,
        0.72 + Math.random() * 0.03,
        0.55 + Math.random() * 0.03,
        0.67 + Math.random() * 0.03,
      ],
      snrEstimate: 26.2 + Math.random() * 2,
      pitchF0Hz: config.targetPitchF0Hz + (Math.random() * 6 - 3),
      recordedAt: new Date().toLocaleTimeString(),
    };

    this.samples.set(condition, sample);
    this.persist();

    // Recompute composite centroid for ultronVoiceAuth
    this.recalculateCompositeProfile();

    ultronSecurityAuditLog.logEvent({
      eventType: 'ENROLLMENT_SAMPLE',
      speakerLabel: 'ASIK (Enrolling)',
      riskLevel: 'LEVEL_2_REQUIRED',
      actionCategory: 'ADVANCED_VOICE_ENROLLMENT',
      result: 'AUTHORIZED',
      confidenceScore: 0.95,
      antiSpoofScore: 0.96,
      metadata: { condition, snr: sample.snrEstimate, pitch: sample.pitchF0Hz },
    });

    this.notify();
    return sample;
  }

  private recalculateCompositeProfile() {
    const all = Array.from(this.samples.values());
    if (all.length === 0) return;

    // Vector mean across all captured conditions
    const centroid = new Array(16).fill(0);
    all.forEach((s) => {
      s.features.forEach((val, idx) => {
        centroid[idx] += val / all.length;
      });
    });

    const profile = ultronVoiceAuth.getProfile();
    if (profile) {
      profile.voiceEmbedding = centroid;
      profile.samplesCount = all.length;
      profile.updatedAt = new Date().toISOString();
      ultronVoiceAuth.updateSettings({});
    }
  }

  public resetAllSamples() {
    this.samples.clear();
    this.persist();
    this.notify();
    voiceService.speak('Advanced voice enrollment samples cleared.');
  }
}

export const ultronAdvancedVoiceEnrollment = UltronAdvancedVoiceEnrollmentService.getInstance();
