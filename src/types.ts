export type LiveVoiceState = 
  | 'IDLE' 
  | 'LISTENING' 
  | 'USER_SPEAKING' 
  | 'PROCESSING' 
  | 'AI_SPEAKING' 
  | 'INTERRUPTED' 
  | 'RECONNECTING' 
  | 'ERROR' 
  | 'STOPPED';

export type UltronState = 
  | 'STANDBY' 
  | 'LISTENING' 
  | 'USER_SPEAKING'
  | 'UNDERSTANDING'
  | 'THINKING' 
  | 'PROCESSING'
  | 'SEARCHING' 
  | 'EXECUTING' 
  | 'SPEAKING' 
  | 'AI_SPEAKING'
  | 'INTERRUPTED'
  | 'RECONNECTING'
  | 'ERROR'
  | 'IDLE'
  | 'STOPPED';

export type VoiceEngineType = 'live_audio' | 'fallback_stt_tts';

export type VoiceMode = 'wake' | 'wakeword' | 'continuous' | 'push_to_talk';

export type ViewTab = 
  | 'orb_hud' 
  | 'chat' 
  | 'tasks' 
  | 'multimodal' 
  | 'research' 
  | 'automation' 
  | 'tools' 
  | 'coder'
  | 'diagnostics' 
  | 'settings';

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
  reversible?: boolean;
  undoData?: any;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
  verified?: boolean;
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
  taskId?: string;
  timeline?: string[];
  multimodalThumbnail?: string;
}

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  updatedAt: string;
  category?: 'document' | 'report' | 'code' | 'log' | 'data';
}

export interface StoredNotification {
  id: string;
  appName: string;
  title: string;
  body: string;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  category?: string;
}

// -------------------------------------------------------------
// Task Continuity & Autonomous Planning Types
// -------------------------------------------------------------
export type TaskExecutionStatus = 
  | 'pending' 
  | 'running' 
  | 'verifying' 
  | 'completed' 
  | 'failed' 
  | 'recovering' 
  | 'skipped';

export interface TaskPlanStep {
  id: string;
  title: string;
  description: string;
  toolName: string;
  args: Record<string, any>;
  status: TaskExecutionStatus;
  result?: string;
  reversible?: boolean;
  undoPayload?: any;
}

export interface TaskCheckpoint {
  id: string;
  taskId: string;
  stepIndex: number;
  stepTitle: string;
  timestamp: string;
  snapshotState: Record<string, any>;
}

export interface ActiveTask {
  id: string;
  title: string;
  goal: string;
  status: 'planning' | 'running' | 'paused' | 'completed' | 'failed' | 'recovering';
  steps: TaskPlanStep[];
  currentStepIndex: number;
  checkpoints: TaskCheckpoint[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  summary?: string;
}

export interface ActionHistoryRecord {
  id: string;
  timestamp: string;
  actionName: string;
  description: string;
  target?: string;
  canUndo: boolean;
  undone: boolean;
  undoData?: any;
}

// -------------------------------------------------------------
// Multimodal Perception Layer Types
// -------------------------------------------------------------
export type MultimodalInputType = 
  | 'voice' 
  | 'text' 
  | 'screen' 
  | 'image' 
  | 'camera' 
  | 'file' 
  | 'notification' 
  | 'web';

export interface MultimodalInput {
  id: string;
  type: MultimodalInputType;
  timestamp: string;
  text?: string;
  mediaBase64?: string;
  mimeType?: string;
  screenElements?: ScreenElement[];
  metadata?: Record<string, any>;
}

export interface ScreenElement {
  id: string;
  label: string;
  type: 'button' | 'input' | 'text' | 'image' | 'link' | 'card' | 'toggle' | 'list';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  action?: string;
  clickable?: boolean;
  contentDescription?: string;
}

// -------------------------------------------------------------
// Device Capability Graph & Platform Integrity
// -------------------------------------------------------------
export type CapabilityStatus = 
  | 'IMPLEMENTED' 
  | 'PARTIALLY IMPLEMENTED' 
  | 'REQUIRES USER PERMISSION' 
  | 'REQUIRES EXTERNAL API' 
  | 'ANDROID PLATFORM LIMITED' 
  | 'NOT AVAILABLE';

export interface CapabilityItem {
  id: string;
  name: string;
  category: 'perception' | 'voice' | 'automation' | 'tools' | 'security' | 'intelligence';
  status: CapabilityStatus;
  description: string;
  platformNote: string;
}

// -------------------------------------------------------------
// Self-Diagnostic & System Health Types
// -------------------------------------------------------------
export type VoicePipelineStageId = 
  | 'MIC_PERMISSION'
  | 'AUDIO_INPUT'
  | 'AUDIO_CAPTURE'
  | 'VAD'
  | 'LIVE_SESSION'
  | 'AUDIO_STREAM'
  | 'AI_RESPONSE'
  | 'RESPONSE_AUDIO'
  | 'AUDIO_OUTPUT'
  | 'UI_STATE';

export type VoicePipelineStageStatus = 'idle' | 'pending' | 'active' | 'success' | 'warning' | 'error';

export interface VoicePipelineStageState {
  id: VoicePipelineStageId;
  name: string;
  stepNumber: number;
  status: VoicePipelineStageStatus;
  message: string;
  latencyMs?: number;
  lastUpdated: string;
  details?: Record<string, any>;
}

export interface DiagnosticCheck {
  id: string;
  name: string;
  category: 'voice' | 'ai' | 'network' | 'permissions' | 'tools' | 'storage' | 'notifications' | 'accessibility';
  status: 'pass' | 'warn' | 'fail' | 'testing';
  latencyMs?: number;
  message: string;
  recommendation?: string;
}

export type LogCategory = 
  | 'ULTRON_AUDIO' 
  | 'ULTRON_AI' 
  | 'ULTRON_TOOL' 
  | 'ULTRON_PERMISSION' 
  | 'ULTRON_AUTOMATION' 
  | 'ULTRON_MEMORY' 
  | 'ULTRON_NETWORK' 
  | 'ULTRON_ERROR';

export interface AuditLog {
  id: string;
  timestamp: string;
  category: LogCategory;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: Record<string, any>;
}

// -------------------------------------------------------------
// Workflows & Automation
// -------------------------------------------------------------
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
  category?: 'productivity' | 'system' | 'morning' | 'focus' | 'custom';
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

// -------------------------------------------------------------
// User Preferences & Personalization
// -------------------------------------------------------------
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
  audioToAudioEnabled?: boolean;
  vadSensitivity?: number; // 1 to 5 (default 3)
  voiceEngine?: VoiceEngineType;
  continuousVoiceTimeoutSeconds?: number;
  
  // Conversational & Emotional Adaptation
  conversationalStyle?: 'balanced' | 'concise' | 'detailed' | 'fast' | 'technical';
  formality?: 'formal' | 'natural_jarvis' | 'casual';
  
  // Privacy & Proactive Assistance
  proactiveAssistance: boolean;
  backgroundAnalysis: boolean;
  notificationIntelligence: boolean;
  screenAwareness: boolean;
  cameraVisionEnabled: boolean;
  autoSaveCheckpoints: boolean;
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

// -------------------------------------------------------------
// ULTRON CODER & Autonomous Software Engineering System Types
// -------------------------------------------------------------
export type CodeLanguage = 
  | 'kotlin' 
  | 'java' 
  | 'python' 
  | 'javascript' 
  | 'typescript' 
  | 'html' 
  | 'css' 
  | 'sql' 
  | 'json' 
  | 'xml' 
  | 'bash' 
  | 'powershell' 
  | 'cpp' 
  | 'rust' 
  | 'go' 
  | 'swift' 
  | 'dart';

export type ProjectFramework = 
  | 'android_compose' 
  | 'react_vite' 
  | 'nextjs' 
  | 'flutter' 
  | 'node_express' 
  | 'python_fastapi' 
  | 'automation_script';

export interface ProjectFile {
  path: string;
  name: string;
  content: string;
  language: CodeLanguage;
  isModified?: boolean;
  readOnly?: boolean;
}

export type FeatureStatusType = 
  | 'IMPLEMENTED' 
  | 'PARTIALLY_IMPLEMENTED' 
  | 'PLANNED' 
  | 'BLOCKED_BY_PLATFORM' 
  | 'REQUIRES_USER_PERMISSION' 
  | 'REQUIRES_EXTERNAL_SERVICE';

export interface ProjectFeature {
  id: string;
  name: string;
  description: string;
  status: FeatureStatusType;
  notes?: string;
}

export interface QualityGateStatus {
  build: boolean;
  tests: boolean;
  errors: boolean;
  security: boolean;
  performance: boolean;
  ui: boolean;
  documentation: boolean;
  configuration: boolean;
  dependencies: boolean;
  knownLimitations: string[];
}

export interface DebugDiagnosticItem {
  id: string;
  type: 'compile' | 'runtime' | 'ui' | 'network' | 'gradle' | 'dependency' | 'audio' | 'memory' | 'permission';
  severity: 'info' | 'warn' | 'error';
  file?: string;
  line?: number;
  message: string;
  suggestedFix?: string;
  verified?: boolean;
  applied?: boolean;
}

export interface CodeReviewFinding {
  id: string;
  category: 'bug' | 'security' | 'performance' | 'architecture' | 'duplication' | 'accessibility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  file?: string;
  line?: number;
  message: string;
  recommendation: string;
  suggestedPatch?: string;
}

export interface ProjectStructure {
  id: string;
  name: string;
  type: ProjectFramework;
  description: string;
  files: ProjectFile[];
  currentFilePath: string;
  createdAt: string;
  lastBuilt?: string;
  buildStatus?: 'idle' | 'building' | 'passed' | 'failed';
  testStatus?: 'idle' | 'running' | 'passed' | 'failed';
  features: ProjectFeature[];
  qualityGate: QualityGateStatus;
  gitBranch: string;
  commitHistory: Array<{
    hash: string;
    message: string;
    timestamp: string;
    author: string;
  }>;
}

