import React, { useState } from 'react';
import { 
  Play, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Plus, 
  ArrowRight,
  ShieldCheck,
  Check,
  RefreshCw
} from 'lucide-react';
import { AutomationWorkflow, WorkflowStep } from '../types';
import { automationEngine } from '../services/automationEngine';

interface AutomationViewProps {
  onRunWorkflow: (workflow: AutomationWorkflow) => void;
  activeWorkflowId: string | null;
  currentStepIndex: number;
}

export const AutomationView: React.FC<AutomationViewProps> = ({
  onRunWorkflow,
  activeWorkflowId,
  currentStepIndex,
}) => {
  const workflows = automationEngine.getWorkflows();
  const [customGoal, setCustomGoal] = useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoal.trim()) return;

    const parsedSteps = automationEngine.parseMultiStepIntent(customGoal);
    const newWf: AutomationWorkflow = {
      id: `custom_wf_${Date.now()}`,
      name: customGoal.slice(0, 32),
      description: customGoal,
      triggerPhrase: customGoal,
      enabled: true,
      steps: parsedSteps || [
        {
          id: 'step_1',
          action: 'Web Research',
          description: `Research query: "${customGoal}"`,
          toolName: 'webSearch',
          args: { query: customGoal },
          status: 'pending',
        },
        {
          id: 'step_2',
          action: 'Save to Document',
          description: 'Save results to local storage note',
          toolName: 'fileOperation',
          args: { operation: 'create', fileName: 'custom_routine_notes.txt', content: `Results for: ${customGoal}` },
          status: 'pending',
        },
      ],
    };

    onRunWorkflow(newWf);
    setCustomGoal('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0b1222]/80 border border-cyan-500/30 rounded-2xl p-4 hologram-glow">
        <div className="flex items-center gap-2 mb-1 text-cyan-400">
          <Layers className="w-5 h-5" />
          <h2 className="font-cyber font-bold tracking-wider text-base text-white">
            SMART AUTOMATION ORCHESTRATOR
          </h2>
        </div>
        <p className="text-xs font-mono-code text-slate-400">
          ULTRON automatically coordinates multi-step Android routines, web synthesis, accessibility inspection, and storage workflows in sequence.
        </p>

        {/* Custom Workflow Input */}
        <form onSubmit={handleCustomSubmit} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            placeholder="E.g. open Chrome, search today's tech news, summarize and save summary..."
            className="flex-1 bg-[#060a14] border border-cyan-500/30 px-3 py-2 rounded-xl text-xs font-mono-code text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={!customGoal.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono-code disabled:opacity-40 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
            <span>Execute Routine</span>
          </button>
        </form>
      </div>

      {/* Routine Cards List */}
      <div className="space-y-4">
        <div className="text-xs font-mono-code text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Configured Jarvis Routines ({workflows.length})</span>
        </div>

        {workflows.map((wf) => {
          const isRunning = activeWorkflowId === wf.id;

          return (
            <div
              key={wf.id}
              className={`bg-[#0d1527]/80 rounded-2xl border transition-all p-4 ${
                isRunning
                  ? 'border-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.25)]'
                  : 'border-slate-800 hover:border-cyan-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-100 text-sm">
                      {wf.name}
                    </h3>
                    <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      "{wf.triggerPhrase}"
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {wf.description}
                  </p>
                </div>

                <button
                  onClick={() => onRunWorkflow(wf)}
                  disabled={isRunning}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono-code transition-all active:scale-95 ${
                    isRunning
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 animate-pulse'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Trigger Workflow</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step Sequence Flow */}
              <div className="space-y-2 mt-4 pt-3 border-t border-slate-800/80">
                <span className="text-[10px] font-mono-code text-slate-500 uppercase tracking-widest block">
                  Execution Pipeline Steps:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {wf.steps.map((st, sIdx) => {
                    let stepBg = 'bg-[#060a14] border-slate-800 text-slate-400';
                    let stepIcon = <Clock className="w-3.5 h-3.5 text-slate-500" />;

                    if (isRunning) {
                      if (st.status === 'completed') {
                        stepBg = 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300';
                        stepIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
                      } else if (st.status === 'running') {
                        stepBg = 'bg-cyan-950/40 border-cyan-400 text-cyan-200 animate-pulse';
                        stepIcon = <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />;
                      } else if (st.status === 'failed') {
                        stepBg = 'bg-red-950/20 border-red-500/40 text-red-300';
                        stepIcon = <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
                      }
                    }

                    return (
                      <div
                        key={st.id}
                        className={`p-2.5 rounded-xl border text-xs font-mono-code flex flex-col justify-between ${stepBg}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-semibold text-slate-200">
                            {sIdx + 1}. {st.action}
                          </span>
                          {stepIcon}
                        </div>
                        <p className="text-[11px] opacity-80 line-clamp-2">
                          {st.description}
                        </p>
                        {st.result && (
                          <div className="mt-1 text-[10px] text-emerald-400 truncate">
                            ✓ {st.result}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
