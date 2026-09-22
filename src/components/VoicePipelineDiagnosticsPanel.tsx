import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Radio, 
  ShieldCheck, 
  Mic, 
  Cpu, 
  Volume2, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { voicePipelineDiagnostics } from '../services/voicePipelineDiagnostics';
import { VoicePipelineStageId, VoicePipelineStageState, VoicePipelineStageStatus } from '../types';

interface VoicePipelineDiagnosticsPanelProps {
  onRunTestUtterance?: (testText: string) => void;
  className?: string;
}

export const VoicePipelineDiagnosticsPanel: React.FC<VoicePipelineDiagnosticsPanelProps> = ({
  onRunTestUtterance,
  className = '',
}) => {
  const [stages, setStages] = useState<VoicePipelineStageState[]>(
    voicePipelineDiagnostics.getStages()
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = voicePipelineDiagnostics.subscribe((updatedStages: VoicePipelineStageState[]) => {
      setStages(updatedStages);
    });
    return unsubscribe;
  }, []);

  const getStatusBadge = (status: VoicePipelineStageStatus) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono-code text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            OK
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono-code text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-1.5 py-0.5 rounded animate-pulse">
            <Radio className="w-2.5 h-2.5 text-cyan-400" />
            ACTIVE
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono-code text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
            WARN
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono-code text-rose-400 bg-rose-950/60 border border-rose-500/30 px-1.5 py-0.5 rounded">
            <XCircle className="w-2.5 h-2.5 text-rose-400" />
            FAIL
          </span>
        );
      case 'idle':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono-code text-slate-500 bg-slate-900/60 border border-slate-700/50 px-1.5 py-0.5 rounded">
            IDLE
          </span>
        );
    }
  };

  const getStageIcon = (stageId: VoicePipelineStageId) => {
    switch (stageId) {
      case 'MIC_PERMISSION':
        return <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />;
      case 'AUDIO_INPUT':
        return <Mic className="w-3.5 h-3.5 text-sky-400" />;
      case 'AUDIO_CAPTURE':
        return <Cpu className="w-3.5 h-3.5 text-blue-400" />;
      case 'VAD':
        return <Activity className="w-3.5 h-3.5 text-indigo-400" />;
      case 'LIVE_SESSION':
        return <Radio className="w-3.5 h-3.5 text-purple-400" />;
      case 'AUDIO_STREAM':
        return <Clock className="w-3.5 h-3.5 text-pink-400" />;
      case 'AI_RESPONSE':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      case 'RESPONSE_AUDIO':
        return <Volume2 className="w-3.5 h-3.5 text-teal-400" />;
      case 'AUDIO_OUTPUT':
        return <Volume2 className="w-3.5 h-3.5 text-amber-400" />;
      case 'UI_STATE':
        return <Activity className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const activeOrSuccessfulStages = stages.filter(
    (s: VoicePipelineStageState) => s.status === 'success' || s.status === 'active'
  ).length;

  return (
    <div className={`w-full max-w-xl bg-[#070e1b]/95 border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl backdrop-blur text-xs ${className}`}>
      {/* Header bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-900/90 via-[#0a1529]/90 to-slate-900/90 cursor-pointer select-none hover:bg-slate-800/80 transition-colors border-b border-cyan-500/20"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-mono-code font-bold tracking-wider text-cyan-300 uppercase text-[11px]">
            Voice Pipeline Telemetry
          </span>
          <span className="text-[10px] font-mono-code text-slate-400 bg-cyan-950/60 border border-cyan-500/20 px-1.5 py-0.5 rounded">
            {activeOrSuccessfulStages}/10 Stages Active
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono-code text-cyan-400 font-semibold">
            {activeOrSuccessfulStages === 10 ? 'All 10 Stages Ready' : 'Pipeline Operational'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Collapsed Mini Status Bar (Always Visible) */}
      <div className="px-3 py-1.5 flex items-center justify-between gap-1 overflow-x-auto bg-[#050a14]/60 text-[10px] font-mono-code scrollbar-none border-b border-slate-800/60">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {stages.map((stage: VoicePipelineStageState) => (
            <div 
              key={stage.id} 
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                stage.status === 'success' 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                  : stage.status === 'active'
                  ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-200 animate-pulse'
                  : stage.status === 'warning'
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                  : stage.status === 'error'
                  ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
              title={`${stage.stepNumber}. ${stage.name}: ${stage.message || stage.status}`}
            >
              {getStageIcon(stage.id)}
              <span className="truncate max-w-[80px]">{stage.name}</span>
            </div>
          ))}
        </div>

        {onRunTestUtterance && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRunTestUtterance('ULTRON system status check');
            }}
            className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[10px] transition-all hover:scale-105 active:scale-95"
            title="Inject test utterance to verify complete 10-stage voice pipeline"
          >
            <Play className="w-2.5 h-2.5 fill-cyan-400 text-cyan-400" />
            <span>Test Pipeline</span>
          </button>
        )}
      </div>

      {/* Expanded Detailed 10-Stage View */}
      {isExpanded && (
        <div className="p-3 space-y-2 bg-[#060c18]/95">
          {/* Stage Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stages.map((stage: VoicePipelineStageState) => (
              <div
                key={stage.id}
                className="p-2 rounded-lg bg-[#0b1424] border border-slate-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {getStageIcon(stage.id)}
                    <span className="font-mono-code font-semibold text-slate-200 text-[11px]">
                      {stage.stepNumber}. {stage.name}
                    </span>
                  </div>
                  {getStatusBadge(stage.status)}
                </div>

                <p className="text-[11px] text-slate-300 font-mono-code leading-tight line-clamp-2">
                  {stage.message || 'Standby for audio turn activation'}
                </p>

                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono-code pt-0.5">
                  <span>Latency: {stage.latencyMs !== undefined ? `${stage.latencyMs}ms` : '—'}</span>
                  <span>{stage.lastUpdated}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1 text-[10px] font-mono-code text-slate-400">
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
              Live Stage Observers Active
            </span>
            <button
              type="button"
              onClick={() => voicePipelineDiagnostics.reset()}
              className="text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              Reset Pipeline Stages
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
