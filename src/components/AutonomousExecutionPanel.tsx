import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Play, 
  Pause, 
  Square, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Terminal, 
  Check, 
  Activity,
  Smartphone,
  Globe,
  FileText,
  AlertCircle
} from 'lucide-react';
import { ultronAutonomousEngine } from '../services/ultronAutonomousEngine';
import { AutonomousExecutionJob, SystemHealthSnapshot } from '../types';

export const AutonomousExecutionPanel: React.FC = () => {
  const [job, setJob] = useState<AutonomousExecutionJob | null>(ultronAutonomousEngine.getCurrentJob());
  const [health, setHealth] = useState<SystemHealthSnapshot>(ultronAutonomousEngine.checkSystemHealth());
  const [singleCommandInput, setSingleCommandInput] = useState<string>('');
  const [isBusy, setIsBusy] = useState<boolean>(false);

  useEffect(() => {
    const unsub = ultronAutonomousEngine.subscribe((updatedJob) => {
      setJob(updatedJob ? { ...updatedJob } : null);
    });
    return unsub;
  }, []);

  const handleStartCommand = async (cmdText: string) => {
    if (!cmdText.trim()) return;
    setIsBusy(true);
    setSingleCommandInput('');
    const plannedJob = ultronAutonomousEngine.planCommand(cmdText.trim());
    setJob({ ...plannedJob });
    try {
      await ultronAutonomousEngine.executeJob();
    } catch (e) {
      console.error('Autonomous execution error:', e);
    } finally {
      setIsBusy(false);
    }
  };

  const handleEmergencyStop = () => {
    ultronAutonomousEngine.emergencyStop();
    setIsBusy(false);
  };

  const getStatusColor = (state: AutonomousExecutionJob['state']) => {
    switch (state) {
      case 'COMPLETED':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
      case 'EXECUTING':
        return 'text-cyan-300 bg-cyan-950/60 border-cyan-500/40 animate-pulse';
      case 'RECOVERING':
        return 'text-amber-300 bg-amber-950/60 border-amber-500/40';
      case 'FAILED':
      case 'CANCELLED':
        return 'text-rose-400 bg-rose-950/60 border-rose-500/40';
      case 'PAUSED':
        return 'text-slate-300 bg-slate-900/60 border-slate-700';
      default:
        return 'text-slate-400 bg-slate-900/60 border-slate-800';
    }
  };

  return (
    <div className="w-full bg-[#080d19]/90 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur mb-6 text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-cyber font-bold tracking-wider text-cyan-300 text-sm">
                AUTONOMOUS COMMAND-TO-COMPLETION ENGINE
              </h3>
              <span className="text-[10px] font-mono-code px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                ZERO-MICROMANAGEMENT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono-code">
              ASIK gives one command → ULTRON plans, executes, recovers, verifies, and delivers.
            </p>
          </div>
        </div>

        {/* Emergency Stop & Controls */}
        <div className="flex items-center gap-2">
          {job && job.state === 'EXECUTING' && (
            <button
              onClick={() => ultronAutonomousEngine.pauseJob()}
              className="px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-500/40 text-amber-300 hover:bg-amber-900 text-xs font-mono-code flex items-center gap-1 transition"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          )}

          {job && job.state === 'PAUSED' && (
            <button
              onClick={() => ultronAutonomousEngine.resumeJob()}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 text-xs font-mono-code flex items-center gap-1 transition"
            >
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          )}

          <button
            onClick={handleEmergencyStop}
            className="px-3 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-mono-code flex items-center gap-1.5 transition active:scale-95 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
            title="Emergency halt of all autonomous actions"
          >
            <Square className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
            <span>STOP ULTRON</span>
          </button>
        </div>
      </div>

      {/* Single Command Input Form */}
      <div className="space-y-2 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={singleCommandInput}
            onChange={(e) => setSingleCommandInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartCommand(singleCommandInput)}
            placeholder='Give a complete goal, e.g. "ULTRON, ek professional Android app bana do" or "Khud kar lo"'
            disabled={isBusy}
            className="flex-1 bg-slate-950/90 border border-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono-code"
          />
          <button
            onClick={() => handleStartCommand(singleCommandInput)}
            disabled={!singleCommandInput.trim() || isBusy}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono-code transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Execute End-to-End</span>
          </button>
        </div>

        {/* Quick Voice / Natural Command Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[10px] text-slate-500 font-mono-code self-center mr-1">One-Command Presets:</span>
          {[
            { label: '«Ek professional Android app bana do»', cmd: 'ULTRON, ek professional Android app bana do.' },
            { label: '«Modern portfolio website bana do»', cmd: 'ULTRON, ek modern portfolio website bana do.' },
            { label: '«Research topic & report»', cmd: 'ULTRON, is topic par research karo aur mujhe complete report do.' },
            { label: '«Khud kar lo (Full Autopilot)»', cmd: 'Khud kar lo, end tak complete karo.' },
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleStartCommand(chip.cmd)}
              disabled={isBusy}
              className="text-[10px] font-mono-code px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Autonomous Job Display */}
      {job ? (
        <div className="space-y-4 p-4 rounded-xl bg-[#060a14] border border-cyan-500/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono-code text-slate-400">CURRENT GOAL:</span>
              <span className="text-xs font-mono-code text-cyan-200 font-bold">"{job.command}"</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded-full border ${getStatusColor(job.state)}`}>
                STATE: {job.state}
              </span>
              <span className="text-xs font-mono-code text-cyan-400 font-bold">
                {job.progressPercent}% Complete
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${job.progressPercent}%` }}
            />
          </div>

          {/* Sequential Stage Stepper */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider block">
              Autonomous Pipeline Stepper ({job.stages.length} Stages)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono-code text-xs">
              {job.stages.map((stg, idx) => (
                <div
                  key={stg.id}
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 transition-all ${
                    stg.status === 'completed'
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : stg.status === 'running'
                      ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse'
                      : stg.status === 'recovering'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                      : stg.status === 'failed'
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      : 'bg-slate-900/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="pt-0.5">
                    {stg.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : stg.status === 'running' ? (
                      <Activity className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : stg.status === 'failed' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-[11px] truncate">
                        {idx + 1}. {stg.title}
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded border border-slate-700 bg-slate-900 text-slate-400">
                        {stg.riskLevel}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{stg.description}</p>
                    {stg.resultMessage && (
                      <p className="text-[10px] text-emerald-400 mt-0.5 truncate">✓ {stg.resultMessage}</p>
                    )}
                    {stg.error && (
                      <p className="text-[10px] text-rose-400 mt-0.5 truncate">✗ {stg.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deliverables & Genuine Blockers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 font-mono-code text-[11px]">
            <div>
              <span className="text-slate-400 text-[10px] uppercase block mb-1">
                Completed Deliverables:
              </span>
              {job.completedDeliverables.length === 0 ? (
                <span className="text-slate-600 italic text-[10px]">Processing in progress...</span>
              ) : (
                <ul className="space-y-1">
                  {job.completedDeliverables.map((deliv, i) => (
                    <li key={i} className="text-emerald-300 flex items-center gap-1.5 truncate">
                      <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span>{deliv}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase block mb-1">
                Genuine Blockers (Honest Execution):
              </span>
              {job.genuineBlockers.length === 0 ? (
                <span className="text-emerald-400 text-[10px]">✓ Zero blocking platform restrictions</span>
              ) : (
                <ul className="space-y-1">
                  {job.genuineBlockers.map((blocker, i) => (
                    <li key={i} className="text-rose-300 flex items-center gap-1.5 truncate">
                      <AlertCircle className="w-3 h-3 text-rose-400 flex-shrink-0" />
                      <span>{blocker}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs font-mono-code">
          Standing by. Type or speak a goal above to execute the complete pipeline automatically without micromanagement.
        </div>
      )}
    </div>
  );
};
