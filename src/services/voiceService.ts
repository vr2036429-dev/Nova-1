import { voicePipelineDiagnostics } from './voicePipelineDiagnostics';

export class VoiceService {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private shouldStayListening: boolean = false;
  private permissionDenied: boolean = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private silenceTimer: any = null;
  private resumeListenTimer: any = null;
  private accumulatedTranscript: string = '';
  private lastSpokenText: string = '';
  private chosenVoice: SpeechSynthesisVoice | null = null;
  private currentPitch: number = 0.95;
  private currentRate: number = 1.05;
  
  // Callbacks
  public onInterimResult?: (transcript: string) => void;
  public onFinalResult?: (transcript: string) => void;
  public onStateChange?: (state: 'LISTENING' | 'STANDBY' | 'SPEAKING' | 'ERROR') => void;
  public onError?: (error: string) => void;
  public onSpeakStart?: () => void;
  public onSpeakEnd?: () => void;

  public setCallbacks(callbacks: {
    onInterimResult?: (transcript: string) => void;
    onFinalResult?: (transcript: string) => void;
    onStateChange?: (listening: boolean) => void;
    onError?: (error: string) => void;
    onSpeakStart?: () => void;
    onSpeakEnd?: () => void;
  }) {
    if (callbacks.onInterimResult) this.onInterimResult = callbacks.onInterimResult;
    if (callbacks.onFinalResult) this.onFinalResult = callbacks.onFinalResult;
    if (callbacks.onError) this.onError = callbacks.onError;
    if (callbacks.onSpeakStart) this.onSpeakStart = callbacks.onSpeakStart;
    if (callbacks.onSpeakEnd) this.onSpeakEnd = callbacks.onSpeakEnd;
    if (callbacks.onStateChange) {
      this.onStateChange = (state) => {
        callbacks.onStateChange?.(state === 'LISTENING');
      };
    }
  }

  public setPitch(pitch: number) {
    this.currentPitch = pitch;
  }

  public setRate(rate: number) {
    this.currentRate = rate;
  }

  constructor() {
    this.initVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoices();
      };
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    // Prefer authoritative British/American natural voices reminiscent of Jarvis
    this.chosenVoice = 
      voices.find(v => v.lang.startsWith('en') && (v.name.includes('UK') || v.name.includes('British') || v.name.includes('Natural') || v.name.includes('George') || v.name.includes('Oliver'))) ||
      voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('David') || v.name.includes('Male'))) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0] || null;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  }

  public setVoice(voiceName: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    const found = voices.find(v => v.name === voiceName);
    if (found) {
      this.chosenVoice = found;
    }
  }

  // Initialize Speech Recognition
  public isSpeechSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  public async initAudioAnalyzer(): Promise<boolean> {
    try {
      if (this.audioContext && this.analyser) {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        return true;
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        source.connect(this.analyser);
      }
      return true;
    } catch (err) {
      console.warn('AudioContext / mic stream init warning (permission or headless):', err);
      return false;
    }
  }

  public getAudioFrequencyData(): Uint8Array {
    if (this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);
      return dataArray;
    }
    // Return empty fallback array
    return new Uint8Array(64).fill(0);
  }

  public startListening(wakeWord: string = 'ULTRON', isUserGesture: boolean = false) {
    if (!this.isSpeechSupported()) {
      voicePipelineDiagnostics.updateStage('MIC_PERMISSION', 'error', 'Speech recognition is not supported in this browser environment.');
      this.onError?.('Speech recognition is not supported in this browser. You can type commands directly.');
      return;
    }

    if (this.permissionDenied && !isUserGesture) {
      console.warn('[ULTRON VoiceEngine] Microphone permission previously denied. Awaiting explicit user gesture.');
      return;
    }

    if (isUserGesture) {
      this.permissionDenied = false;
    }

    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    this.shouldStayListening = true;

    if (this.isListening && this.recognition) {
      return;
    }

    voicePipelineDiagnostics.startTurn();
    voicePipelineDiagnostics.updateStage('MIC_PERMISSION', 'active', 'Requesting microphone permission & calibrating...');
    voicePipelineDiagnostics.updateStage('AUDIO_INPUT', 'active', 'Initializing hardware acoustic capture pipeline...');

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.accumulatedTranscript = '';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.permissionDenied = false;
        voicePipelineDiagnostics.updateStage('MIC_PERMISSION', 'success', 'Microphone permission granted.');
        voicePipelineDiagnostics.updateStage('AUDIO_INPUT', 'success', 'Hardware microphone stream active (Full Duplex).');
        voicePipelineDiagnostics.updateStage('AUDIO_CAPTURE', 'success', '16kHz SpeechRecognition buffer capture online.');
        voicePipelineDiagnostics.updateStage('VAD', 'active', 'Voice Activity Detector tracking acoustic levels...');
        voicePipelineDiagnostics.updateStage('LIVE_SESSION', 'success', 'Voice session established with standard speech engine.');
        voicePipelineDiagnostics.updateStage('UI_STATE', 'active', 'UI transitioned to LISTENING.');
        this.onStateChange?.('LISTENING');
        this.initAudioAnalyzer().catch(() => {});
      };

      this.recognition.onresult = (event: any) => {
        // Echo cancellation / Speaker bleed protection:
        // When assistant is speaking output, DO NOT allow microphone bleed to self-cancel speech output!
        if (this.isSpeaking) {
          let hasBargeInKeyword = false;
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const t = (event.results[i][0].transcript || '').toLowerCase().trim();
            if (t.includes('stop') || t.includes('quiet') || t.includes('ultron') || t.includes('pause')) {
              hasBargeInKeyword = true;
              break;
            }
          }
          if (hasBargeInKeyword) {
            console.log('[ULTRON VoiceEngine] User barge-in detected during AI speech.');
            voicePipelineDiagnostics.updateStage('VAD', 'active', 'User barge-in keyword recognized; interrupting AI playback.');
            this.stopSpeaking();
          } else {
            // Disregard speaker echo
            return;
          }
        }

        let interim = '';
        let finalSegment = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalSegment += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          this.onInterimResult?.(interim);
          voicePipelineDiagnostics.updateStage('VAD', 'active', `Speech detected: "${interim.slice(0, 40)}..."`);
        }

        if (finalSegment) {
          this.accumulatedTranscript = (this.accumulatedTranscript + ' ' + finalSegment).trim();
          this.onInterimResult?.(this.accumulatedTranscript);
        }

        // Debounce timer for natural turn completion
        clearTimeout(this.silenceTimer);
        const textToEvaluate = (this.accumulatedTranscript || interim).trim();

        if (textToEvaluate.length > 0) {
          this.silenceTimer = setTimeout(() => {
            const finishedText = (this.accumulatedTranscript || interim).trim();
            if (finishedText.length > 0) {
              this.accumulatedTranscript = '';
              // TRACE AND GUARANTEE PIPELINE DISPATCH:
              console.log('[ULTRON VoiceEngine] Dispatching recognized voice input:', finishedText);
              voicePipelineDiagnostics.updateStage('VAD', 'success', `Turn finished. Speech duration finalized.`);
              voicePipelineDiagnostics.updateStage('AUDIO_STREAM', 'success', `Captured voice utterance: "${finishedText}"`, { text: finishedText });
              voicePipelineDiagnostics.updateStage('AI_RESPONSE', 'pending', 'Routing user speech directive to AI Core...');
              this.onFinalResult?.(finishedText);
            }
          }, 1100);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('[ULTRON VoiceEngine] Speech error:', event.error);
        if (event.error === 'no-speech') {
          // Normal silence, keep listening
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          voicePipelineDiagnostics.updateStage('MIC_PERMISSION', 'error', 'Microphone access denied by browser or system settings.');
          this.onError?.('Microphone access was denied. Please allow microphone permissions in your browser or device settings.');
          this.isListening = false;
          this.shouldStayListening = false;
          this.permissionDenied = true;
          this.onStateChange?.('ERROR');
        } else if (event.error === 'audio-capture') {
          voicePipelineDiagnostics.updateStage('AUDIO_INPUT', 'error', 'No microphone hardware detected or audio capture failed.');
          this.isListening = false;
          this.shouldStayListening = false;
          this.onStateChange?.('ERROR');
        } else {
          voicePipelineDiagnostics.updateStage('AUDIO_CAPTURE', 'warning', `Capture event notice: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Auto-restart ONLY if shouldStayListening is active and permission is not denied
        if (this.shouldStayListening && !this.permissionDenied && !this.isSpeaking) {
          try {
            this.recognition.start();
            this.isListening = true;
          } catch (e) {
            this.shouldStayListening = false;
            this.onStateChange?.('STANDBY');
          }
        } else {
          this.onStateChange?.('STANDBY');
        }
      };

      this.recognition.start();
    } catch (err: any) {
      console.error('[ULTRON VoiceEngine] Recognition start error:', err);
      this.isListening = false;
      voicePipelineDiagnostics.updateStage('MIC_PERMISSION', 'error', err.message || 'Failed to initialize speech recognition');
      this.onError?.(err.message || 'Failed to initialize speech recognition');
    }
  }

  public stopListening() {
    this.shouldStayListening = false;
    clearTimeout(this.silenceTimer);
    clearTimeout(this.resumeListenTimer);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }
    this.isListening = false;
    voicePipelineDiagnostics.updateStage('AUDIO_CAPTURE', 'idle', 'Audio capture halted.');
    voicePipelineDiagnostics.updateStage('UI_STATE', 'active', 'UI transitioned to STANDBY.');
    this.onStateChange?.('STANDBY');
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }

  public speak(
    text: string, 
    onStart?: () => void, 
    onEnd?: () => void,
    pitch: number = 0.95,
    rate: number = 1.05
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        voicePipelineDiagnostics.updateStage('RESPONSE_AUDIO', 'warning', 'SpeechSynthesis API unavailable in current environment.');
        onEnd?.();
        resolve();
        return;
      }

      // Stop any active speech
      this.stopSpeaking();

      // Clean spoken text: strip markdown symbols, asterisks, URLs, JSON
      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`{1,3}[\s\S]*?`{1,3}/g, 'code block')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/https?:\/\/\S+/g, 'link')
        .replace(/[#_~]/g, '')
        .trim();

      if (!cleanText) {
        onEnd?.();
        resolve();
        return;
      }

      this.lastSpokenText = cleanText;
      voicePipelineDiagnostics.updateStage('RESPONSE_AUDIO', 'active', `Synthesizing neural vocal waveform (${cleanText.length} chars)...`, {
        charCount: cleanText.length,
      });

      // Crucial fix: Unpause / resume SpeechSynthesis to avoid stuck states in Chromium
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (e) {}

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (this.chosenVoice) {
        utterance.voice = this.chosenVoice;
      }
      utterance.pitch = pitch ?? this.currentPitch;
      utterance.rate = rate ?? this.currentRate;

      let hasEnded = false;
      const safeEnd = () => {
        if (!hasEnded) {
          hasEnded = true;
          this.isSpeaking = false;
          voicePipelineDiagnostics.updateStage('AUDIO_OUTPUT', 'success', 'Audio playback completed.');
          voicePipelineDiagnostics.updateStage('UI_STATE', 'active', 'Turn complete. Ultron awaiting next input.');
          this.onSpeakEnd?.();
          onEnd?.();

          // Acoustic decay settling buffer (350ms):
          // Wait for speaker reverberation in room to dissipate before resuming recognition
          clearTimeout(this.resumeListenTimer);
          this.resumeListenTimer = setTimeout(() => {
            if (this.shouldStayListening && !this.isSpeaking) {
              try {
                if (this.recognition && !this.isListening) {
                  this.recognition.start();
                }
              } catch (e) {}
            }
          }, 350);

          resolve();
        }
      };

      utterance.onstart = () => {
        this.isSpeaking = true;
        voicePipelineDiagnostics.updateStage('RESPONSE_AUDIO', 'success', 'Neural audio synthesized successfully.');
        voicePipelineDiagnostics.updateStage('AUDIO_OUTPUT', 'active', 'AudioTrack playback transmitting through speaker.');
        voicePipelineDiagnostics.updateStage('UI_STATE', 'active', 'UI transitioned to SPEAKING.');
        this.onStateChange?.('SPEAKING');
        this.onSpeakStart?.();
        onStart?.();
      };

      utterance.onend = () => {
        safeEnd();
      };

      utterance.onerror = (e) => {
        console.warn('[ULTRON VoiceEngine] TTS error:', e);
        voicePipelineDiagnostics.updateStage('RESPONSE_AUDIO', 'warning', `TTS notice: ${e.error || 'Speech error'}`);
        safeEnd();
      };

      // Safeguard against Chrome speech synthesis hanging indefinitely on long texts
      const wordCount = cleanText.split(/\s+/).length;
      const estimatedDurationMs = Math.max(3000, (wordCount / 2.2) * 1000 + 2000);
      const watchdog = setTimeout(() => {
        if (this.isSpeaking) {
          console.log('[ULTRON VoiceEngine] Speech watchdog triggered safe termination');
          this.stopSpeaking();
          safeEnd();
        }
      }, estimatedDurationMs);

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err: any) {
        console.warn('[ULTRON VoiceEngine] Failed to initiate speech output:', err);
        voicePipelineDiagnostics.updateStage('AUDIO_OUTPUT', 'error', err?.message || 'Failed to play speech');
        safeEnd();
      }
    });
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const voiceService = new VoiceService();
