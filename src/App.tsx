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
import { TaskContinuityView } from './components/TaskContinuityView';
import { MultimodalView } from './components/MultimodalView';
import { ResearchAgentView } from './components/ResearchAgentView';
import { DiagnosticsView } from './components/DiagnosticsView';
import { CoderWorkspaceView } from './components/CoderWorkspaceView';
import { ultronAutonomousEngine } from './services/ultronAutonomousEngine';
import { taskContinuityEngine } from './services/taskContinuityEngine';
import { diagnosticEngine } from './services/diagnosticEngine';
import { voicePipelineDiagnostics } from './services/voicePipelineDiagnostics';
import { BiometricModal } from './components/BiometricModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ScreenReaderModal } from './components/ScreenReaderModal';
import { AppWindowModal } from './components/AppWindowModal';
import { SettingsModal } from './components/SettingsModal';
import { VoiceLockModal } from './components/VoiceLockModal';
import { OwnerSecurityCenterView } from './components/OwnerSecurityCenterView';
import { ultronVoiceAuth } from './services/ultronVoiceAuthService';
import { ultronOwnerIdentityEngine } from './services/ultronOwnerIdentityEngine';
import { ultronTrustSession } from './services/ultronTrustSession';

const CYCLABLE_TABS: ViewTab[] = [
  'orb_hud',
  'chat',
  'tasks',
  'multimodal',
  'research',
  'automation',
  'tools',
  'coder',
  'diagnostics',
  'security',
];

const TAB_DISPLAY_NAMES: Record<ViewTab, string> = {
  orb_hud: 'Voice Orb HUD',
  chat: 'Conversation Stream',
  tasks: 'Task Continuity & Planner',
  multimodal: 'Vision & Screen Intelligence',
  research: 'Deep Web Research Agent',
  automation: 'Automations & Workflows',
  tools: 'Tools & Android Apps',
  coder: 'ULTRON Coder & IDE',
  diagnostics: 'Diagnostics & Telemetry',
  security: 'Owner Security Center',
  settings: 'System Settings',
};

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
  const [voiceLockModalOpen, setVoiceLockModalOpen] = useState(false);

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
  // Touch Gesture Navigation (Swiping Left/Right on Main View)
  // -------------------------------------------------------------
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const [swipeHint, setSwipeHint] = useState<{ direction: 'left' | 'right'; targetTabName: string } | null>(null);
  const swipeHintTimeoutRef = useRef<any>(null);

  const cycleTab = useCallback((direction: 'next' | 'prev') => {
    setActiveTab((currentTab) => {
      const currentIndex = CYCLABLE_TABS.indexOf(currentTab);
      if (currentIndex === -1) return CYCLABLE_TABS[0];

      const newIndex = direction === 'next'
        ? (currentIndex + 1) % CYCLABLE_TABS.length
        : (currentIndex - 1 + CYCLABLE_TABS.length) % CYCLABLE_TABS.length;

      const nextTab = CYCLABLE_TABS[newIndex];

      // Subtle tactile vibration on supported mobile devices
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(12);
        } catch (e) {}
      }

      if (swipeHintTimeoutRef.current) clearTimeout(swipeHintTimeoutRef.current);
      setSwipeHint({
        direction: direction === 'next' ? 'left' : 'right',
        targetTabName: TAB_DISPLAY_NAMES[nextTab] || nextTab,
      });

      swipeHintTimeoutRef.current = setTimeout(() => {
        setSwipeHint(null);
      }, 1000);

      return nextTab;
    });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only track single-finger touch gestures
    if (e.touches.length !== 1) return;

    // Do not trigger swipe navigation when interacting with inputs, sliders, or code blocks
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('pre') ||
      target.closest('code') ||
      target.closest('.no-swipe')
    ) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    if (e.changedTouches.length !== 1) return;

    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    const duration = Date.now() - touchStartTimeRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Require min distance 45px, max duration 650ms, and clear horizontal dominance (absX > absY * 1.25)
    if (absX > 45 && duration < 650 && absX > absY * 1.25) {
      if (deltaX < 0) {
        // Swiped right-to-left: cycle forward
        cycleTab('next');
      } else {
        // Swiped left-to-right: cycle backward
        cycleTab('prev');
      }
    }
  }, [cycleTab]);

  useEffect(() => {
    return () => {
      if (swipeHintTimeoutRef.current) clearTimeout(swipeHintTimeoutRef.current);
    };
  }, []);

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

    // -------------------------------------------------------------
    // Advanced Multi-Layer Owner Identity & Security Verification
    // HEAR -> IDENTIFY -> VERIFY -> AUTHORIZE -> EXECUTE
    // -------------------------------------------------------------
    const identityEval = await ultronOwnerIdentityEngine.evaluateVoiceCommand({
      utteranceText: trimmed,
      isVoiceInput,
      simulatedSpeaker: 'ASIK',
    });

    if (identityEval.primarySignal === 'EMERGENCY_LOCK_COMMAND') {
      setState('STANDBY');
      setTranscription('');
      const text = 'Emergency Voice Lock engaged, ASIK. All active trust sessions revoked and assistant secured.';
      setMessages((prev) => [
        ...prev,
        {
          id: `lock_${Date.now()}`,
          role: 'assistant',
          content: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setAssistantSpokenText(text);
      return;
    }

    if (!identityEval.authorized) {
      console.warn(`[ULTRON Security Guard] Command execution blocked: ${identityEval.reason}`);
      setState('STANDBY');
      if (identityEval.requiresBiometrics || identityEval.assignedRiskLevel === 'LEVEL_3_STRONG') {
        setBiometricModal({
          isOpen: true,
          title: 'Strong Owner Authentication Required',
          description: identityEval.reason,
          onSuccess: () => {
            ultronTrustSession.escalateTrust('BIOMETRIC_ENCLAVE', 0.99);
            setBiometricModal((prev) => ({ ...prev, isOpen: false }));
            handleExecuteCommand(commandText, false);
          },
        });
      }
      return;
    }

    if (isVoiceInput) {
      voicePipelineDiagnostics.updateStage('AUDIO_STREAM', 'success', `Captured utterance: "${trimmed}"`);
      voicePipelineDiagnostics.updateStage('AI_RESPONSE', 'active', 'Dispatching query to ULTRON multimodal brain (Owner Authenticated)...');
      voicePipelineDiagnostics.updateStage('UI_STATE', 'active', 'UI state transitioned to THINKING');
    }

    // Contextual Reference Resolution ("do that again", "open the app we used")
    const resolvedResult = memoryService.resolveContextualReference(commandText);
    if (resolvedResult.resolvedPrompt && resolvedResult.resolvedPrompt !== commandText) {
      console.log(`[ULTRON Core] Context resolved reference: "${commandText}" -> "${resolvedResult.resolvedPrompt}"`);
      commandText = resolvedResult.resolvedPrompt;
    }

    // Direct Voice Directive: Owner Voice Lock & Security Center
    const lowerCmd = commandText.toLowerCase();
    if (
      lowerCmd.includes('security center') ||
      lowerCmd.includes('owner security') ||
      lowerCmd.includes('voice security') ||
      lowerCmd.includes('open security') ||
      lowerCmd.includes('voice lock') ||
      lowerCmd.includes('voice auth') ||
      lowerCmd.includes('enroll voice')
    ) {
      setActiveTab('security');
      const text = 'Opening ULTRON Owner Security Center, ASIK. Multi-layer voice identity and trust session parameters online.';
      setMessages((prev) => [
        ...prev,
        {
          id: `sec_${Date.now()}`,
          role: 'assistant',
          content: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setAssistantSpokenText(text);
      setState('SPEAKING');
      voiceService.speak(text);
      return;
    }

    // Direct Voice Directive: System Diagnostics Check
    if (lowerCmd.includes('run diagnostic') || lowerCmd.includes('system check') || lowerCmd.includes('check system health')) {
      const report = await diagnosticEngine.runSystemSelfCheck();
      setActiveTab('diagnostics');
      const passCount = report.checks.filter((c) => c.status === 'pass').length;
      const text = `System diagnostics completed. Status is ${report.healthy ? 'OPTIMAL' : 'ATTENTION REQUIRED'} with ${passCount} of ${report.checks.length} system checks passing. ${report.summary}`;
      setMessages((prev) => [
        ...prev,
        {
          id: `diag_${Date.now()}`,
          role: 'assistant',
          content: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setAssistantSpokenText(text);
      setState('SPEAKING');
      voiceService.speak(text);
      return;
    }

    // Direct Directive: Emergency Stop / Human Oversight (Section 19)
    if (lowerCmd.includes('stop ultron') || lowerCmd === 'stop' || lowerCmd === 'cancel task' || lowerCmd === 'ruk jao') {
      ultronAutonomousEngine.emergencyStop();
      const text = 'Emergency stop acknowledged, ASIK. Halting all autonomous operations immediately.';
      setMessages((prev) => [
        ...prev,
        {
          id: `stop_${Date.now()}`,
          role: 'assistant',
          content: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setAssistantSpokenText(text);
      setState('SPEAKING');
      voiceService.speak(text);
      return;
    }

    // Direct Directive: Single-Command Autonomous Execution Mode (Section 1, 2, 16)
    if (
      lowerCmd.includes('ek professional android app') ||
      lowerCmd.includes('modern portfolio website') ||
      lowerCmd.includes('is topic par research') ||
      lowerCmd.includes('khud kar lo') ||
      lowerCmd.includes('tum handle karo') ||
      lowerCmd.includes('pura kaam tum karo') ||
      lowerCmd.includes('end tak complete karo') ||
      lowerCmd.includes('mat puchhna') ||
      lowerCmd.includes('organize these files') ||
      lowerCmd.includes('mere project files organize') ||
      lowerCmd.includes('automate this task') ||
      lowerCmd.includes('prepare the apk')
    ) {
      setActiveTab('tasks');
      const plannedJob = ultronAutonomousEngine.planCommand(commandText);
      const text = `Autonomous execution engaged. Decomposed your goal into ${plannedJob.stages.length} sequential stages. Executing from start to finish without micromanagement.`;
      setMessages((prev) => [
        ...prev,
        {
          id: `auto_${Date.now()}`,
          role: 'assistant',
          content: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setAssistantSpokenText(text);
      setState('SPEAKING');
      voiceService.speak(text);
      ultronAutonomousEngine.executeJob().catch((e) => console.error('Autonomous job failed:', e));
      return;
    }

    // Direct Voice Directive: ULTRON Coder & Developer Mode
    if (
      lowerCmd.includes('open coder') || 
      lowerCmd.includes('developer mode') || 
      lowerCmd.includes('open dev mode') || 
      lowerCmd.includes('code workspace') ||
      lowerCmd.includes('build me an android') ||
      lowerCmd.includes('create an android') ||
      lowerCmd.includes('create a website') ||
      lowerCmd.includes('debug my code')
    ) {
      setActiveTab('coder');
      const text = `ULTRON Coder and Autonomous Developer Workspace engaged, ASIK. Initializing software architecture, project indexing, and compiler pipelines.`;
      setMessages((prev) => [
        ...prev,
        {
          id: `code_${Date.now()}`,
          role: 'assistant',
          content: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setAssistantSpokenText(text);
      setState('SPEAKING');
      voiceService.speak(text);
      return;
    }

    // Direct Voice Directive: Resume / Continue Task
    if (lowerCmd.includes('continue task') || lowerCmd.includes('resume task') || lowerCmd.includes('what task is running')) {
      const activeTask = taskContinuityEngine.getActiveTask();
      setActiveTab('tasks');
      if (activeTask) {
        taskContinuityEngine.resumeTask();
        const text = `Resuming task: "${activeTask.title}". Current step ${activeTask.currentStepIndex + 1} of ${activeTask.steps.length}: ${activeTask.steps[activeTask.currentStepIndex]?.title || 'Finalizing'}.`;
        setMessages((prev) => [
          ...prev,
          {
            id: `task_${Date.now()}`,
            role: 'assistant',
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setAssistantSpokenText(text);
        setState('SPEAKING');
        voiceService.speak(text);
      } else {
        const text = "No interrupted or background tasks are currently in the queue. All systems are nominal.";
        setMessages((prev) => [
          ...prev,
          {
            id: `task_${Date.now()}`,
            role: 'assistant',
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setAssistantSpokenText(text);
        setState('SPEAKING');
        voiceService.speak(text);
      }
      return;
    }

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

      // Record short-term contextual memory for natural reference resolution ("do that again", "open that app")
      memoryService.recordContext({
        userIntent: commandText,
        lastToolExecuted: toolCalls[0]?.name,
        targetApp: toolCalls.find((t) => t.name === 'openApp')?.args.appName,
        targetFile: toolCalls.find((t) => t.name === 'fileOperation')?.args.fileName,
        targetContact: toolCalls.find((t) => t.name === 'makePhoneCall')?.args.contactName,
        entities: {
          toolsUsed: toolCalls.map((t) => t.name),
          lastSpokenSummary: assistantText.slice(0, 100),
        },
      });

      // 6. Voice Synthesis - Speak the Response Aloud!
      // This is the critical voice-to-AI link requested by user!
      voicePipelineDiagnostics.updateStage('AI_RESPONSE', 'success', `Response ready: "${assistantText.slice(0, 45)}..."`);
      voicePipelineDiagnostics.updateStage('RESPONSE_AUDIO', 'active', 'Synthesizing voice audio stream via speech engine...');
      voicePipelineDiagnostics.updateStage('UI_STATE', 'active', 'UI state transitioned to SPEAKING');
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
          voiceService.startListening(preferencesRef.current.wakeWord, true);
          setIsListening(true);
          setState('LISTENING');
        } else {
          setIsListening(false);
          setState('STANDBY');
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
        setIsListening(false);
        setState('STANDBY');
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
        if (started) {
          setIsListening(true);
        } else {
          console.warn('[ULTRON Core] Live session could not start. Standing by.');
          setIsListening(false);
          setState('STANDBY');
        }
      } else {
        voiceService.startListening(preferences.wakeWord, true);
        setIsListening(true);
      }
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
        onOpenVoiceLock={() => setVoiceLockModalOpen(true)}
      />

      {/* Main Content Area based on Tab with Touch Gesture Support */}
      <main 
        className="flex-1 flex flex-col overflow-hidden relative z-10 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Futuristic HUD Swipe Hint Indicator */}
        {swipeHint && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 text-xs font-mono-code shadow-[0_0_18px_rgba(6,182,212,0.35)] backdrop-blur-md">
              <span className="text-cyan-400 font-bold">{swipeHint.direction === 'left' ? '←' : '→'}</span>
              <span className="font-semibold tracking-wider uppercase text-[11px]">{swipeHint.targetTabName}</span>
              <span className="text-cyan-400 font-bold">{swipeHint.direction === 'left' ? '←' : '→'}</span>
            </div>
          </div>
        )}

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
            onOpenVoiceLock={() => setVoiceLockModalOpen(true)}
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

        {activeTab === 'tasks' && (
          <TaskContinuityView
            onExecuteTool={async (toolName, args) => {
              const res = await toolRegistry.executeTool(
                { id: `task_${Date.now()}`, name: toolName, args },
                {
                  onOpenAppModal: (appName, param) => setAppWindowModal({ isOpen: true, appName, actionParam: param }),
                  onOpenSettingsModal: (section) => setAppWindowModal({ isOpen: true, appName: `Settings: ${section}` }),
                }
              );
              return res;
            }}
          />
        )}

        {activeTab === 'multimodal' && (
          <MultimodalView />
        )}

        {activeTab === 'research' && (
          <ResearchAgentView />
        )}

        {activeTab === 'coder' && (
          <CoderWorkspaceView onExecuteCommand={(cmd) => handleExecuteCommand(cmd, false)} />
        )}

        {activeTab === 'diagnostics' && (
          <DiagnosticsView />
        )}

        {activeTab === 'security' && (
          <OwnerSecurityCenterView />
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

      {/* 6. Owner Voice Authentication & Voice Lock Modal */}
      <VoiceLockModal
        isOpen={voiceLockModalOpen}
        onClose={() => setVoiceLockModalOpen(false)}
      />
    </div>
  );
}
