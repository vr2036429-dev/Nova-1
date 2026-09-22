import { AutomationWorkflow, WorkflowStep, ToolCall, ToolResult } from '../types';
import { toolRegistry } from './toolRegistry';
import { biometricService } from './biometricService';

export class AutomationEngine {
  private workflows: AutomationWorkflow[] = [];

  constructor() {
    this.initDefaultWorkflows();
  }

  private initDefaultWorkflows() {
    this.workflows = [
      {
        id: 'wf_tech_research',
        name: 'Morning Tech Briefing & Summary',
        description: 'Searches today\'s technology breakthroughs, extracts key insights, and saves notes to local storage.',
        triggerPhrase: 'research tech news and save summary',
        enabled: true,
        steps: [
          {
            id: 'step_1',
            action: 'Web Research',
            description: 'Search latest AI agent breakthroughs',
            toolName: 'webSearch',
            args: { query: 'Latest Android AI assistant breakthroughs 2026' },
            status: 'pending',
          },
          {
            id: 'step_2',
            action: 'Document Creation',
            description: 'Create summary text note in local storage',
            toolName: 'fileOperation',
            args: { operation: 'create', fileName: 'tech_news_briefing.txt', content: 'Summary of latest Android AI breakthroughs retrieved by ULTRON.' },
            status: 'pending',
          },
          {
            id: 'step_3',
            action: 'Notification Ping',
            description: 'Check calendar & alerts for today',
            toolName: 'readNotifications',
            args: { filterApp: 'all' },
            status: 'pending',
          },
        ],
      },
      {
        id: 'wf_system_diagnostics',
        name: 'Full Hardware & Security Health Check',
        description: 'Runs battery power check, tests haptic engines, verifies biometric enclave, and inspects screen status.',
        triggerPhrase: 'run system diagnostics',
        enabled: true,
        steps: [
          {
            id: 's_diag_1',
            action: 'Power Diagnostic',
            description: 'Inspect battery capacity and charging flow',
            toolName: 'controlDeviceFeature',
            args: { feature: 'battery', state: 'check' },
            status: 'pending',
          },
          {
            id: 's_diag_2',
            action: 'Haptic Actuator Test',
            description: 'Pulse device vibration motor',
            toolName: 'controlDeviceFeature',
            args: { feature: 'vibrate', state: 'on' },
            status: 'pending',
          },
          {
            id: 's_diag_3',
            action: 'Display Inspector',
            description: 'Analyze accessibility layer and active screen',
            toolName: 'readScreen',
            args: { targetElement: 'all' },
            status: 'pending',
          },
        ],
      },
      {
        id: 'wf_focus_mode',
        name: 'Engage Jarvis Deep Focus Mode',
        description: 'Locks screen awake, mutes distractions, and launches Spotify study ambient playlist.',
        triggerPhrase: 'engage focus mode',
        enabled: true,
        steps: [
          {
            id: 's_focus_1',
            action: 'Display WakeLock',
            description: 'Prevent screen timeout during deep focus',
            toolName: 'controlDeviceFeature',
            args: { feature: 'wakelock', state: 'on' },
            status: 'pending',
          },
          {
            id: 's_focus_2',
            action: 'Music Companion',
            description: 'Open Spotify audio streamer',
            toolName: 'openApp',
            args: { appName: 'Spotify', actionParam: 'deep focus ambient' },
            status: 'pending',
          },
        ],
      },
    ];
  }

  public getWorkflows(): AutomationWorkflow[] {
    return this.workflows;
  }

  // Parse multi-step prompt into workflow steps
  public parseMultiStepIntent(prompt: string): WorkflowStep[] | null {
    const p = prompt.toLowerCase();
    
    // Check if it's a multi-step sentence with "and", "then", or commas
    if (p.includes(' and ') || p.includes(' then ') || (p.includes(',') && (p.includes('open') || p.includes('search') || p.includes('save')))) {
      const steps: WorkflowStep[] = [];
      let stepIndex = 1;

      if (p.includes('chrome') || p.includes('browser')) {
        steps.push({
          id: `step_${stepIndex++}`,
          action: 'Launch Browser',
          description: 'Open Google Chrome application',
          toolName: 'openApp',
          args: { appName: 'Chrome' },
          status: 'pending',
        });
      }

      if (p.includes('search') || p.includes('research') || p.includes('look up')) {
        const queryMatch = p.match(/(?:search|research|look up)\s+(?:for\s+)?([^,]+?)(?:\s+and|\s+then|\s+save|$)/i);
        const query = queryMatch ? queryMatch[1].trim() : 'technology news';
        steps.push({
          id: `step_${stepIndex++}`,
          action: 'Web Research',
          description: `Search query: "${query}"`,
          toolName: 'webSearch',
          args: { query },
          status: 'pending',
        });
      }

      if (p.includes('save') || p.includes('note') || p.includes('document') || p.includes('summarize')) {
        steps.push({
          id: `step_${stepIndex++}`,
          action: 'Save Summary',
          description: 'Create notes document in local scoped storage',
          toolName: 'fileOperation',
          args: { operation: 'create', fileName: 'automated_research_summary.txt', content: `Automated summary of ${prompt}` },
          status: 'pending',
        });
      }

      if (steps.length > 1) {
        return steps;
      }
    }

    // Check pre-configured triggers
    for (const wf of this.workflows) {
      if (p.includes(wf.triggerPhrase.toLowerCase())) {
        return JSON.parse(JSON.stringify(wf.steps));
      }
    }

    return null;
  }

  // Execute workflow sequentially
  public async executeWorkflow(
    workflow: AutomationWorkflow,
    onStepUpdate: (stepIndex: number, step: WorkflowStep) => void,
    context: {
      onOpenAppModal?: (appName: string, param?: string) => void;
      onOpenSettingsModal?: (section: string) => void;
    }
  ): Promise<{ success: boolean; results: ToolResult[] }> {
    const results: ToolResult[] = [];

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      step.status = 'running';
      onStepUpdate(i, step);

      // Check confirmation level
      const level = biometricService.getToolConfirmationLevel(step.toolName, step.args);
      if (level === 3) {
        const auth = await biometricService.authenticate(`Execute ${step.action}`);
        if (!auth.success) {
          step.status = 'failed';
          step.result = 'Biometric security check failed.';
          onStepUpdate(i, step);
          return { success: false, results };
        }
      }

      // Small delay for natural pacing and UX visualization
      await new Promise(r => setTimeout(r, 650));

      const toolCall: ToolCall = {
        id: `wf_call_${Date.now()}_${i}`,
        name: step.toolName,
        args: step.args,
      };

      try {
        const res = await toolRegistry.executeTool(toolCall, context);
        results.push(res);
        step.status = res.success ? 'completed' : 'failed';
        step.result = res.message;
        onStepUpdate(i, step);
      } catch (err: any) {
        step.status = 'failed';
        step.result = err.message || 'Execution error';
        onStepUpdate(i, step);
        return { success: false, results };
      }
    }

    return { success: true, results };
  }
}

export const automationEngine = new AutomationEngine();
