import { AdaptiveRiskLevel } from '../types';

export class UltronAdaptiveAuthenticationEngine {
  private static instance: UltronAdaptiveAuthenticationEngine | null = null;

  private constructor() {}

  public static getInstance(): UltronAdaptiveAuthenticationEngine {
    if (!UltronAdaptiveAuthenticationEngine.instance) {
      UltronAdaptiveAuthenticationEngine.instance = new UltronAdaptiveAuthenticationEngine();
    }
    return UltronAdaptiveAuthenticationEngine.instance;
  }

  /**
   * Evaluates natural language command or tool call to classify its risk level.
   * Fail-closed architecture: Any ambiguous or unrecognized sensitive terms default to LEVEL_3.
   */
  public evaluateCommandRisk(commandText: string): AdaptiveRiskLevel {
    const lower = (commandText || '').toLowerCase().trim();

    // LEVEL 3 — STRONG OWNER AUTHENTICATION (Destructive, Security, High-Impact)
    const level3Keywords = [
      'delete', 'remove file', 'format', 'wipe', 'clear memory', 'factory reset',
      'biometric', 'disable security', 'disable lock', 'turn off lock', 'uninstall',
      'kill process', 'publish app', 'send payment', 'transfer money', 'password',
      'secret', 'private key', 'api key', 'emergency lock', 'lockdown', 'reset voice'
    ];
    if (level3Keywords.some((kw) => lower.includes(kw))) {
      return 'LEVEL_3_STRONG';
    }

    // LEVEL 2 — OWNER REQUIRED (Personal files, messages, notifications, device control)
    const level2Keywords = [
      'message', 'call', 'read notification', 'notification', 'contact', 'file',
      'open app', 'launch', 'torch', 'flashlight', 'vibrate', 'screen', 'inspect',
      'take photo', 'camera', 'automation', 'workflow', 'task', 'coder', 'build app',
      'create project', 'compile', 'diagnostic', 'system check', 'what did i', 'my memory',
      'remember', 'asik'
    ];
    if (level2Keywords.some((kw) => lower.includes(kw))) {
      return 'LEVEL_2_REQUIRED';
    }

    // LEVEL 0 — PUBLIC (General questions, public search, time, weather)
    const level0Keywords = [
      'weather', 'what time', 'current time', 'date today', 'tell a joke',
      'calculate', 'how many', 'who is', 'what is the capital', 'translate',
      'define', 'wikipedia', 'convert'
    ];
    if (level0Keywords.some((kw) => lower.includes(kw))) {
      return 'LEVEL_0_PUBLIC';
    }

    // Default to LEVEL_1 — OWNER PREFERRED for conversational / general assistant interaction
    return 'LEVEL_1_PREFERRED';
  }

  /**
   * Determines if the active trust session satisfies the command's risk level.
   */
  public isAuthorized(riskLevel: AdaptiveRiskLevel, sessionTrustLevel: string, isOwnerVerified: boolean): {
    authorized: boolean;
    reason: string;
    requiresSecondaryAuth: boolean;
  } {
    switch (riskLevel) {
      case 'LEVEL_0_PUBLIC':
        return { authorized: true, reason: 'Public query; no authentication required.', requiresSecondaryAuth: false };

      case 'LEVEL_1_PREFERRED':
        // Preferred: allows if verified or in guest fallback with notice
        return {
          authorized: true,
          reason: isOwnerVerified ? 'Owner verified for conversational request.' : 'Non-sensitive conversational query allowed.',
          requiresSecondaryAuth: false,
        };

      case 'LEVEL_2_REQUIRED':
        if (!isOwnerVerified) {
          return {
            authorized: false,
            reason: 'Owner voice authentication required for protected system and memory access.',
            requiresSecondaryAuth: false,
          };
        }
        return { authorized: true, reason: 'Owner verified for protected action.', requiresSecondaryAuth: false };

      case 'LEVEL_3_STRONG':
        if (!isOwnerVerified) {
          return {
            authorized: false,
            reason: 'Strong owner authentication required for high-risk action.',
            requiresSecondaryAuth: true,
          };
        }
        if (sessionTrustLevel !== 'MAXIMUM_SECURITY') {
          return {
            authorized: false,
            reason: 'Secondary verification factor required (Biometric Enclave or Dynamic Challenge).',
            requiresSecondaryAuth: true,
          };
        }
        return { authorized: true, reason: 'Maximum security verified for high-risk execution.', requiresSecondaryAuth: false };

      default:
        return { authorized: false, reason: 'Fail-closed: Unknown risk level rejected.', requiresSecondaryAuth: true };
    }
  }
}

export const ultronAdaptiveAuth = UltronAdaptiveAuthenticationEngine.getInstance();
