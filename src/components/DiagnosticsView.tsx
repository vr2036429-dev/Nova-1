import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldAlert, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Cpu, 
  Wifi, 
  Mic, 
  Volume2, 
  Database, 
  Lock, 
  Brain,
  Trash2,
  Edit2,
  Plus,
  Terminal,
  Filter
} from 'lucide-react';
import { DiagnosticCheck, AuditLog, LogCategory, CapabilityItem } from '../types';
import { diagnosticEngine } from '../services/diagnosticEngine';
import { capabilityRegistry } from '../services/capabilityRegistry';
import { memoryService, MemoryFact } from '../services/memoryService';

export const DiagnosticsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'health' | 'capabilities' | 'logs' | 'memory'>('health');
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [systemSummary, setSystemSummary] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>(diagnosticEngine.getLogs());
  const [selectedLogCategory, setSelectedLogCategory] = useState<string>('all');
  const [memoryFacts, setMemoryFacts] = useState<MemoryFact[]>(memoryService.getLongTermFacts());
  const [newFactText, setNewFactText] = useState('');
  const [newFactCategory, setNewFactCategory] = useState<MemoryFact['category']>('preference');
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editFactText, setEditFactText] = useState('');

  const capabilities = capabilityRegistry.getAllCapabilities();

  useEffect(() => {
    const unsubLogs = diagnosticEngine.subscribeLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });
    const unsubChecks = diagnosticEngine.subscribeChecks((updatedChecks) => {
      setChecks(updatedChecks);
    });

    // Run initial self check if not run yet
    if (checks.length === 0) {
      handleRunSelfTest();
    }

    return () => {
      unsubLogs();
      unsubChecks();
    };
  }, []);

  const handleRunSelfTest = async () => {
    setIsRunningCheck(true);
    const result = await diagnosticEngine.runSystemSelfCheck();
    setChecks(result.checks);
    setSystemSummary(result.summary);
    setIsRunningCheck(false);
  };

  const handleAddFact = () => {
    if (!newFactText.trim()) return;
    memoryService.addLongTermFact(newFactText.trim(), newFactCategory);
    setMemoryFacts(memoryService.getLongTermFacts());
    setNewFactText('');
  };

  const handleDeleteFact = (id: string) => {
    memoryService.deleteFact(id);
    setMemoryFacts(memoryService.getLongTermFacts());
  };

  const handleSaveEditFact = (id: string) => {
    if (!editFactText.trim()) return;
    memoryService.updateFact(id, editFactText.trim());
    setMemoryFacts(memoryService.getLongTermFacts());
    setEditingFactId(null);
  };

  const filteredLogs = selectedLogCategory === 'all' 
    ? logs 
    : logs.filter((l) => l.category === selectedLogCategory);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <h2 className="text-xl font-bold font-['Chakra_Petch'] text-cyan-400 tracking-wider flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            ULTRON SYSTEM DIAGNOSTICS & CONTROL MATRIX
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time telemetry, capability verification, structured audit logging, and memory governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'health' && (
            <button
              onClick={handleRunSelfTest}
              disabled={isRunningCheck}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-['Chakra_Petch'] font-semibold tracking-wider transition flex items-center gap-2 shadow-lg shadow-cyan-950/40"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRunningCheck ? 'animate-spin' : ''}`} />
              {isRunningCheck ? 'Diagnostic Scan In Progress...' : 'Run System Check'}
            </button>
          )}

          {/* Sub Navigation */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setActiveTab('health')}
              className={`px-3 py-1 rounded text-xs font-mono transition ${
                activeTab === 'health' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Health Monitor
            </button>
            <button
              onClick={() => setActiveTab('capabilities')}
              className={`px-3 py-1 rounded text-xs font-mono transition ${
                activeTab === 'capabilities' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Capability Graph
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 rounded text-xs font-mono transition ${
                activeTab === 'logs' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Audit Logs
            </button>
            <button
              onClick={() => setActiveTab('memory')}
              className={`px-3 py-1 rounded text-xs font-mono transition ${
                activeTab === 'memory' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Memory Engine
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: System Health & Diagnostic Suite */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {systemSummary && (
            <div className="bg-slate-900/80 border border-cyan-900/50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-['Chakra_Petch'] font-semibold text-slate-200">
                  {systemSummary}
                </span>
              </div>
              <span className="text-xs font-mono text-cyan-400">
                Acoustic & Neural Buses Active
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {checks.map((c) => (
              <div
                key={c.id}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                    {c.category}
                  </span>
                  {c.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {c.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {c.status === 'fail' && <XCircle className="w-4 h-4 text-rose-400" />}
                </div>

                <h4 className="text-sm font-semibold text-slate-200 font-['Chakra_Petch']">
                  {c.name}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  {c.message}
                </p>

                {c.latencyMs !== undefined && (
                  <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-900/30">
                    Latency: {c.latencyMs}ms
                  </span>
                )}
                {c.recommendation && (
                  <p className="text-[11px] text-amber-300/90 font-mono mt-1">
                    Guidance: {c.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Runtime Device Capability Graph */}
      {activeTab === 'capabilities' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-4 text-xs font-mono">
            <span className="text-slate-400">STATUS KEY:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              IMPLEMENTED
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              PARTIALLY IMPLEMENTED
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
              REQUIRES PERMISSION
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
              REQUIRES EXTERNAL API
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
              ANDROID PLATFORM LIMITED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-cyan-900/60 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-100 font-['Chakra_Petch']">
                    {item.name}
                  </h4>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                    item.status === 'IMPLEMENTED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    item.status === 'PARTIALLY IMPLEMENTED' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                    item.status === 'REQUIRES USER PERMISSION' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    item.status === 'REQUIRES EXTERNAL API' ? 'bg-purple-950 text-purple-400 border border-purple-800' :
                    item.status === 'NOT AVAILABLE' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{item.description}</p>
                <div className="bg-slate-900/60 p-2 rounded text-[11px] font-mono text-slate-400 border border-slate-800/80">
                  <span className="text-cyan-400">Android/Web Spec:</span> {item.platformNote}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Structured Observability Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedLogCategory}
                onChange={(e) => setSelectedLogCategory(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Categories ({logs.length})</option>
                <option value="ULTRON_AUDIO">ULTRON_AUDIO</option>
                <option value="ULTRON_AI">ULTRON_AI</option>
                <option value="ULTRON_TOOL">ULTRON_TOOL</option>
                <option value="ULTRON_PERMISSION">ULTRON_PERMISSION</option>
                <option value="ULTRON_AUTOMATION">ULTRON_AUTOMATION</option>
                <option value="ULTRON_MEMORY">ULTRON_MEMORY</option>
                <option value="ULTRON_NETWORK">ULTRON_NETWORK</option>
                <option value="ULTRON_ERROR">ULTRON_ERROR</option>
              </select>
            </div>

            <button
              onClick={() => diagnosticEngine.clearLogs()}
              className="text-xs font-mono text-slate-500 hover:text-slate-300 transition"
            >
              Clear Logs
            </button>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 font-mono text-xs max-h-[500px] overflow-y-auto space-y-1.5">
            {filteredLogs.length === 0 ? (
              <p className="text-slate-600 italic py-8 text-center">No logs matching selected filter.</p>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded bg-slate-900/50 border border-slate-800/60 flex items-start gap-3 hover:bg-slate-900 transition"
                >
                  <span className="text-[10px] text-slate-500 shrink-0">{log.timestamp}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                    log.level === 'error' ? 'bg-rose-950 text-rose-400' :
                    log.level === 'warn' ? 'bg-amber-950 text-amber-400' :
                    log.level === 'success' ? 'bg-emerald-950 text-emerald-400' :
                    'bg-cyan-950 text-cyan-400'
                  }`}>
                    {log.category}
                  </span>
                  <span className="text-slate-200 break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Layered Memory Engine */}
      {activeTab === 'memory' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-cyan-900/40 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-cyan-400" />
              Add Long-Term Memory Fact
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={newFactCategory}
                onChange={(e) => setNewFactCategory(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 rounded-lg px-3 py-2"
              >
                <option value="preference">Preference</option>
                <option value="identity">Identity</option>
                <option value="work">Work / Task</option>
                <option value="system">System</option>
              </select>
              <input
                type="text"
                value={newFactText}
                onChange={(e) => setNewFactText(e.target.value)}
                placeholder="Enter new factual memory (e.g., 'User works as a software architect')"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleAddFact}
                disabled={!newFactText.trim()}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-['Chakra_Petch'] font-semibold rounded-lg transition disabled:opacity-50"
              >
                Save Fact
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Inspect & Edit Stored Long-Term Memory ({memoryFacts.length})
              </h3>
              <button
                onClick={() => {
                  memoryService.clearMemory();
                  setMemoryFacts([]);
                }}
                className="text-xs font-mono text-rose-400 hover:text-rose-300 transition"
              >
                Wipe All Stored Memory
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {memoryFacts.map((mf) => (
                <div
                  key={mf.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 uppercase">
                        {mf.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{mf.createdAt}</span>
                    </div>
                    {editingFactId === mf.id ? (
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={editFactText}
                          onChange={(e) => setEditFactText(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                        />
                        <button
                          onClick={() => handleSaveEditFact(mf.id)}
                          className="px-2 py-1 bg-cyan-600 rounded text-xs text-white"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-200 font-sans">{mf.fact}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setEditingFactId(mf.id);
                        setEditFactText(mf.fact);
                      }}
                      className="p-1 text-slate-400 hover:text-cyan-400 transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFact(mf.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
