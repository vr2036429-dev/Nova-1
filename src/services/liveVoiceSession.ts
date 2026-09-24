import { LiveVoiceState, ToolCall, ToolResult } from '../types';
import { toolRegistry } from './toolRegistry';
import { voicePipelineDiagnostics } from './voicePipelineDiagnostics';

// ============================================================================
// 1. Audio Input Manager (16kHz PCM Capture & Downsampling)
// ============================================================================
export class AudioInputManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isCapturing = false;
  private isMuted = false;

  public async start(
    onAudioChunk: (base64Pcm: string, rawRms: number) => void
  ): Promise<boolean> {
    try {
      if (this.isCapturing) return true;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio API not supported in this browser');

      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      voicePipelineDiagnostics.startTurn();
      voicePipelineDiagnostics.updateStage('MIC_PERMISSION', 'active', 'Requesting microphone permission...');
      voicePipelineDiagnostics.updateStage('AUDIO_INPUT', 'active', 'Initializing hardware acoustic stream...');

      // Robust Android/Browser Acoustic Echo Cancellation & Noise Suppression
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      voicePipelineDiagnostics.updateStage('MIC_PERMISSION', 'success', 'Microphone permission granted.');
      voicePipelineDiagnostics.updateStage('AUDIO_INPUT', 'success', 'Hardware audio input online (Echo Cancellation, Noise Suppression, AGC).');

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.7;

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);

      // Buffer size: 4096 samples at audioContext.sampleRate
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      const inputSampleRate = this.audioContext.sampleRate;
      const targetSampleRate = 16000;

      this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isCapturing || this.isMuted) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // 1. Compute RMS energy for VAD
        let sumSquares = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sumSquares += inputChannelData[i] * inputChannelData[i];
        }
        const rms = Math.sqrt(sumSquares / inputChannelData.length);

        // 2. Downsample to 16,000Hz linear PCM
        const downsampled = downsampleBuffer(inputChannelData, inputSampleRate, targetSampleRate);

        // 3. Convert Float32 [-1, 1] to Int16 [-32768, 32767]
        const pcm16 = new Int16Array(downsampled.length);
        for (let i = 0; i < downsampled.length; i++) {
          const s = Math.max(-1, Math.min(1, downsampled[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // 4. Encode as little-endian base64 string
        const base64Chunk = int16ToBase64(pcm16);
        onAudioChunk(base64Chunk, rms);
      };

      this.isCapturing = true;
      voicePipelineDiagnostics.updateStage('AUDIO_CAPTURE', 'success', `Acoustic PCM capture active (${inputSampleRate}Hz -> 16kHz downsampler online).`);
      voicePipelineDiagnostics.updateStage('VAD', 'active', 'VAD listening for acoustic energy...');
      console.log(`[AudioInputManager] Microphonic capture active at ${inputSampleRate}Hz -> downsampling to 16kHz PCM.`);
      return true;
    } catch (err: any) {
      console.warn('[AudioInputManager] Microphone capture initialization notice:', err?.message || err);
      const isPermDenied = err?.name === 'NotAllowedError' || 
                           err?.name === 'PermissionDeniedError' || 
                           err?.message?.toLowerCase().includes('permission') || 
                           err?.message?.toLowerCase().includes('denied');
      if (isPermDenied) {
        voicePipelineDiagnostics.updateStage('MIC_PERMISSION', 'error', 'Microphone access denied by browser or system settings.');
      } else {
        voicePipelineDiagnostics.updateStage('MIC_PERMISSION', 'warning', `Microphone hardware initialization note: ${err?.message || err}`);
      }
      this.stop();
      throw err;
    }
  }

  public getFrequencyData(): Uint8Array {
    if (this.analyser && this.isCapturing && !this.isMuted) {
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      return data;
    }
    return new Uint8Array(32).fill(0);
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((t) => (t.enabled = !muted));
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public stop() {
    this.isCapturing = false;
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch (e) {}
      this.processor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }
    this.analyser = null;
    console.log('[AudioInputManager] Microphone stream cleanly released.');
  }
}

// ============================================================================
// 2. Audio Output Manager (24kHz Progressive PCM Playback & Barge-in Cut-off)
// ============================================================================
export class AudioOutputManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onPlaybackStateChange?: (isPlaying: boolean) => void;
  private activePlaybackTimer: any = null;

  public init(onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = onPlaybackStateChange;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioCtx();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.75;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    }
  }

  public enqueuePcmChunk(base64Pcm: string, sampleRate = 24000) {
    if (!this.audioContext || !this.analyser) {
      this.init(this.onPlaybackStateChange);
    }
    if (!this.audioContext || !this.analyser) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    try {
      // Decode base64 to 16-bit PCM
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768;
      }

      // Create AudioBuffer at model's native 24kHz
      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, sampleRate);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser);

      // Progressive gapless scheduling
      const now = this.audioContext.currentTime;
      if (this.nextStartTime < now) {
        this.nextStartTime = now + 0.02; // 20ms jitter buffer
      }

      source.start(this.nextStartTime);
      this.activeSources.push(source);

      this.nextStartTime += audioBuffer.duration;

      this.onPlaybackStateChange?.(true);

      // Track playback duration
      clearTimeout(this.activePlaybackTimer);
      const remainingMs = Math.max(100, (this.nextStartTime - this.audioContext.currentTime) * 1000);
      this.activePlaybackTimer = setTimeout(() => {
        if (this.activeSources.length === 0 || this.audioContext?.currentTime! >= this.nextStartTime - 0.05) {
          this.onPlaybackStateChange?.(false);
        }
      }, remainingMs + 50);

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0) {
          this.onPlaybackStateChange?.(false);
        }
      };
    } catch (err) {
      console.warn('[AudioOutputManager] Error decoding/playing PCM audio chunk:', err);
    }
  }

  // Instantaneous Barge-In Cancellation
  public stopCurrentPlayback() {
    clearTimeout(this.activePlaybackTimer);
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {}
    }
    this.activeSources = [];
    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    } else {
      this.nextStartTime = 0;
    }
    this.onPlaybackStateChange?.(false);
    console.log('[AudioOutputManager] Playback halted immediately for user barge-in.');
  }

  public getFrequencyData(): Uint8Array {
    if (this.analyser && this.activeSources.length > 0) {
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      return data;
    }
    return new Uint8Array(32).fill(0);
  }

  public isPlaying(): boolean {
    return this.activeSources.length > 0;
  }

  public close() {
    this.stopCurrentPlayback();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }
    this.analyser = null;
    this.gainNode = null;
  }
}

// ============================================================================
// 3. Voice Activity Detector (VAD) & Echo Controller
// ============================================================================
export class VoiceActivityDetector {
  private speechThreshold = 0.022; // Configurable sensitivity
  private bargeInThreshold = 0.055; // Elevated threshold to prevent speaker bleed
  private silenceTimeoutMs = 850;
  private noiseFloor = 0.008;

  private isSpeaking = false;
  private silenceTimer: any = null;

  public onSpeechStart?: () => void;
  public onSpeechEnd?: () => void;
  public onInterruption?: () => void;

  public setSensitivity(level: number) {
    // level: 1 (least sensitive) to 5 (most sensitive)
    const base = [0.045, 0.035, 0.022, 0.015, 0.009];
    const idx = Math.max(0, Math.min(4, Math.floor(level) - 1));
    this.speechThreshold = base[idx];
    this.bargeInThreshold = this.speechThreshold * 2.3;
    console.log(`[VAD] Sensitivity adjusted to level ${level} (threshold: ${this.speechThreshold})`);
  }

  public processAudioChunk(rms: number, isAiCurrentlySpeaking: boolean): boolean {
    // Dynamic noise floor adaptation
    if (rms < this.speechThreshold) {
      this.noiseFloor = this.noiseFloor * 0.95 + rms * 0.05;
    }

    const currentThreshold = isAiCurrentlySpeaking ? this.bargeInThreshold : this.speechThreshold;

    if (rms > currentThreshold) {
      // Speech detected
      clearTimeout(this.silenceTimer);

      if (isAiCurrentlySpeaking) {
        // User interrupted while AI is speaking!
        console.log(`[VAD] User voice detected during AI playback (RMS: ${rms.toFixed(4)} > ${currentThreshold.toFixed(4)}) - Barge-In triggered!`);
        this.onInterruption?.();
      }

      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.onSpeechStart?.();
      }

      return true;
    } else {
      // Silence or background noise
      if (this.isSpeaking) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          this.isSpeaking = false;
          this.onSpeechEnd?.();
        }, this.silenceTimeoutMs);
      }
      return false;
    }
  }

  public reset() {
    clearTimeout(this.silenceTimer);
    this.isSpeaking = false;
  }
}

// ============================================================================
// 4. Live Voice Session Manager (Master Orchestrator)
// ============================================================================
export interface LiveVoiceCallbacks {
  onStateChange: (state: LiveVoiceState) => void;
  onUserTranscript: (text: string, isFinal: boolean) => void;
  onAssistantTranscript: (text: string) => void;
  onToolExecuted: (toolCall: ToolCall, result: ToolResult) => void;
  onError: (error: string, canFallback: boolean) => void;
}

export class LiveVoiceSession {
  private static instance: LiveVoiceSession | null = null;

  private inputManager = new AudioInputManager();
  private outputManager = new AudioOutputManager();
  private vad = new VoiceActivityDetector();

  private socket: WebSocket | null = null;
  private currentState: LiveVoiceState = 'STOPPED';
  private callbacks: LiveVoiceCallbacks | null = null;

  private isConnected = false;
  private sessionActive = false;
  private currentSpokenUserText = '';
  private currentAssistantSpokenText = '';

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  private constructor() {
    this.setupVadHandlers();
  }

  public static getInstance(): LiveVoiceSession {
    if (!LiveVoiceSession.instance) {
      LiveVoiceSession.instance = new LiveVoiceSession();
    }
    return LiveVoiceSession.instance;
  }

  public setCallbacks(callbacks: LiveVoiceCallbacks) {
    this.callbacks = callbacks;
  }

  private setState(state: LiveVoiceState) {
    if (this.currentState === state) return;
    this.currentState = state;
    console.log(`[LiveVoiceSession] State transition -> ${state}`);
    this.callbacks?.onStateChange(state);
  }

  public getState(): LiveVoiceState {
    return this.currentState;
  }

  private setupVadHandlers() {
    this.vad.onSpeechStart = () => {
      if (this.currentState !== 'INTERRUPTED') {
        this.setState('USER_SPEAKING');
      }
    };

    this.vad.onSpeechEnd = () => {
      if (this.currentState === 'USER_SPEAKING' || this.currentState === 'INTERRUPTED') {
        this.setState('PROCESSING');
      }
    };

    this.vad.onInterruption = () => {
      // 1. Immediately cut off audio playback
      this.outputManager.stopCurrentPlayback();

      // 2. Transition state
      this.setState('INTERRUPTED');

      // 3. Inform server WebSocket of barge-in
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'interrupt' }));
      }
    };
  }

  // Start continuous Live Audio-to-Audio Session
  public async startSession(options: {
    userName: string;
    memoryContext?: any;
    recentHistory?: any[];
  }): Promise<boolean> {
    try {
      if (this.sessionActive) {
        console.log('[LiveVoiceSession] Session already active.');
        return true;
      }

      this.setState('RECONNECTING');

      // 1. Initialize audio output manager
      this.outputManager.init((isPlaying) => {
        if (isPlaying) {
          if (this.currentState !== 'AI_SPEAKING' && this.currentState !== 'USER_SPEAKING') {
            this.setState('AI_SPEAKING');
          }
        } else {
          if (this.currentState === 'AI_SPEAKING') {
            this.setState('LISTENING');
          }
        }
      });

      // 2. Connect WebSocket to Server Live API gateway
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/live-voice`;
      console.log(`[LiveVoiceSession] Connecting WebSocket to ${wsUrl}...`);

      this.socket = new WebSocket(wsUrl);

      await new Promise<void>((resolve, reject) => {
        let isDone = false;
        const connectionTimeout = setTimeout(() => {
          if (!isDone) {
            isDone = true;
            reject(new Error('Live Voice connection timeout'));
          }
        }, 4000);

        if (!this.socket) {
          clearTimeout(connectionTimeout);
          reject(new Error('WebSocket initialization failed'));
          return;
        }

        this.socket.onopen = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('[LiveVoiceSession] WebSocket connected. Initializing Live session...');

          // Send initialization payload with context and optional user custom key
          const customApiKey = localStorage.getItem('ultron_gemini_api_key') || undefined;
          this.socket?.send(
            JSON.stringify({
              type: 'init',
              apiKey: customApiKey,
              userName: options.userName,
              memoryContext: options.memoryContext || {},
              recentHistory: (options.recentHistory || []).slice(-6),
            })
          );
          resolve();
        };

        this.socket.onerror = (err) => {
          if (isDone) return;
          isDone = true;
          clearTimeout(connectionTimeout);
          console.warn('[LiveVoiceSession] WebSocket channel unavailable in current frame/container:', (err as any)?.type || 'handshake_notice');
          reject(new Error('WebSocket channel unavailable in preview frame'));
        };
      });

      this.setupSocketListeners();

      // 3. Start Microphone Capture
      await this.inputManager.start((base64Pcm, rms) => {
        // Voice Activity Detection
        const isAiSpeaking = this.outputManager.isPlaying();
        this.vad.processAudioChunk(rms, isAiSpeaking);

        // Stream audio chunk to server
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(
            JSON.stringify({
              type: 'audio',
              data: base64Pcm,
            })
          );
        }
      });

      this.sessionActive = true;
      this.setState('LISTENING');
      return true;
    } catch (err: any) {
      const isPermDenied = err?.name === 'NotAllowedError' || 
                           err?.name === 'PermissionDeniedError' || 
                           err?.message?.toLowerCase().includes('permission') || 
                           err?.message?.toLowerCase().includes('denied');
      console.warn('[LiveVoiceSession] Live session notice:', err?.message || err);
      this.setState('STOPPED');
      this.stopSession();
      // Only fallback if failure wasn't due to hard microphone denial
      this.callbacks?.onError(
        isPermDenied ? 'Microphone permission denied by browser or system settings.' : (err?.message || 'Live session unavailable'), 
        !isPermDenied
      );
      return false;
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'ready') {
          console.log(`[LiveVoiceSession] Native Live Audio-to-Audio active with model: ${msg.model}, voice: ${msg.voice}`);
          voicePipelineDiagnostics.updateStage('LIVE_SESSION', 'success', `Connected to Live Audio model: ${msg.model}`);
          voicePipelineDiagnostics.updateStage('UI_STATE', 'active', 'UI transitioned to LISTENING');
          this.setState('LISTENING');
        } else if (msg.type === 'audio') {
          // Play incoming 24kHz PCM chunk progressively
          voicePipelineDiagnostics.updateStage('RESPONSE_AUDIO', 'active', 'Receiving streaming 24kHz PCM response audio...');
          voicePipelineDiagnostics.updateStage('AUDIO_OUTPUT', 'active', 'AudioTrack playing 24kHz stream through speaker');
          this.outputManager.enqueuePcmChunk(msg.data, 24000);
        } else if (msg.type === 'transcript') {
          if (msg.role === 'assistant') {
            this.currentAssistantSpokenText += msg.text;
            voicePipelineDiagnostics.updateStage('AI_RESPONSE', 'active', `AI response stream: "${this.currentAssistantSpokenText.slice(-50)}"`);
            this.callbacks?.onAssistantTranscript(this.currentAssistantSpokenText);
          } else if (msg.role === 'user') {
            this.currentSpokenUserText += msg.text;
            voicePipelineDiagnostics.updateStage('AUDIO_STREAM', 'success', `User speech: "${this.currentSpokenUserText.slice(-50)}"`);
            this.callbacks?.onUserTranscript(this.currentSpokenUserText, false);
          }
        } else if (msg.type === 'interrupted') {
          console.log('[LiveVoiceSession] Interruption acknowledged by AI model.');
          voicePipelineDiagnostics.updateStage('VAD', 'active', 'Barge-in registered; halting AI audio playback.');
          this.outputManager.stopCurrentPlayback();
          this.setState('USER_SPEAKING');
        } else if (msg.type === 'turnComplete') {
          // Assistant completed speaking
          voicePipelineDiagnostics.updateStage('AI_RESPONSE', 'success', 'AI response stream completed.');
          voicePipelineDiagnostics.updateStage('AUDIO_OUTPUT', 'success', 'Audio output playback concluded.');
          voicePipelineDiagnostics.updateStage('UI_STATE', 'active', 'UI returned to LISTENING standby.');
          if (this.currentAssistantSpokenText.trim().length > 0) {
            console.log('[LiveVoiceSession] Assistant turn complete:', this.currentAssistantSpokenText);
            this.currentAssistantSpokenText = '';
          }
          if (this.currentState !== 'USER_SPEAKING') {
            this.setState('LISTENING');
          }
        } else if (msg.type === 'toolCall') {
          // AI invoked an Android device tool over Live Audio!
          const calls: ToolCall[] = msg.calls || [];
          for (const call of calls) {
            console.log(`[LiveVoiceSession] Executing tool ${call.name} in Live session...`);
            this.setState('PROCESSING');

            const result = await toolRegistry.executeTool(call);
            this.callbacks?.onToolExecuted(call, result);

            // Report output back to Gemini Live
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              this.socket.send(
                JSON.stringify({
                  type: 'toolResponse',
                  callId: call.id,
                  name: call.name,
                  output: result.data || { message: result.message, success: result.success },
                })
              );
            }
          }
        } else if (msg.type === 'error') {
          console.warn('[LiveVoiceSession] Server notice:', msg.message);
          voicePipelineDiagnostics.updateStage('LIVE_SESSION', 'warning', msg.message);
          this.callbacks?.onError(msg.message, msg.canFallback !== false);
        }
      } catch (err: any) {
        console.warn('[LiveVoiceSession] Error handling socket message:', err);
      }
    };

    this.socket.onclose = () => {
      console.log('[LiveVoiceSession] Socket channel closed.');
      const wasConnected = this.isConnected;
      this.isConnected = false;
      if (this.sessionActive && wasConnected) {
        this.attemptReconnect();
      } else {
        this.stopSession();
      }
    };

    this.socket.onerror = (err) => {
      console.warn('[LiveVoiceSession] Socket channel event:', (err as any)?.type || 'event');
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      console.log(`[LiveVoiceSession] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
      this.setState('RECONNECTING');

      setTimeout(() => {
        if (this.sessionActive) {
          this.startSession({ userName: 'Asik' }).catch(() => {
            this.callbacks?.onError('Live channel unavailable. Switching to standard voice engine.', true);
          });
        }
      }, delay);
    } else {
      this.setState('STOPPED');
      this.callbacks?.onError('Live connection unavailable. Switching to standard voice engine.', true);
      this.stopSession();
    }
  }

  public toggleMute(): boolean {
    const isMuted = !this.inputManager.getMuted();
    this.inputManager.setMute(isMuted);
    return isMuted;
  }

  public isMuted(): boolean {
    return this.inputManager.getMuted();
  }

  public setSensitivity(level: number) {
    this.vad.setSensitivity(level);
  }

  // Barge-in interruption: immediately halt AI playback and alert backend
  public interrupt() {
    this.outputManager.stopCurrentPlayback();
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: 'interrupt' }));
      } catch (e) {}
    }
    this.setState('INTERRUPTED');
    console.log('[LiveVoiceSession] Assistant playback interrupted (barge-in executed).');
  }

  // Get live frequency data for the Energy Orb visualization
  public getAudioFrequencyData(): Uint8Array {
    if (this.outputManager.isPlaying()) {
      return this.outputManager.getFrequencyData();
    } else if (this.currentState === 'USER_SPEAKING' || this.currentState === 'LISTENING') {
      return this.inputManager.getFrequencyData();
    }
    return new Uint8Array(32).fill(0);
  }

  public stopSession() {
    this.sessionActive = false;
    this.isConnected = false;
    this.vad.reset();

    if (this.socket) {
      try {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'close' }));
        }
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }

    this.inputManager.stop();
    this.outputManager.close();

    this.setState('STOPPED');
    console.log('[LiveVoiceSession] Live voice session stopped and resources freed.');
  }
}

export const liveVoiceSession = LiveVoiceSession.getInstance();

// ============================================================================
// Helper Utilities for Downsampling & PCM Conversion
// ============================================================================
function downsampleBuffer(buffer: Float32Array, sampleRate: number, outSampleRate: number): Float32Array {
  if (outSampleRate === sampleRate) {
    return buffer;
  }
  if (outSampleRate > sampleRate) {
    throw new Error('Downsampling rate must be lower than input rate');
  }
  const sampleRateRatio = sampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function int16ToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, Math.min(i + chunkSize, len))));
  }
  return btoa(binary);
}
