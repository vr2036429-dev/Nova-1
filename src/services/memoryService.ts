import { UserPreferences } from '../types';

export class MemoryService {
  private preferences: UserPreferences = {
    userName: 'Asik',
    wakeWord: 'ULTRON',
    voiceMode: 'continuous',
    ttsVoiceName: '',
    ttsPitch: 0.95,
    ttsRate: 1.05,
    autoExecuteSafeTools: true,
    requireBiometricsForRestricted: true,
    biometricEnrolled: true,
    offlineVoiceEnabled: true,
    themeHue: 'cyan',
  };

  private contextualFacts: string[] = [
    'User preferred identity name is Asik.',
    'Default wake word trigger is "ULTRON" or "Hey Ultron".',
    'Primary workstation: Android flagship device with hardware neural accelerator.',
    'Security authorization level: Master Administrator.',
  ];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('ultron_user_preferences');
    if (stored) {
      try {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      } catch (e) {}
    }

    const storedFacts = localStorage.getItem('ultron_context_facts');
    if (storedFacts) {
      try {
        this.contextualFacts = JSON.parse(storedFacts);
      } catch (e) {}
    }
  }

  public getPreferences(): UserPreferences {
    return this.preferences;
  }

  public updatePreferences(newPrefs: Partial<UserPreferences>) {
    this.preferences = { ...this.preferences, ...newPrefs };
    if (typeof window !== 'undefined') {
      localStorage.setItem('ultron_user_preferences', JSON.stringify(this.preferences));
    }
  }

  public getContextFacts(): string[] {
    return this.contextualFacts;
  }

  public addContextFact(fact: string) {
    this.contextualFacts.push(fact);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ultron_context_facts', JSON.stringify(this.contextualFacts));
    }
  }

  public clearMemory() {
    this.contextualFacts = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ultron_context_facts');
    }
  }
}

export const memoryService = new MemoryService();
