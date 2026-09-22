export class VoiceService {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private silenceTimer: any = null;
  private accumulatedTranscript: string = '';
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

  public startListening(wakeWord: string = 'ULTRON') {
    if (!this.isSpeechSupported()) {
      this.onError?.('Speech recognition is not supported in this browser. You can type commands directly.');
      return;
    }

    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    if (this.isListening && this.recognition) {
      return;
    }

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
        this.onStateChange?.('LISTENING');
        this.initAudioAnalyzer().catch(() => {});
      };

      this.recognition.onresult = (event: any) => {
        // If assistant was speaking, voice interruption takes effect immediately!
        if (this.isSpeaking) {
          this.stopSpeaking();
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
        if (event.error === 'not-allowed') {
          this.onError?.('Microphone access was denied. Please allow microphone permissions.');
          this.isListening = false;
          this.onStateChange?.('ERROR');
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // If continuous mode or waiting, we can safely restart or enter STANDBY
        this.onStateChange?.('STANDBY');
      };

      this.recognition.start();
    } catch (err: any) {
      console.error('[ULTRON VoiceEngine] Recognition start error:', err);
      this.isListening = false;
      this.onError?.(err.message || 'Failed to initialize speech recognition');
    }
  }

  public stopListening() {
    clearTimeout(this.silenceTimer);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }
    this.isListening = false;
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
          this.onSpeakEnd?.();
          onEnd?.();
          resolve();
        }
      };

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.onStateChange?.('SPEAKING');
        this.onSpeakStart?.();
        onStart?.();
      };

      utterance.onend = () => {
        safeEnd();
      };

      utterance.onerror = (e) => {
        console.warn('[ULTRON VoiceEngine] TTS error:', e);
        safeEnd();
      };

      // Safeguard against Chrome speech synthesis hanging on long texts
      const wordCount = cleanText.split(/\s+/).length;
      const estimatedDurationMs = Math.max(3000, (wordCount / 2.5) * 1000 + 1500);
      const watchdog = setTimeout(() => {
        if (this.isSpeaking) {
          console.log('[ULTRON VoiceEngine] Speech watchdog triggered');
          this.stopSpeaking();
          safeEnd();
        }
      }, estimatedDurationMs);

      window.speechSynthesis.speak(utterance);
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
