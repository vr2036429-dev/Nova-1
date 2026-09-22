import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  UltronState, 
  ViewTab, 
  Message, 
  DeviceStatus, 
  ConfirmationRequest, 
  ScreenElement, 
  AutomationWorkflow,
  ToolResult,
  ToolCall,
  LiveVoiceState,
  VoiceEngineType
} from './types';
import { voiceService } from './services/voiceService';
import { liveVoiceSession } from './services/liveVoiceSession';
import { toolRegistry } from './services/toolRegistry';
import { biometricService } from './services/biometricService';
import { memoryService } from './services/memoryService';
import { automationEngine } from './services/automationEngine';

import { HudHeader } from './components/HudHeader';
import { VoiceHudView } from './components/VoiceHudView';
import { ChatView } from './components/ChatView';
import { AutomationView } from './components/AutomationView';
import { ToolsView } from './components/ToolsView';
import { BiometricModal } from './components/BiometricModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ScreenReaderModal } from './components/ScreenReaderModal';
import { AppWindowModal } from './components/AppWindowModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Core state machine
  const [state, setState] = useState<UltronState>('STANDBY');
  const [activeTab, setActiveTab] = useState<ViewTab>('orb_hud');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>('');
  const [assistantSpokenText, setAssistantSpokenText] = useState<string>('');
  const [liveVoiceState, setLiveVoiceState] = useState<LiveVoiceState>('STOPPED');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);

  // Conversation history
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome_msg',
      role: 'assistant',
      content: 'ULTRON Jarvis Assistant initialized and operational. Voice recognition, biometric enclave, and Android tool integrations are standing by.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Telemetry & Device Status
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    batteryLevel: 0.88,
    isCharging: true,
    torchOn: false,
    screenAwake: false,
    networkConnected: true,
    locationEnabled: true,
  });

  // User Preferences & Memory
  const [preferences, setPreferences] = useState(memoryService.getPreferences());
  const [contextFacts, setContextFacts] = useState(memoryService.getContextFacts());

  // Storage and Notifications
  const [storedFiles, setStoredFiles] = useState(toolRegistry.getFiles());
  const [storedNotifs, setStoredNotifs] = useState(toolRegistry.getNotifications());

  // Modals & Overlay state
  const [biometricModal, setBiometricModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onSuccess?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  const [confirmationRequest, setConfirmationRequest] = useState<ConfirmationRequest | null>(null);

  const [screenReaderModal, setScreenReaderModal] = useState<{
    isOpen: boolean;
    elements: ScreenElement[];
  }>({
    isOpen: false,
    elements: [],
  });

  const [appWindowModal, setAppWindowModal] = useState<{
    isOpen: boolean;
    appName: string;
    actionParam?: string;
  }>({
    isOpen: false,
    appName: '',
    actionParam: '',
  });

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Workflow state
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // References to prevent stale closure inside callbacks
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const stateRef = useRef(state);
  stateRef.current = state;

  // -------------------------------------------------------------
  // Initial Hardware & Device Telemetry Sync
  // -------------------------------------------------------------
  useEffect(() => {
    toolRegistry.getBatteryDiagnostics().then((b) => {
      setDeviceStatus((prev) => ({
        ...prev,
        batteryLevel: b.level,
        isCharging: b.charging,
      }));
    });
  }, []);

  // -------------------------------------------------------------
  // Main Command & AI Dispatcher (Voice & Text)
  // -------------------------------------------------------------
  const handleExecuteCommand = useCallback(async (
    rawInput: string, 
    isVoiceInput: boolean = false
  ) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    console.log(`[ULTRON Core] Executing input (voice=${isVoiceInput}): "${trimmed}"`);

    // Wake Word filter check if in wakeword mode
    const currentPrefs = preferencesRef.current;
    let commandText = trimmed;
    if (isVoiceInput && currentPrefs.voiceMode === 'wakeword') {
      const wake = currentPrefs.wakeWord.toLowerCase();
      const lower = trimmed.toLowerCase();
      if (!lower.includes(wake)) {
        console.log(`[ULTRON Core] Wake word "${wake}" not found in utterance. Ignoring.`);
        return;
      }
      // Strip wake word
      commandText = trimmed.replace(new RegExp(currentPrefs.wakeWord, 'gi'), '').trim();
      if (!commandText) {
        // Just summoned!
        voiceService.speak("Yes Asik, I'm listening. How can I assist you?");
        setState('LISTENING');
        return;
      }
    }

    // 1. Add User Message to History
    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVoiceInput,
    };

    setMessages((prev) => [...prev, userMsg]);
    setTranscription('');
    setState('THINKING');

    // 2. Multi-step Workflow check
    const detectedSteps = automationEngine.parseMultiStepIntent(commandText);
    if (detectedSteps && detectedSteps.length > 1) {
      console.log('[ULTRON Core] Multi-step workflow detected:', detectedSteps);
      const customWf: AutomationWorkflow = {
        id: `auto_${Date.now()}`,
        name: 'Multi-Step Direct Command',
        description: commandText,
        triggerPhrase: commandText,
        enabled: true,
        steps: detectedSteps,
      };
      await runWorkflow(customWf);
      return;
    }

    try {
      // 3. Call Server Neural Core /api/chat
      const historyPayload = messagesRef.current.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: commandText,
          message: commandText,
          conversationHistory: historyPayload,
          history: historyPayload,
          userName: currentPrefs.userName,
          memoryContext: {
            userName: currentPrefs.userName,
            facts: memoryService.getContextFacts(),
            deviceStatus,
          },
          context: {
            userName: currentPrefs.userName,
            facts: memoryService.getContextFacts(),
            deviceStatus,
          },
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantText = data.text || 'Command processed.';
      const toolCalls: ToolCall[] = data.toolCalls || [];
      const sources = data.sources || [];
      const toolResults: ToolResult[] = [];

      // 4. Handle Tool Calls
      if (toolCalls.length > 0) {
        setState('EXECUTING');

        for (const tc of toolCalls) {
          const confirmationLevel = biometricService.getToolConfirmationLevel(tc.name, tc.args);

          if (confirmationLevel === 3) {
            // Level 3: Real biometric security authentication required
            const authPassed = await new Promise<boolean>((resolve) => {
              setBiometricModal({
                isOpen: true,
                title: `Authorize ${tc.name}`,
                description: `Executing ${tc.name} requires biometric verification.`,
                onSuccess: () => {
                  setBiometricModal((prev) => ({ ...prev, isOpen: false }));
                  resolve(true);
                },
              });
            });

            if (!authPassed) {
              toolResults.push({
                toolCallId: tc.id,
                toolName: tc.name,
                success: false,
                message: 'Biometric authorization denied.',
                timestamp: new Date().toLocaleTimeString(),
              });
              continue;
            }
          } else if (confirmationLevel === 2) {
            // Level 2: Sensitive user confirmation required
            const userConfirmed = await new Promise<boolean>((resolve) => {
              setConfirmationRequest({
                id: `req_${Date.now()}`,
                title: `Confirm: ${tc.name}`,
                description: `ULTRON is requesting to execute a sensitive device action: ${tc.name}.`,
                level: 2,
                toolCall: tc,
                params: tc.args,
                onConfirm: () => {
                  setConfirmationRequest(null);
                  resolve(true);
                },
                onCancel: () => {
                  setConfirmationRequest(null);
                  resolve(false);
                },
              });
            });

            if (!userConfirmed) {
              toolResults.push({
                toolCallId: tc.id,
                toolName: tc.name,
                success: false,
                message: 'Action cancelled by user.',
                timestamp: new Date().toLocaleTimeString(),
              });
              continue;
            }
          }

          // Execute Safe / Approved Tool
          const result = await toolRegistry.executeTool(tc, {
            onOpenAppModal: (appName, param) => {
              setAppWindowModal({ isOpen: true, appName, actionParam: param });
            },
            onOpenSettingsModal: (section) => {
              setAppWindowModal({ isOpen: true, appName: `Settings: ${section}` });
            },
          });

          toolResults.push(result);

          // Update storage state if file operation
          if (tc.name === 'fileOperation') {
            setStoredFiles([...toolRegistry.getFiles()]);
          }
          if (tc.name === 'controlDeviceFeature' && tc.args.feature === 'torch') {
            setDeviceStatus((prev) => ({ ...prev, torchOn: !prev.torchOn }));
          }
        }
      }

      // 5. Append Assistant Response to Chat
      const assistantMsg: Message = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolResults: toolResults.length > 0 ? toolResults : undefined,
        sources: sources.length > 0 ? sources : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setAssistantSpokenText(assistantText);

      // 6. Voice Synthesis - Speak the Response Aloud!
      // This is the critical voice-to-AI link requested by user!
      setState('SPEAKING');
      voiceService.speak(assistantText);

    } catch (err: any) {
      console.error('[ULTRON Core] Error in command pipeline:', err);
      setState('ERROR');
      const errorMsgText = `System alert: unable to execute command. ${err.message || 'Offline mode active.'}`;
      
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: errorMsgText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      voiceService.speak('System notice: error processing neural directive.');
    }
  }, [deviceStatus]);

  // -------------------------------------------------------------
  // Voice Service Callbacks Setup (Crucial Pipeline)
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Setup Native Live Audio-to-Audio Session Callbacks
    liveVoiceSession.setCallbacks({
      onStateChange: (liveState: LiveVoiceState) => {
        setLiveVoiceState(liveState);
        setState((prev) => {
          if (liveState === 'USER_SPEAKING') return 'USER_SPEAKING';
          if (liveState === 'AI_SPEAKING') return 'AI_SPEAKING';
          if (liveState === 'INTERRUPTED') return 'INTERRUPTED';
          if (liveState === 'PROCESSING') return 'PROCESSING';
          if (liveState === 'RECONNECTING') return 'RECONNECTING';
          if (liveState === 'LISTENING') return 'LISTENING';
          if (liveState === 'ERROR') return 'ERROR';
          if (liveState === 'STOPPED') return 'STANDBY';
          return prev;
        });

        setIsListening(liveState !== 'STOPPED' && liveState !== 'ERROR');
        setIsSpeaking(liveState === 'AI_SPEAKING');
      },
      onUserTranscript: (text: string, isFinal: boolean) => {
        setTranscription(text);
      },
      onAssistantTranscript: (text: string) => {
        setAssistantSpokenText(text);
      },
      onToolExecuted: (toolCall: ToolCall, result: ToolResult) => {
        console.log('[Live Voice Engine] Executed tool in live session:', toolCall.name, result);
        if (toolCall.name === 'openApp') {
          const appName = toolCall.args.appName || 'Application';
          setAppWindowModal({ isOpen: true, appName });
        } else if (toolCall.name === 'openSettings') {
          const section = toolCall.args.section || 'General';
          setAppWindowModal({ isOpen: true, appName: `Settings: ${section}` });
        } else if (toolCall.name === 'controlDeviceFeature' && toolCall.args.feature === 'torch') {
          setDeviceStatus((prev) => ({ ...prev, torchOn: !prev.torchOn }));
        } else if (toolCall.name === 'fileOperation') {
          setStoredFiles([...toolRegistry.getFiles()]);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `live_tool_${Date.now()}`,
            role: 'assistant',
            content: `Executed ${toolCall.name}: ${result.message}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            toolCalls: [toolCall],
            toolResults: [result],
          },
        ]);
      },
      onError: (errMsg: string, canFallback: boolean) => {
        console.warn('[Live Voice Engine] Notice:', errMsg);
        if (canFallback) {
          console.log('[Live Voice Engine] Seamlessly switching to Standard Voice engine...');
          handleUpdatePreferences({ voiceEngine: 'fallback_stt_tts' });
          voiceService.startListening();
          setIsListening(true);
          setState('LISTENING');
        }
      },
    });

    // 2. Setup Standard STT/TTS Fallback Engine Callbacks
    voiceService.setCallbacks({
      onInterimResult: (text: string) => {
        setTranscription(text);
        if (stateRef.current !== 'LISTENING') {
          setState('LISTENING');
        }
      },
      onFinalResult: (finalText: string) => {
        console.log('[ULTRON Voice Pipeline] Captured turn final speech:', finalText);
        setTranscription(finalText);
        // Dispatch to AI pipeline
        handleExecuteCommand(finalText, true);
      },
      onError: (error: string) => {
        console.warn('[ULTRON Voice Pipeline] Recognition notice:', error);
      },
      onStateChange: (listening: boolean) => {
        setIsListening(listening);
        if (!listening && stateRef.current === 'LISTENING') {
          setState('STANDBY');
        }
      },
      onSpeakStart: () => {
        setIsSpeaking(true);
        setState('SPEAKING');
      },
      onSpeakEnd: () => {
        setIsSpeaking(false);
        // Return to listening if continuous mode is on, else STANDBY
        if (preferencesRef.current.voiceMode === 'continuous') {
          setState('LISTENING');
          voiceService.startListening();
        } else {
          setState('STANDBY');
        }
      },
    });
  }, [handleExecuteCommand]);

  // -------------------------------------------------------------
  // Workflow Execution Runner
  // -------------------------------------------------------------
  const runWorkflow = async (workflow: AutomationWorkflow) => {
    setActiveWorkflowId(workflow.id);
    setState('EXECUTING');

    voiceService.speak(`Initializing automation workflow: ${workflow.name}`);

    const res = await automationEngine.executeWorkflow(
      workflow,
      (idx, step) => {
        setCurrentStepIndex(idx);
      },
      {
        onOpenAppModal: (appName, param) => {
          setAppWindowModal({ isOpen: true, appName, actionParam: param });
        },
        onOpenSettingsModal: (section) => {
          setAppWindowModal({ isOpen: true, appName: `Settings: ${section}` });
        },
      }
    );

    setActiveWorkflowId(null);
    setStoredFiles([...toolRegistry.getFiles()]);

    const completionText = res.success
      ? `Workflow ${workflow.name} completed successfully.`
      : `Workflow encountered an issue during execution.`;

    const workflowMsg: Message = {
      id: `wf_res_${Date.now()}`,
      role: 'assistant',
      content: completionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolResults: res.results,
    };

    setMessages((prev) => [...prev, workflowMsg]);
    voiceService.speak(completionText);
    setState('SPEAKING');
  };

  // -------------------------------------------------------------
  // Toggle Voice Listening (Audio-to-Audio Live Session / Standard STT)
  // -------------------------------------------------------------
  const handleToggleListening = async () => {
    const isLive = preferences.voiceEngine !== 'fallback_stt_tts';

    if (isListening) {
      if (isLive) {
        liveVoiceSession.stopSession();
      }
      voiceService.stopListening();
      voiceService.stopSpeaking();
      setIsListening(false);
      setIsSpeaking(false);
      setState('STANDBY');
    } else {
      if (isLive) {
        liveVoiceSession.setSensitivity(preferences.vadSensitivity || 3);
        const started = await liveVoiceSession.startSession({
          userName: preferences.userName,
          memoryContext: {
            facts: contextFacts,
            deviceStatus,
          },
          recentHistory: messages,
        });
        if (!started) {
          console.warn('[ULTRON Core] Live session could not start. Falling back to Standard Voice.');
          voiceService.startListening();
        }
      } else {
        voiceService.startListening();
      }
      setIsListening(true);
    }
  };

  const handleToggleMute = () => {
    const muted = liveVoiceSession.toggleMute();
    setIsMicMuted(muted);
  };

  const handleToggleEngine = () => {
    const nextEngine: VoiceEngineType = preferences.voiceEngine === 'fallback_stt_tts' ? 'live_audio' : 'fallback_stt_tts';
    handleUpdatePreferences({ voiceEngine: nextEngine, audioToAudioEnabled: nextEngine === 'live_audio' });

    if (isListening) {
      if (nextEngine === 'live_audio') {
        voiceService.stopListening();
        voiceService.stopSpeaking();
        liveVoiceSession.startSession({
          userName: preferences.userName,
          memoryContext: { facts: contextFacts, deviceStatus },
          recentHistory: messages,
        });
      } else {
        liveVoiceSession.stopSession();
        voiceService.startListening();
      }
    }
  };

  const handleInterruptAi = () => {
    if (preferences.voiceEngine !== 'fallback_stt_tts') {
      liveVoiceSession.interrupt();
    }
    voiceService.stopSpeaking();
    setIsSpeaking(false);
    setState('LISTENING');
  };

  // -------------------------------------------------------------
  // Quick Hardware Handlers
  // -------------------------------------------------------------
  const handleToggleTorch = async () => {
    const res = await toolRegistry.toggleFlashlight();
    setDeviceStatus((prev) => ({ ...prev, torchOn: res }));
  };

  const handleInspectScreen = () => {
    const elements = toolRegistry.inspectScreenElements();
    setScreenReaderModal({
      isOpen: true,
      elements,
    });
  };

  const handleReadScreenAloud = () => {
    const elements = screenReaderModal.elements;
    const text = `Screen inspection reports ${elements.length} accessible controls: ${elements.map(e => e.label).join(', ')}.`;
    voiceService.speak(text);
  };

  const handleUpdatePreferences = (newPrefs: Partial<typeof preferences>) => {
    memoryService.updatePreferences(newPrefs);
    setPreferences(memoryService.getPreferences());
  };

  const handleClearMemory = () => {
    memoryService.clearMemory();
    setContextFacts([]);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans relative overflow-hidden select-none">
      {/* Background HUD Grid Scanlines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-40" />

      {/* Screen Torch Hardware Overlay if active */}
      {deviceStatus.torchOn && (
        <div className="fixed inset-0 pointer-events-none bg-amber-100/10 mix-blend-screen z-50 animate-pulse" />
      )}

      {/* Top HUD Header */}
      <HudHeader
        state={state}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'settings') {
            setSettingsModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        deviceStatus={deviceStatus}
        isListening={isListening}
        biometricEnrolled={preferences.biometricEnrolled}
        onToggleTorch={handleToggleTorch}
        onToggleMic={handleToggleListening}
      />

      {/* Main Content Area based on Tab */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {activeTab === 'orb_hud' && (
          <VoiceHudView
            state={state}
            isListening={isListening}
            isSpeaking={isSpeaking}
            transcription={transcription}
            assistantResponseText={assistantSpokenText}
            wakeWord={preferences.wakeWord}
            voiceMode={preferences.voiceMode}
            voiceEngine={preferences.voiceEngine || 'live_audio'}
            liveVoiceState={liveVoiceState}
            isMuted={isMicMuted}
            onToggleListening={handleToggleListening}
            onStopSpeaking={() => voiceService.stopSpeaking()}
            onToggleMute={handleToggleMute}
            onToggleEngine={handleToggleEngine}
            onInterruptAi={handleInterruptAi}
            onSubmitCommand={(cmd, isVoice) => handleExecuteCommand(cmd, isVoice)}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            messages={messages}
            isListening={isListening}
            onToggleListening={handleToggleListening}
            onSendMessage={(text, isVoice) => handleExecuteCommand(text, isVoice)}
            onReplayAudio={(text) => voiceService.speak(text)}
          />
        )}

        {activeTab === 'automation' && (
          <AutomationView
            onRunWorkflow={runWorkflow}
            activeWorkflowId={activeWorkflowId}
            currentStepIndex={currentStepIndex}
          />
        )}

        {activeTab === 'tools' && (
          <ToolsView
            files={storedFiles}
            notifications={storedNotifs}
            deviceStatus={deviceStatus}
            onOpenApp={(appName) => {
              setAppWindowModal({ isOpen: true, appName });
              voiceService.speak(`Launching Android application ${appName}.`);
            }}
            onOpenSettings={(section) => {
              setAppWindowModal({ isOpen: true, appName: `Settings: ${section}` });
            }}
            onInspectScreen={handleInspectScreen}
            onToggleTorch={handleToggleTorch}
            onTriggerVibration={() => {
              if (navigator.vibrate) navigator.vibrate([100, 60, 100]);
            }}
            onCheckBattery={() => {
              voiceService.speak(`Battery level is ${(deviceStatus.batteryLevel * 100).toFixed(0)} percent, charging status verified.`);
            }}
            onMakeCall={(name, phone) => {
              handleExecuteCommand(`Call ${name}`, false);
            }}
            onTriggerWebSearch={(q) => {
              handleExecuteCommand(`Research ${q}`, false);
            }}
          />
        )}
      </main>

      {/* MODALS */}
      {/* 1. Biometric Security Modal (Level 3) */}
      <BiometricModal
        isOpen={biometricModal.isOpen}
        title={biometricModal.title}
        description={biometricModal.description}
        onSuccess={() => {
          if (biometricModal.onSuccess) biometricModal.onSuccess();
        }}
        onCancel={() => {
          setBiometricModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />

      {/* 2. Sensitive Confirmation Modal (Level 2) */}
      <ConfirmationModal
        request={confirmationRequest}
        onConfirm={() => {
          if (confirmationRequest?.onConfirm) confirmationRequest.onConfirm();
        }}
        onCancel={() => {
          if (confirmationRequest?.onCancel) confirmationRequest.onCancel();
        }}
      />

      {/* 3. Screen Reader & Accessibility Inspector Modal */}
      <ScreenReaderModal
        isOpen={screenReaderModal.isOpen}
        elements={screenReaderModal.elements}
        onClose={() => setScreenReaderModal({ isOpen: false, elements: [] })}
        onReadAloud={handleReadScreenAloud}
        onTapElement={(el) => {
          voiceService.speak(`Tapped ${el.label}`);
          setScreenReaderModal({ isOpen: false, elements: [] });
        }}
      />

      {/* 4. Simulated Android App Window Modal */}
      <AppWindowModal
        isOpen={appWindowModal.isOpen}
        appName={appWindowModal.appName}
        actionParam={appWindowModal.actionParam}
        onClose={() => setAppWindowModal({ isOpen: false, appName: '', actionParam: '' })}
      />

      {/* 5. System Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        preferences={preferences}
        contextFacts={contextFacts}
        onClose={() => setSettingsModalOpen(false)}
        onUpdatePreferences={handleUpdatePreferences}
        onClearMemory={handleClearMemory}
      />
    </div>
  );
}
