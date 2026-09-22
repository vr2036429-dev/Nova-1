export type UltronState = 
  | 'STANDBY' 
  | 'LISTENING' 
  | 'THINKING' 
  | 'SEARCHING' 
  | 'EXECUTING' 
  | 'SPEAKING' 
  | 'ERROR';

export type VoiceMode = 'wake' | 'wakeword' | 'continuous' | 'push_to_talk';

export type ViewTab = 'orb_hud' | 'chat' | 'automation' | 'tools' | 'settings';

export type ConfirmationLevel = 1 | 2 | 3; // 1 = Safe (auto), 2 = Sensitive (confirm), 3 = Restricted (biometric)

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  message: string;
  data?: any;
  timestamp: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  sources?: ResearchSource[];
  isVoiceInput?: boolean;
  intent?: string;
}

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  updatedAt: string;
}

export interface StoredNotification {
  id: string;
  appName: string;
  title: string;
  body: string;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
}

export interface WorkflowStep {
  id: string;
  action: string;
  description: string;
  toolName: string;
  args: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  triggerPhrase: string;
  steps: WorkflowStep[];
  enabled: boolean;
}

export interface DeviceStatus {
  batteryLevel: number;
  isCharging: boolean;
  networkOnline?: boolean;
  networkConnected?: boolean;
  torchOn: boolean;
  wakeLocked?: boolean;
  screenAwake?: boolean;
  volumeLevel?: number;
  locationEnabled?: boolean;
}

export interface UserPreferences {
  userName: string;
  wakeWord: string;
  voiceMode: VoiceMode;
  ttsVoiceName: string;
  ttsPitch: number;
  ttsRate: number;
  autoExecuteSafeTools: boolean;
  requireBiometricsForRestricted: boolean;
  biometricEnrolled: boolean;
  offlineVoiceEnabled: boolean;
  themeHue: 'cyan' | 'arc' | 'amber' | 'crimson';
}

export interface ConfirmationRequest {
  id: string;
  title: string;
  description: string;
  level: ConfirmationLevel;
  toolName?: string;
  toolCall?: ToolCall;
  params: Record<string, any>;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ScreenElement {
  id: string;
  label: string;
  type: 'button' | 'input' | 'text' | 'image' | 'link' | 'card';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  action?: string;
}
