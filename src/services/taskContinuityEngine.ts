import { ActiveTask, TaskPlanStep, TaskCheckpoint, ActionHistoryRecord, TaskExecutionStatus } from '../types';

const TASKS_STORAGE_KEY = 'ultron_task_manager_v2';
const ACTION_HISTORY_KEY = 'ultron_action_history_v2';

export class TaskContinuityEngine {
  private activeTask: ActiveTask | null = null;
  private taskHistory: ActiveTask[] = [];
  private actionRecords: ActionHistoryRecord[] = [];
  private listeners: ((task: ActiveTask | null) => void)[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        this.activeTask = parsed.activeTask || null;
        this.taskHistory = Array.isArray(parsed.history) ? parsed.history : [];
      }

      const savedActions = localStorage.getItem(ACTION_HISTORY_KEY);
      if (savedActions) {
        this.actionRecords = JSON.parse(savedActions);
      }
    } catch (e) {
      console.warn('Failed to load task continuity state:', e);
    }
  }

  private persistState() {
    try {
      localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({
          activeTask: this.activeTask,
          history: this.taskHistory.slice(0, 20),
        })
      );
      localStorage.setItem(ACTION_HISTORY_KEY, JSON.stringify(this.actionRecords.slice(0, 50)));
    } catch (e) {
      console.warn('Failed to persist task continuity state:', e);
    }
  }

  public subscribe(listener: (task: ActiveTask | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.activeTask);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.persistState();
    this.listeners.forEach((listener) => listener(this.activeTask));
  }

  public getActiveTask(): ActiveTask | null {
    return this.activeTask;
  }

  public getTaskHistory(): ActiveTask[] {
    return [...this.taskHistory];
  }

  public getActionRecords(): ActionHistoryRecord[] {
    return [...this.actionRecords];
  }

  /**
   * Creates a new multi-step autonomous task with checkpoints
   */
  public createTask(goal: string, planData: { title?: string; steps: Array<Partial<TaskPlanStep>>; summary?: string }): ActiveTask {
    const taskId = `task_${Date.now()}`;
    const steps: TaskPlanStep[] = planData.steps.map((s, idx) => ({
      id: s.id || `step_${idx + 1}`,
      title: s.title || `Step ${idx + 1}`,
      description: s.description || 'Execution step',
      toolName: s.toolName || 'system',
      args: s.args || {},
      status: (idx === 0 ? 'running' : 'pending') as TaskExecutionStatus,
      reversible: Boolean(s.reversible),
      undoPayload: s.undoPayload,
    }));

    const newTask: ActiveTask = {
      id: taskId,
      title: planData.title || goal.slice(0, 40),
      goal,
      status: 'running',
      steps,
      currentStepIndex: 0,
      checkpoints: [
        {
          id: `cp_${Date.now()}_0`,
          taskId,
          stepIndex: 0,
          stepTitle: steps[0]?.title || 'Task Initialized',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          snapshotState: { initialized: true, goal },
        },
      ],
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      summary: planData.summary,
    };

    // If there was an unfinished task, archive it to history
    if (this.activeTask && this.activeTask.status === 'running') {
      this.activeTask.status = 'paused';
      this.taskHistory.unshift(this.activeTask);
    }

    this.activeTask = newTask;
    this.notify();
    return newTask;
  }

  /**
   * Updates current step status and creates a checkpoint
   */
  public advanceStep(stepIndex: number, status: TaskExecutionStatus, result?: string, undoPayload?: any) {
    if (!this.activeTask) return;
    if (this.activeTask.steps[stepIndex]) {
      this.activeTask.steps[stepIndex].status = status;
      if (result) this.activeTask.steps[stepIndex].result = result;
      if (undoPayload) this.activeTask.steps[stepIndex].undoPayload = undoPayload;

      // Create Checkpoint
      const checkpoint: TaskCheckpoint = {
        id: `cp_${Date.now()}_${stepIndex}`,
        taskId: this.activeTask.id,
        stepIndex,
        stepTitle: this.activeTask.steps[stepIndex].title,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        snapshotState: {
          stepIndex,
          status,
          result,
        },
      };
      this.activeTask.checkpoints.push(checkpoint);

      // Advance index if completed
      if (status === 'completed') {
        const nextIndex = stepIndex + 1;
        if (nextIndex < this.activeTask.steps.length) {
          this.activeTask.currentStepIndex = nextIndex;
          this.activeTask.steps[nextIndex].status = 'running';
        } else {
          this.activeTask.status = 'completed';
          this.activeTask.completedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          this.taskHistory.unshift(this.activeTask);
        }
      } else if (status === 'failed') {
        this.activeTask.status = 'failed';
      }

      this.activeTask.updatedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.notify();
    }
  }

  /**
   * Task Controls: Pause / Resume / Cancel / Restart / Recover
   */
  public pauseTask() {
    if (this.activeTask && this.activeTask.status === 'running') {
      this.activeTask.status = 'paused';
      this.notify();
    }
  }

  public resumeTask(): boolean {
    if (!this.activeTask) {
      // Find the most recent unfinished task from history
      const unfinished = this.taskHistory.find((t) => t.status === 'paused' || t.status === 'failed');
      if (unfinished) {
        this.activeTask = unfinished;
        this.activeTask.status = 'running';
        this.notify();
        return true;
      }
      return false;
    }
    this.activeTask.status = 'running';
    this.notify();
    return true;
  }

  public cancelTask() {
    if (this.activeTask) {
      this.activeTask.status = 'failed';
      this.activeTask.summary = 'Cancelled by user command.';
      this.taskHistory.unshift(this.activeTask);
      this.activeTask = null;
      this.notify();
    }
  }

  public restartTask() {
    if (!this.activeTask) return;
    this.activeTask.status = 'running';
    this.activeTask.currentStepIndex = 0;
    this.activeTask.steps.forEach((step, idx) => {
      step.status = idx === 0 ? 'running' : 'pending';
      step.result = undefined;
    });
    this.notify();
  }

  /**
   * Action Undo Registry
   */
  public recordAction(actionName: string, description: string, target?: string, canUndo = true, undoData?: any) {
    const record: ActionHistoryRecord = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      actionName,
      description,
      target,
      canUndo,
      undone: false,
      undoData,
    };
    this.actionRecords.unshift(record);
    this.persistState();
    return record;
  }

  public markActionUndone(id: string) {
    const record = this.actionRecords.find((r) => r.id === id);
    if (record) {
      record.undone = true;
      this.persistState();
    }
  }

  public clearTaskHistory() {
    this.taskHistory = [];
    this.persistState();
  }
}

export const taskContinuityEngine = new TaskContinuityEngine();
