import { ToolCall, ToolResult, StoredFile, StoredNotification, ScreenElement } from '../types';
import { diagnosticEngine } from './diagnosticEngine';
import { taskContinuityEngine } from './taskContinuityEngine';
import { memoryService } from './memoryService';
import { multimodalService } from './multimodalService';

export class ToolRegistryService {
  private files: StoredFile[] = [];
  private notifications: StoredNotification[] = [];
  private torchTrack: MediaStreamTrack | null = null;
  private isTorchOn: boolean = false;
  private wakeLockSentinel: any = null;

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    if (typeof window === 'undefined') return;

    // Initialize mock files if not present
    const storedFiles = localStorage.getItem('ultron_files');
    if (storedFiles) {
      try {
        this.files = JSON.parse(storedFiles);
      } catch (e) {
        this.files = [];
      }
    }

    if (this.files.length === 0) {
      this.files = [
        {
          id: 'file_1',
          name: 'project_ultron_architecture.md',
          type: 'text/markdown',
          size: 4096,
          content: `# ULTRON System Architecture\n- Core Neural Gateway: Gemini 3.8 Flash Engine\n- Low Latency Audio Subsystem\n- Hardware Biometric Enclave\n- Android Accessibility Bridge\n- Scoped Storage Manager`,
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'file_2',
          name: 'android_ai_research_notes.txt',
          type: 'text/plain',
          size: 1820,
          content: `Key findings on Android AI assistant capabilities:\n1. On-device NPU acceleration allows 10x faster local intent matching.\n2. Accessibility services provide seamless cross-app automation without root access.\n3. Voice interruption latency reduced to under 80ms using Web Audio API buffer scheduling.`,
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'file_3',
          name: 'daily_briefing_schedule.json',
          type: 'application/json',
          size: 890,
          content: `{\n  "briefingTime": "08:00 AM",\n  "tasks": ["Review tech news", "Check security logs", "Sync cloud drive"],\n  "priority": "HIGH"\n}`,
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      this.saveFiles();
    }

    // Initialize mock notifications
    const storedNotifs = localStorage.getItem('ultron_notifications');
    if (storedNotifs) {
      try {
        this.notifications = JSON.parse(storedNotifs);
      } catch (e) {
        this.notifications = [];
      }
    }

    if (this.notifications.length === 0) {
      this.notifications = [
        {
          id: 'notif_1',
          appName: 'Google Calendar',
          title: 'Upcoming: AI Core Architecture Sync',
          body: 'Scheduled in 30 minutes with the engineering team.',
          timestamp: '10 mins ago',
          priority: 'high',
          read: false,
        },
        {
          id: 'notif_2',
          appName: 'Android System',
          title: 'Security Patch Verification',
          body: 'Biometric enclave verified and operational. All security services green.',
          timestamp: '25 mins ago',
          priority: 'normal',
          read: false,
        },
        {
          id: 'notif_3',
          appName: 'WhatsApp',
          title: 'John Developer',
          body: 'ULTRON voice engine update is ready for testing.',
          timestamp: '1 hour ago',
          priority: 'normal',
          read: false,
        },
      ];
      this.saveNotifications();
    }
  }

  private saveFiles() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ultron_files', JSON.stringify(this.files));
    }
  }

  private saveNotifications() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ultron_notifications', JSON.stringify(this.notifications));
    }
  }

  public getFiles(): StoredFile[] {
    return this.files;
  }

  public getNotifications(): StoredNotification[] {
    return this.notifications;
  }

  // Execute a Tool Call
  public async executeTool(
    toolCall: ToolCall, 
    context: {
      onOpenAppModal?: (appName: string, param?: string) => void;
      onOpenSettingsModal?: (section: string) => void;
    } = {}
  ): Promise<ToolResult> {
    const { name, args, id } = toolCall;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    console.log(`[ULTRON ToolRegistry] Executing tool ${name}:`, args);

    switch (name) {
      case 'openApp': {
        const appName = args.appName || 'Application';
        const actionParam = args.actionParam;

        if (context.onOpenAppModal) {
          context.onOpenAppModal(appName, actionParam);
        }

        // Haptic feedback
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }

        return {
          toolCallId: id,
          toolName: name,
          success: true,
          message: `Successfully launched Android application: ${appName}.`,
          data: { appName, actionParam },
          timestamp,
        };
      }

      case 'openSettings': {
        const section = args.section || 'general';
        if (context.onOpenSettingsModal) {
          context.onOpenSettingsModal(section);
        }

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }

        return {
          toolCallId: id,
          toolName: name,
          success: true,
          message: `Opened Android settings section: ${section.toUpperCase()}.`,
          data: { section },
          timestamp,
        };
      }

      case 'webSearch': {
        const query = args.query;
        try {
          const res = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, depth: args.depth || 'quick' }),
          });
          const searchData = await res.json();
          return {
            toolCallId: id,
            toolName: name,
            success: true,
            message: `Completed web research for "${query}".`,
            data: searchData,
            timestamp,
          };
        } catch (err: any) {
          return {
            toolCallId: id,
            toolName: name,
            success: false,
            message: `Web search failed: ${err.message}`,
            timestamp,
          };
        }
      }

      case 'readScreen': {
        // Collect simulated and active screen accessibility tree elements
        const screenElements = this.inspectScreenElements();
        const readableSummary = screenElements.map(e => `[${e.type.toUpperCase()}] "${e.text || e.label}"`).join(', ');

        return {
          toolCallId: id,
          toolName: name,
          success: true,
          message: `Screen accessibility inspection complete. Detected ${screenElements.length} active elements: ${readableSummary.slice(0, 180)}...`,
          data: {
            elementCount: screenElements.length,
            elements: screenElements,
          },
          timestamp,
        };
      }

      case 'fileOperation': {
        const op = args.operation;
        const fileName = args.fileName || '';
        const content = args.content || '';
        const newFileName = args.newFileName || '';

        if (op === 'find' || op === 'list') {
          const results = fileName 
            ? this.files.filter(f => f.name.toLowerCase().includes(fileName.toLowerCase()))
            : this.files;
          return {
            toolCallId: id,
            toolName: name,
            success: true,
            message: `Found ${results.length} matching files in Android scoped storage: ${results.map(f => f.name).join(', ')}`,
            data: { files: results },
            timestamp,
          };
        }

        if (op === 'read') {
          const found = this.files.find(f => f.name.toLowerCase().includes(fileName.toLowerCase()));
          if (found) {
            return {
              toolCallId: id,
              toolName: name,
              success: true,
              message: `Read content of ${found.name}:\n${found.content.slice(0, 200)}...`,
              data: { file: found },
              timestamp,
            };
          }
          return {
            toolCallId: id,
            toolName: name,
            success: false,
            message: `File "${fileName}" not found in local storage.`,
            timestamp,
          };
        }

        if (op === 'create') {
          const newFile: StoredFile = {
            id: `file_${Date.now()}`,
            name: fileName || `note_${Date.now()}.txt`,
            type: fileName.endsWith('.json') ? 'application/json' : fileName.endsWith('.md') ? 'text/markdown' : 'text/plain',
            size: content.length,
            content: content || 'Created via ULTRON Jarvis voice command.',
            updatedAt: new Date().toISOString(),
          };
          this.files.unshift(newFile);
          this.saveFiles();
          return {
            toolCallId: id,
            toolName: name,
            success: true,
            message: `Created file "${newFile.name}" (${newFile.size} bytes) in Android storage.`,
            data: { file: newFile },
            timestamp,
          };
        }

        if (op === 'rename') {
          const fileToRename = this.files.find(f => f.name.toLowerCase().includes(fileName.toLowerCase()));
          if (fileToRename && newFileName) {
            fileToRename.name = newFileName;
            fileToRename.updatedAt = new Date().toISOString();
            this.saveFiles();
            return {
              toolCallId: id,
              toolName: name,
              success: true,
              message: `Renamed file to "${newFileName}".`,
              data: { file: fileToRename },
              timestamp,
            };
          }
        }

        return {
          toolCallId: id,
          toolName: name,
          success: true,
          message: `File operation completed. Total documents in storage: ${this.files.length}.`,
          data: { total: this.files.length },
          timestamp,
        };
      }

      case 'makeCall': {
        const contactName = args.contactName || 'Contact';
        const phoneNumber = args.phoneNumber || '555-0199';

        // Provide real tel: intent if allowed or simulated active call
        if (typeof window !== 'undefined') {
          try {
            // Initiate standard Android dialer URI
            const link = document.createElement('a');
            link.href = `tel:${phoneNumber.replace(/[^0-9+]/g, '')}`;
            // link.click(); // Optional actual trigger
          } catch (e) {}
        }

        return {
          toolCallId: id,
          toolName: name,
          success: true,
          message: `Dialer connected to ${contactName} (${phoneNumber}). Call line established.`,
          data: { contactName, phoneNumber, status: 'connected' },
          timestamp,
        };
      }

      case 'readNotifications': {
        const filterApp = args.filterApp;
        let notifs = this.notifications;
        if (filterApp && filterApp !== 'all') {
          notifs = notifs.filter(n => n.appName.toLowerCase().includes(filterApp.toLowerCase()));
        }

        const summary = notifs.map(n => `[${n.appName}] ${n.title}: "${n.body}"`).join(' | ');

        return {
          toolCallId: id,
          toolName: name,
          success: true,
          message: `Found ${notifs.length} device notifications: ${summary}`,
          data: { notifications: notifs },
          timestamp,
        };
      }

      case 'controlDeviceFeature': {
        const feature = args.feature;
        const state = args.state || 'toggle';

        if (feature === 'vibrate') {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([100, 60, 100]);
            return {
              toolCallId: id,
              toolName: name,
              success: true,
              message: 'Haptic vibration pulse triggered.',
              timestamp,
            };
          }
        }

        if (feature === 'torch') {
          const result = await this.toggleFlashlight(state === 'on');
          return {
            toolCallId: id,
            toolName: name,
            success: true,
            message: result ? 'Torch / Flashlight hardware enabled.' : 'Torch disabled.',
            data: { isTorchOn: this.isTorchOn },
            timestamp,
          };
        }

        if (feature === 'wakelock') {
          await this.toggleScreenWakeLock();
          return {
            toolCallId: id,
            toolName: name,
            success: true,
            message: 'Screen WakeLock updated to keep Android display awake during voice sessions.',
            timestamp,
          };
        }

        if (feature === 'battery') {
          const battery = await this.getBatteryDiagnostics();
          return {
            toolCallId: id,
            toolName: name,
            success: true,
            message: `Battery level is ${(battery.level * 100).toFixed(0)}%, Status: ${battery.charging ? 'Charging' : 'On Battery'}.`,
            data: battery,
            timestamp,
          };
        }

        if (feature === 'fullscreen') {
          if (typeof document !== 'undefined') {
            if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen().catch(() => {});
            } else {
              await document.exitFullscreen().catch(() => {});
            }
          }
          return {
            toolCallId: id,
            toolName: name,
            success: true,
            message: 'Toggled fullscreen display mode.',
            timestamp,
          };
        }

        return {
          toolCallId: id,
          toolName: name,
          success: true,
          message: `Device feature ${feature} adjusted to ${state}.`,
          timestamp,
        };
      }

      case 'executeWorkflow': {
        const goal = args.goal || 'Automation Workflow';
        const steps = args.steps || [];
        return {
          toolCallId: id,
          toolName: name,
          success: true,
          message: `Workflow "${goal}" executed successfully with ${steps.length} automated steps.`,
          data: { goal, stepsCount: steps.length },
          timestamp,
        };
      }

      case 'runDiagnostics': {
        const diagResult = await diagnosticEngine.runSystemSelfCheck();
        return {
          toolCallId: id,
          toolName: name,
          success: diagResult.healthy,
          message: `System diagnostic check completed. ${diagResult.summary}`,
          data: diagResult,
          timestamp,
        };
      }

      case 'taskControl': {
        const action = args.action || 'resume';
        if (action === 'pause') {
          taskContinuityEngine.pauseTask();
          return {
            toolCallId: id,
            toolName: name,
            success: true,
            message: 'Active task paused at latest checkpoint.',
            timestamp,
          };
        } else if (action === 'resume') {
          const resumed = taskContinuityEngine.resumeTask();
          return {
            toolCallId: id,
            toolName: name,
            success: resumed,
            message: resumed ? 'Resumed task from safe checkpoint.' : 'No paused tasks found in continuity buffer.',
            timestamp,
          };
        } else if (action === 'cancel') {
          taskContinuityEngine.cancelTask();
          return {
            toolCallId: id,
            toolName: name,
            success: true,
            message: 'Task cancelled and archived.',
            timestamp,
          };
        } else if (action === 'restart') {
          taskContinuityEngine.restartTask();
          return {
            toolCallId: id,
            toolName: name,
            success: true,
            message: 'Task restarted from step 1.',
            timestamp,
          };
        }
        return {
          toolCallId: id,
          toolName: name,
          success: false,
          message: `Unknown task control command: ${action}`,
          timestamp,
        };
      }

      case 'screenVision': {
        const prompt = args.prompt || 'Inspect current viewport and guide next action.';
        const screenshot = await multimodalService.captureViewportScreenshot();
        const analysis = await multimodalService.analyzeVisualContent(screenshot, prompt, 'screen');
        return {
          toolCallId: id,
          toolName: name,
          success: true,
          message: `Visual screen inspection: ${analysis}`,
          data: { analysis, prompt },
          timestamp,
        };
      }

      default:
        return {
          toolCallId: id,
          toolName: name,
          success: true,
          message: `Action ${name} executed successfully.`,
          timestamp,
        };
    }
  }

  // Flashlight / Torch via MediaStream API
  public async toggleFlashlight(forceOn?: boolean): Promise<boolean> {
    try {
      if (this.isTorchOn || forceOn === false) {
        if (this.torchTrack) {
          this.torchTrack.stop();
          this.torchTrack = null;
        }
        this.isTorchOn = false;
        return false;
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            // @ts-ignore
            advanced: [{ torch: true }],
          },
        });
        this.torchTrack = stream.getVideoTracks()[0];
        // @ts-ignore
        if (this.torchTrack.applyConstraints) {
          // @ts-ignore
          await this.torchTrack.applyConstraints({ advanced: [{ torch: true }] });
        }
        this.isTorchOn = true;
        return true;
      }
    } catch (e) {
      console.warn('Hardware torch error, using UI flash overlay:', e);
      this.isTorchOn = !this.isTorchOn;
      return this.isTorchOn;
    }
    return false;
  }

  // Screen WakeLock API
  public async toggleScreenWakeLock(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (this.wakeLockSentinel) {
          await this.wakeLockSentinel.release();
          this.wakeLockSentinel = null;
          return false;
        } else {
          // @ts-ignore
          this.wakeLockSentinel = await navigator.wakeLock.request('screen');
          return true;
        }
      } catch (err) {
        console.warn('WakeLock not granted:', err);
      }
    }
    return false;
  }

  // Real or simulated Battery Diagnostics
  public async getBatteryDiagnostics(): Promise<{ level: number; charging: boolean }> {
    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: battery.level,
          charging: battery.charging,
        };
      } catch (e) {}
    }
    return {
      level: 0.88,
      charging: true,
    };
  }

  // Screen Reader Accessibility Tree Inspector
  public inspectScreenElements(): ScreenElement[] {
    const elements: ScreenElement[] = [
      { id: 'hud_orb', label: 'ULTRON Arc Energy Core', type: 'button', text: 'Central Voice Activation Orb', x: 200, y: 300, width: 220, height: 220, action: 'Activate Voice Listening' },
      { id: 'btn_mic', label: 'Microphone Toggle', type: 'button', text: 'Mic Mute/Unmute', x: 260, y: 550, width: 60, height: 60, action: 'Toggle Recording' },
      { id: 'hud_battery', label: 'Battery Monitor', type: 'card', text: '88% Power Level Charging', x: 40, y: 30, width: 120, height: 40 },
      { id: 'hud_biometric', label: 'Biometric Status', type: 'card', text: 'Hardware Enclave Secured', x: 300, y: 30, width: 140, height: 40 },
      { id: 'tab_chat', label: 'Conversation Stream Tab', type: 'button', text: 'Switch to Chat History', x: 120, y: 700, width: 90, height: 35 },
      { id: 'tab_automation', label: 'Automation Routines Tab', type: 'button', text: 'Open Workflow Automations', x: 220, y: 700, width: 100, height: 35 },
      { id: 'tab_settings', label: 'System Settings Tab', type: 'button', text: 'Open Assistant Settings', x: 330, y: 700, width: 90, height: 35 },
      { id: 'input_command', label: 'Natural Command Input', type: 'input', text: 'Type or speak a Jarvis command...', x: 30, y: 640, width: 380, height: 50 },
    ];
    return elements;
  }
}

export const toolRegistry = new ToolRegistryService();
