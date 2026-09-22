import { CapabilityItem } from '../types';

export class CapabilityRegistry {
  private capabilities: CapabilityItem[] = [
    {
      id: 'cap_audio_to_audio',
      name: 'Real-time Audio-to-Audio Live Stream',
      category: 'voice',
      status: 'IMPLEMENTED',
      description: 'Native bidirectional PCM streaming with live barge-in interruption and auto-reconnect.',
      platformNote: 'Uses WebSocket audio streaming or automatic fallback to standard voice pipeline if network constraints apply.',
    },
    {
      id: 'cap_voice_pipeline',
      name: 'Standard Speech-To-Text / Text-To-Speech',
      category: 'voice',
      status: 'IMPLEMENTED',
      description: 'Continuous hands-free voice recognition with pitch/speed tuned Jarvis audio synthesis.',
      platformNote: 'Operates via browser Web Speech API & SpeechSynthesis with zero external latency.',
    },
    {
      id: 'cap_screen_perception',
      name: 'UI Hierarchy & Accessibility Screen Inspection',
      category: 'perception',
      status: 'IMPLEMENTED',
      description: 'Scans interactive buttons, inputs, links, and content descriptions to guide actions.',
      platformNote: 'Uses DOM Accessibility Tree. On native Android, maps to AccessibilityNodeInfo APIs.',
    },
    {
      id: 'cap_camera_vision',
      name: 'Optical Computer Vision & Image Reasoning',
      category: 'perception',
      status: 'IMPLEMENTED',
      description: 'Captures live camera frames or user screenshots to diagnose errors, diagrams, and physical objects.',
      platformNote: 'Processed via Gemini 2.5 Flash multimodal vision with user camera permission.',
    },
    {
      id: 'cap_web_research',
      name: 'Deep Web Research with Verified Citations',
      category: 'intelligence',
      status: 'IMPLEMENTED',
      description: 'Deconstructs queries, validates sources with Google Search Grounding, synthesizes reports.',
      platformNote: 'Real Google Search Grounding with direct URLs and verifiable citations.',
    },
    {
      id: 'cap_task_continuity',
      name: 'Task Continuity & State Checkpointing',
      category: 'automation',
      status: 'IMPLEMENTED',
      description: 'Persists active and unfinished multi-step tasks across application restarts and pauses.',
      platformNote: 'Resumes seamlessly via voice commands such as "ULTRON, continue my research".',
    },
    {
      id: 'cap_autonomous_planner',
      name: 'Autonomous Multi-Step Goal Planner',
      category: 'automation',
      status: 'IMPLEMENTED',
      description: 'Automatically decomposes complex requests into ordered execution plans with verification steps.',
      platformNote: 'Live compact command timeline display without revealing private chain-of-thought.',
    },
    {
      id: 'cap_tool_registry',
      name: 'Allowlisted Tool Execution Engine',
      category: 'tools',
      status: 'IMPLEMENTED',
      description: 'Coordinated execution of 10 system tools (Apps, Settings, Files, Web, Phone, Notifications).',
      platformNote: 'Strictly sandboxed to allowlisted operations with zero arbitrary code execution.',
    },
    {
      id: 'cap_natural_routines',
      name: 'Natural-Language Automation Builder',
      category: 'automation',
      status: 'IMPLEMENTED',
      description: 'Converts user spoken or typed descriptions into structured, runnable automation routines.',
      platformNote: 'Presents trigger, actions, permissions, and potential effects before execution.',
    },
    {
      id: 'cap_diagnostic_engine',
      name: 'Self-Diagnostic Engine & System Health Monitor',
      category: 'security',
      status: 'IMPLEMENTED',
      description: 'Continuously monitors audio, AI latency, storage, and network with interactive self-test mode.',
      platformNote: 'Triggerable via "ULTRON, run a system check".',
    },
    {
      id: 'cap_undo_recovery',
      name: 'Action Reversibility & Undo Engine',
      category: 'security',
      status: 'IMPLEMENTED',
      description: 'Maintains an action record for reversible operations (file modifications, notes, reminders).',
      platformNote: 'Non-destructive rollback for supported actions.',
    },
    {
      id: 'cap_longterm_memory',
      name: 'Layered Memory Engine (Inspectable/Deletable)',
      category: 'intelligence',
      status: 'IMPLEMENTED',
      description: '5-layer context hierarchy: Conversation -> Task -> Recent Context -> Preferences -> Long-Term.',
      platformNote: 'User can inspect, modify, or delete any stored fact or preference at any time.',
    },
    {
      id: 'cap_biometric_gate',
      name: 'Biometric Security & Confirmation Gates',
      category: 'security',
      status: 'IMPLEMENTED',
      description: 'Three-tier security classification: Safe (auto), Sensitive (confirm), Restricted (biometric).',
      platformNote: 'Uses WebAuthn / Android BiometricPrompt APIs to protect sensitive operations.',
    },
    {
      id: 'cap_background_service',
      name: 'Always-On Background Daemon',
      category: 'automation',
      status: 'PARTIALLY IMPLEMENTED',
      description: 'Continuous wake-word listening while phone screen is off or app is in background.',
      platformNote: 'Browser sandboxes suspend audio listeners when tab is hidden. On native Android APK, requires Android Foreground Service with continuous notification.',
    },
    {
      id: 'cap_dialer_intent',
      name: 'Direct Phone Dialer Launch',
      category: 'tools',
      status: 'PARTIALLY IMPLEMENTED',
      description: 'Pre-fills Android dialer with requested contact number.',
      platformNote: 'Launches tel: URI. Android security requires user to tap call button to prevent unauthorized toll fraud.',
    },
    {
      id: 'cap_root_bypass',
      name: 'Root / Lockscreen / Payment Bypass',
      category: 'security',
      status: 'NOT AVAILABLE',
      description: 'Overriding Android secure lockscreen, biometric gates, or payment authorizations.',
      platformNote: 'Strictly prohibited by Android security architecture (SELinux, KeyStore, TEE). ULTRON complies with all platform safety invariants.',
    },
  ];

  public getAllCapabilities(): CapabilityItem[] {
    return [...this.capabilities];
  }

  public getCapabilitiesByCategory(category: CapabilityItem['category']): CapabilityItem[] {
    return this.capabilities.filter((c) => c.category === category);
  }

  public getStatusCount(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of this.capabilities) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return counts;
  }
}

export const capabilityRegistry = new CapabilityRegistry();
