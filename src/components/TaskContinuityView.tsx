import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  XSquare, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RotateCw, 
  Layers, 
  ArrowRight,
  Sparkles,
  Undo2,
  BookmarkCheck,
  Compass
} from 'lucide-react';
import { ActiveTask, TaskPlanStep, ActionHistoryRecord } from '../types';
import { taskContinuityEngine } from '../services/taskContinuityEngine';
import { AutonomousExecutionPanel } from './AutonomousExecutionPanel';

interface TaskContinuityViewProps {
  onExecuteTool?: (toolName: string, args: Record<string, any>) => Promise<any>;
}

export const TaskContinuityView: React.FC<TaskContinuityViewProps> = ({ onExecuteTool }) => {
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(taskContinuityEngine.getActiveTask());
  const [taskHistory, setTaskHistory] = useState<ActiveTask[]>(taskContinuityEngine.getTaskHistory());
  const [actionRecords, setActionRecords] = useState<ActionHistoryRecord[]>(taskContinuityEngine.getActionRecords());
  const [customGoal, setCustomGoal] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [planMessage, setPlanMessage] = useState('');

  useEffect(() => {
    const unsub = taskContinuityEngine.subscribe((task) => {
      setActiveTask(task);
      setTaskHistory(taskContinuityEngine.getTaskHistory());
      setActionRecords(taskContinuityEngine.getActionRecords());
    });
    return () => unsub();
  }, []);

  const handleCreateAutonomousPlan = async () => {
    if (!customGoal.trim()) return;
    setIsPlanning(true);
    setPlanMessage('Generating multi-step plan with safety verification...');

    try {
      const res = await fetch('/api/plan-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: customGoal.trim() }),
      });

      if (!res.ok) throw new Error('Planning service failed');
      const planData = await res.json();

      const task = taskContinuityEngine.createTask(customGoal.trim(), {
        title: planData.title,
        steps: planData.steps || [],
        summary: planData.summary,
      });

      setCustomGoal('');
      setPlanMessage('Plan created. Execution ready.');

      // Automatically execute step 1 if requested
      if (onExecuteTool && task.steps.length > 0) {
        const step1 = task.steps[0];
        try {
          const result = await onExecuteTool(step1.toolName, step1.args);
          taskContinuityEngine.advanceStep(0, 'completed', result?.message || 'Completed');
        } catch (e: any) {
          taskContinuityEngine.advanceStep(0, 'failed', e.message);
        }
      }
    } catch (e: any) {
      setPlanMessage(`Planning failed: ${e.message}. Created standard 3-step sequence.`);
      taskContinuityEngine.createTask(customGoal.trim(), {
        title: customGoal.slice(0, 30),
        steps: [
          { id: 's1', title: 'Objective Analysis', description: 'Evaluate request constraints', toolName: 'readScreen', args: {} },
          { id: 's2', title: 'Action Execution', description: 'Run coordinated tool commands', toolName: 'fileOperation', args: { operation: 'create', fileName: 'task_output.txt', content: `Task output for: ${customGoal}` } },
          { id: 's3', title: 'Verification', description: 'Confirm final state', toolName: 'readNotifications', args: { filterApp: 'all' } },
        ],
      });
    } finally {
      setIsPlanning(false);
    }
  };

  const handleAdvanceStep = async (index: number) => {
    if (!activeTask || !activeTask.steps[index]) return;
    const step = activeTask.steps[index];

    taskContinuityEngine.advanceStep(index, 'running');
    if (onExecuteTool) {
      try {
        const res = await onExecuteTool(step.toolName, step.args);
        taskContinuityEngine.advanceStep(index, 'completed', res?.message || 'Completed successfully');
      } catch (e: any) {
        taskContinuityEngine.advanceStep(index, 'failed', e.message);
      }
    } else {
      taskContinuityEngine.advanceStep(index, 'completed', 'Step processed.');
    }
  };

  const handleUndoAction = (record: ActionHistoryRecord) => {
    taskContinuityEngine.markActionUndone(record.id);
    setActionRecords([...taskContinuityEngine.getActionRecords()]);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <h2 className="text-xl font-bold font-['Chakra_Petch'] text-cyan-400 tracking-wider flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            TASK CONTINUITY & AUTONOMOUS PLANNER
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Persisted task memory across sessions, safe checkpoints, and action reversibility.
          </p>
        </div>

        {activeTask && (
          <div className="flex items-center gap-2">
            {activeTask.status === 'running' ? (
              <button
                onClick={() => taskContinuityEngine.pauseTask()}
                className="px-3 py-1.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono flex items-center gap-1.5 hover:bg-amber-500/30 transition"
              >
                <Pause className="w-3.5 h-3.5" /> Pause Task
              </button>
            ) : (
              <button
                onClick={() => taskContinuityEngine.resumeTask()}
                className="px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono flex items-center gap-1.5 hover:bg-emerald-500/30 transition"
              >
                <Play className="w-3.5 h-3.5" /> Resume Task
              </button>
            )}

            <button
              onClick={() => taskContinuityEngine.restartTask()}
              className="px-3 py-1.5 rounded bg-cyan-900/30 text-cyan-300 border border-cyan-700/40 text-xs font-mono flex items-center gap-1.5 hover:bg-cyan-900/50 transition"
              title="Restart from step 1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restart
            </button>

            <button
              onClick={() => taskContinuityEngine.cancelTask()}
              className="px-3 py-1.5 rounded bg-rose-900/30 text-rose-300 border border-rose-700/40 text-xs font-mono flex items-center gap-1.5 hover:bg-rose-900/50 transition"
              title="Cancel and archive"
            >
              <XSquare className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Autonomous Command-to-Completion Engine (Section 1) */}
      <AutonomousExecutionPanel />

      {/* Autonomous Goal Planner Input */}
      <div className="bg-slate-900/60 border border-cyan-900/40 rounded-xl p-4 backdrop-blur-sm">
        <label className="block text-xs font-mono text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Autonomous Goal Decomposition Engine
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateAutonomousPlan()}
            placeholder='e.g., "Research Android AI frameworks, compile findings, and save briefing report"'
            className="flex-1 bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
          />
          <button
            onClick={handleCreateAutonomousPlan}
            disabled={isPlanning || !customGoal.trim()}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-sm font-semibold font-['Chakra_Petch'] tracking-wide hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition flex items-center gap-2"
          >
            {isPlanning ? <RotateCw className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
            {isPlanning ? 'Planning...' : 'Generate Plan'}
          </button>
        </div>
        {planMessage && (
          <p className="text-xs text-cyan-400/80 font-mono mt-2">{planMessage}</p>
        )}
      </div>

      {/* Active Task Card */}
      {activeTask ? (
        <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-cyan-500/30 rounded-xl p-5 shadow-lg shadow-cyan-950/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded ${
                  activeTask.status === 'running' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse' :
                  activeTask.status === 'paused' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  activeTask.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {activeTask.status}
                </span>
                <h3 className="text-base font-bold text-slate-100 font-['Chakra_Petch']">
                  {activeTask.title}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Objective: {activeTask.goal}</p>
            </div>
            <div className="text-right text-[11px] font-mono text-slate-400">
              Checkpoints: {activeTask.checkpoints.length} | Created: {activeTask.createdAt}
            </div>
          </div>

          {/* Steps Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">Execution Steps:</h4>
            <div className="space-y-2">
              {activeTask.steps.map((step, idx) => {
                const isCurrent = idx === activeTask.currentStepIndex && activeTask.status === 'running';
                return (
                  <div
                    key={step.id}
                    className={`p-3 rounded-lg border transition ${
                      step.status === 'completed' ? 'bg-emerald-950/20 border-emerald-800/40' :
                      isCurrent ? 'bg-cyan-950/30 border-cyan-500/60 shadow-md shadow-cyan-950/30' :
                      step.status === 'failed' ? 'bg-rose-950/20 border-rose-800/40' :
                      'bg-slate-900/40 border-slate-800/60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {step.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isCurrent ? (
                            <RotateCw className="w-4 h-4 text-cyan-400 animate-spin" />
                          ) : step.status === 'failed' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">
                              {idx + 1}. {step.title}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300">
                              {step.toolName}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                          {step.result && (
                            <p className="text-xs text-emerald-300 font-mono mt-1 bg-slate-950/60 p-1.5 rounded border border-emerald-900/30">
                              ✓ {step.result}
                            </p>
                          )}
                        </div>
                      </div>

                      {step.status !== 'completed' && activeTask.status !== 'completed' && (
                        <button
                          onClick={() => handleAdvanceStep(idx)}
                          className="px-2.5 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono flex items-center gap-1 transition"
                        >
                          Execute <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkpoints Stream */}
          {activeTask.checkpoints.length > 0 && (
            <div className="border-t border-slate-800 pt-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
                Continuity Checkpoints:
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeTask.checkpoints.map((cp) => (
                  <div
                    key={cp.id}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>{cp.stepTitle}</span>
                    <span className="text-slate-500 text-[10px]">{cp.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center space-y-3">
          <Clock className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300 font-['Chakra_Petch']">
            No Active Autonomous Task
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Say "ULTRON, continue my research" or create an autonomous goal above. Tasks automatically persist across browser restarts and device sleep.
          </p>
          {taskHistory.length > 0 && (
            <button
              onClick={() => taskContinuityEngine.resumeTask()}
              className="px-4 py-2 rounded-lg bg-cyan-900/40 border border-cyan-700/50 text-cyan-300 text-xs font-mono hover:bg-cyan-900/60 transition inline-flex items-center gap-2"
            >
              <RotateCw className="w-3.5 h-3.5" /> Resume Last Paused Task
            </button>
          )}
        </div>
      )}

      {/* Task History & Action Undo Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Past Tasks */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Task Continuity Archive ({taskHistory.length})
            </h3>
            {taskHistory.length > 0 && (
              <button
                onClick={() => {
                  taskContinuityEngine.clearTaskHistory();
                  setTaskHistory([]);
                }}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition"
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {taskHistory.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No past tasks recorded.</p>
            ) : (
              taskHistory.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <p className="font-semibold text-slate-200 truncate">{t.title}</p>
                    <p className="text-[10px] text-slate-500">{t.steps.length} steps | {t.createdAt}</p>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    t.status === 'completed' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Undo Record */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Undo2 className="w-3.5 h-3.5 text-cyan-400" />
            Reversible Action Record
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {actionRecords.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No reversible actions executed yet.</p>
            ) : (
              actionRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-semibold text-slate-300">{rec.actionName}</p>
                    <p className="text-[10px] text-slate-500">{rec.description} • {rec.timestamp}</p>
                  </div>
                  {rec.canUndo && !rec.undone && (
                    <button
                      onClick={() => handleUndoAction(rec)}
                      className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono hover:bg-amber-500/30 transition"
                    >
                      Undo
                    </button>
                  )}
                  {rec.undone && (
                    <span className="text-[10px] font-mono text-slate-500 italic">Undone</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
