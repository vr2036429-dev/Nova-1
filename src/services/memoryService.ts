import { UserPreferences } from '../types';
import { ultronTrustSession } from './ultronTrustSession';

export interface MemoryFact {
  id: string;
  category: 'identity' | 'preference' | 'work' | 'system';
  fact: string;
  createdAt: string;
}

export interface RecentContext {
  lastAppOpened?: string;
  lastUrlOpened?: string;
  lastSearchQuery?: string;
  lastFileAccessed?: string;
  lastActionDescription?: string;
  lastToolUsed?: string;
}

export class MemoryService {
  private preferences: UserPreferences = {
    userName: 'ASIK',
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
    voiceEngine: 'fallback_stt_tts',
    audioToAudioEnabled: false,
    vadSensitivity: 3,
    conversationalStyle: 'balanced',
    formality: 'natural_jarvis',
    proactiveAssistance: true,
    backgroundAnalysis: false,
    notificationIntelligence: true,
    screenAwareness: true,
    cameraVisionEnabled: true,
    autoSaveCheckpoints: true,
  };

  private recentContext: RecentContext = {};

  private longTermFacts: MemoryFact[] = [
    { id: 'f1', category: 'identity', fact: 'User preferred identity name is Asik.', createdAt: 'Initial Setup' },
    { id: 'f2', category: 'preference', fact: 'Default wake word trigger is "ULTRON" or "Hey Ultron".', createdAt: 'Initial Setup' },
    { id: 'f3', category: 'work', fact: 'Primary workstation: Android flagship with hardware neural accelerator.', createdAt: 'Initial Setup' },
    { id: 'f4', category: 'system', fact: 'Security authorization level: Master Administrator.', createdAt: 'Initial Setup' },
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

    const storedFacts = localStorage.getItem('ultron_longterm_facts_v2');
    if (storedFacts) {
      try {
        this.longTermFacts = JSON.parse(storedFacts);
      } catch (e) {}
    }

    const storedRecent = localStorage.getItem('ultron_recent_context');
    if (storedRecent) {
      try {
        this.recentContext = JSON.parse(storedRecent);
      } catch (e) {}
    }
  }

  public getContextFacts(enforceOwnerAuth: boolean = false): string[] {
    if (enforceOwnerAuth && !ultronTrustSession.isOwnerVerified()) {
      return ['[ACCESS_RESTRICTED: Owner Voice Authentication Required for personal memory retrieval]'];
    }
    return this.longTermFacts.map((f) => f.fact);
  }

  public getProtectedFacts(): { facts: string[]; authorized: boolean; reason?: string } {
    if (!ultronTrustSession.isOwnerVerified()) {
      return {
        facts: [],
        authorized: false,
        reason: 'Protected personal memory is locked. Owner voice authentication required.',
      };
    }
    return {
      facts: this.longTermFacts.map((f) => `[${f.category.toUpperCase()}] ${f.fact}`),
      authorized: true,
    };
  }

  public recordContext(ctx: {
    userIntent?: string;
    lastToolExecuted?: string;
    targetApp?: string;
    targetFile?: string;
    targetContact?: string;
    entities?: any;
  }) {
    this.updateRecentContext({
      lastActionDescription: ctx.userIntent,
      lastToolUsed: ctx.lastToolExecuted,
      lastAppOpened: ctx.targetApp || this.recentContext.lastAppOpened,
      lastFileAccessed: ctx.targetFile || this.recentContext.lastFileAccessed,
    });
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

  public getRecentContext(): RecentContext {
    return { ...this.recentContext };
  }

  public updateRecentContext(update: Partial<RecentContext>) {
    this.recentContext = { ...this.recentContext, ...update };
    if (typeof window !== 'undefined') {
      localStorage.setItem('ultron_recent_context', JSON.stringify(this.recentContext));
    }
  }

  public getLongTermFacts(): MemoryFact[] {
    return [...this.longTermFacts];
  }

  public addLongTermFact(fact: string, category: MemoryFact['category'] = 'preference') {
    const newFact: MemoryFact = {
      id: `fact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category,
      fact,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.longTermFacts.push(newFact);
    this.persistFacts();
    return newFact;
  }

  public updateFact(id: string, newText: string) {
    const f = this.longTermFacts.find((item) => item.id === id);
    if (f) {
      f.fact = newText;
      this.persistFacts();
    }
  }

  public deleteFact(id: string) {
    this.longTermFacts = this.longTermFacts.filter((item) => item.id !== id);
    this.persistFacts();
  }

  public clearMemory() {
    this.longTermFacts = [];
    this.recentContext = {};
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ultron_longterm_facts_v2');
      localStorage.removeItem('ultron_recent_context');
    }
  }

  private persistFacts() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ultron_longterm_facts_v2', JSON.stringify(this.longTermFacts));
    }
  }

  /**
   * Resolves natural pronoun and context references:
   * e.g., "Do that again", "Open the one we were using earlier", "Continue where we stopped"
   */
  public resolveContextualReference(input: string): { resolvedPrompt: string; matchedContext?: string } {
    const lower = input.toLowerCase().trim();

    if (lower.includes('do that again') || lower.includes('repeat that') || lower.includes('one more time')) {
      if (this.recentContext.lastActionDescription) {
        return {
          resolvedPrompt: this.recentContext.lastActionDescription,
          matchedContext: `Repeating last action: ${this.recentContext.lastActionDescription}`,
        };
      }
    }

    if (lower.includes('open the one we were using') || lower.includes('reopen that app') || lower.includes('open previous app')) {
      if (this.recentContext.lastAppOpened) {
        return {
          resolvedPrompt: `Open ${this.recentContext.lastAppOpened}`,
          matchedContext: `Restoring previous application: ${this.recentContext.lastAppOpened}`,
        };
      }
    }

    if (lower.includes('search that again') || lower.includes('research that again')) {
      if (this.recentContext.lastSearchQuery) {
        return {
          resolvedPrompt: `Research ${this.recentContext.lastSearchQuery}`,
          matchedContext: `Resuming query: ${this.recentContext.lastSearchQuery}`,
        };
      }
    }

    return { resolvedPrompt: input };
  }
}

export const memoryService = new MemoryService();
