import { VoicePipelineStageId, VoicePipelineStageState, VoicePipelineStageStatus } from '../types';
import { diagnosticEngine } from './diagnosticEngine';

const INITIAL_STAGES: VoicePipelineStageState[] = [
  {
    id: 'MIC_PERMISSION',
    name: 'Microphone Permission',
    stepNumber: 1,
    status: 'idle',
    message: 'Permission status pending check',
    lastUpdated: 'Ready',
  },
  {
    id: 'AUDIO_INPUT',
    name: 'Hardware Audio Input',
    stepNumber: 2,
    status: 'idle',
    message: 'Acoustic input channel standby',
    lastUpdated: 'Ready',
  },
  {
    id: 'AUDIO_CAPTURE',
    name: 'Audio Record & PCM Capture',
    stepNumber: 3,
    status: 'idle',
    message: '16kHz AudioContext buffer processor standby',
    lastUpdated: 'Ready',
  },
  {
    id: 'VAD',
    name: 'Voice Activity Detector (VAD)',
    stepNumber: 4,
    status: 'idle',
    message: 'RMS energy detection & silence classifier armed',
    lastUpdated: 'Ready',
  },
  {
    id: 'LIVE_SESSION',
    name: 'Live Voice Session Layer',
    stepNumber: 5,
    status: 'idle',
    message: 'Real-time WebSocket / STT session bridge standby',
    lastUpdated: 'Ready',
  },
  {
    id: 'AUDIO_STREAM',
    name: 'Audio Stream Transmission',
    stepNumber: 6,
    status: 'idle',
    message: 'Inbound user speech telemetry channel ready',
    lastUpdated: 'Ready',
  },
  {
    id: 'AI_RESPONSE',
    name: 'Multimodal AI Brain Response',
    stepNumber: 7,
    status: 'idle',
    message: 'ULTRON neural core reasoning engine awaiting input',
    lastUpdated: 'Ready',
  },
  {
    id: 'RESPONSE_AUDIO',
    name: 'Response Audio Generation',
    stepNumber: 8,
    status: 'idle',
    message: '24kHz PCM synthesis / TTS generator standby',
    lastUpdated: 'Ready',
  },
  {
    id: 'AUDIO_OUTPUT',
    name: 'AudioTrack Hardware Playback',
    stepNumber: 9,
    status: 'idle',
    message: 'AudioBufferSourceNode / speaker channel ready',
    lastUpdated: 'Ready',
  },
  {
    id: 'UI_STATE',
    name: 'Ultron UI State Synchronization',
    stepNumber: 10,
    status: 'idle',
    message: 'State synchronized with reactive voice loop',
    lastUpdated: 'Ready',
  },
];

export class VoicePipelineDiagnosticsService {
  private static instance: VoicePipelineDiagnosticsService | null = null;
  private stages: Map<VoicePipelineStageId, VoicePipelineStageState> = new Map();
  private listeners: ((stages: VoicePipelineStageState[]) => void)[] = [];
  private turnStartTime: number = 0;
  private stageTimestamps: Map<VoicePipelineStageId, number> = new Map();
  private recentLogs: Map<string, number> = new Map();

  private constructor() {
    this.reset();
  }

  public static getInstance(): VoicePipelineDiagnosticsService {
    if (!VoicePipelineDiagnosticsService.instance) {
      VoicePipelineDiagnosticsService.instance = new VoicePipelineDiagnosticsService();
    }
    return VoicePipelineDiagnosticsService.instance;
  }

  public reset() {
    INITIAL_STAGES.forEach((stage) => {
      this.stages.set(stage.id, { ...stage });
    });
    this.stageTimestamps.clear();
    this.notify();
  }

  public startTurn() {
    this.turnStartTime = performance.now();
    this.stageTimestamps.clear();
  }

  public updateStage(
    id: VoicePipelineStageId,
    status: VoicePipelineStageStatus,
    message: string,
    details?: Record<string, any>,
    latencyMs?: number
  ) {
    const existing = this.stages.get(id);
    if (!existing) return;

    let computedLatency = latencyMs;
    const now = performance.now();
    if (computedLatency === undefined && this.turnStartTime > 0) {
      computedLatency = Math.round(now - this.turnStartTime);
    }
    this.stageTimestamps.set(id, now);

    const updated: VoicePipelineStageState = {
      ...existing,
      status,
      message,
      latencyMs: computedLatency,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      details,
    };

    this.stages.set(id, updated);

    // Prevent spamming identical errors multiple times within 1.5 seconds
    const lastLogKey = `${id}_${status}_${message}`;
    const lastLogTime = this.recentLogs.get(lastLogKey) || 0;
    if (status === 'error' && now - lastLogTime < 1500) {
      this.notify();
      return;
    }
    this.recentLogs.set(lastLogKey, now);

    // Structured diagnostic logging as required by section 4 and 5
    const prefix = `[PIPELINE:${existing.stepNumber}_${id}]`;
    const latencyStr = computedLatency !== undefined ? ` (${computedLatency}ms)` : '';
    const logText = `${prefix} [${status.toUpperCase()}] ${message}${latencyStr}`;

    if (status === 'error') {
      console.error(logText, details || '');
      diagnosticEngine.log('ULTRON_AUDIO', 'error', logText, details);
    } else if (status === 'warning') {
      console.warn(logText, details || '');
      diagnosticEngine.log('ULTRON_AUDIO', 'warn', logText, details);
    } else {
      console.log(logText, details || '');
      if (status === 'success' || status === 'active') {
        diagnosticEngine.log('ULTRON_AUDIO', 'info', logText, details);
      }
    }

    this.notify();
  }

  public getStages(): VoicePipelineStageState[] {
    return Array.from(this.stages.values()).sort((a, b) => a.stepNumber - b.stepNumber);
  }

  public subscribe(listener: (stages: VoicePipelineStageState[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStages());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const all = this.getStages();
    this.listeners.forEach((l) => l(all));
  }
}

export const voicePipelineDiagnostics = VoicePipelineDiagnosticsService.getInstance();
