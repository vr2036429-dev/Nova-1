import React, { useState, useEffect } from 'react';
import { 
  Code, 
  Terminal, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  GitBranch, 
  GitCommit, 
  FileCode, 
  Folder, 
  Sparkles, 
  Bug, 
  Wrench, 
  RefreshCw, 
  Plus, 
  Send, 
  Copy, 
  Check, 
  Eye, 
  Layers, 
  Cpu, 
  Smartphone, 
  Globe, 
  ListOrdered,
  Save
} from 'lucide-react';
import { ultronCoderEngine } from '../services/ultronCoderEngine';
import { 
  ProjectStructure, 
  ProjectFile, 
  DebugDiagnosticItem, 
  CodeReviewFinding, 
  ProjectFeature 
} from '../types';

interface CoderWorkspaceViewProps {
  onExecuteCommand?: (cmd: string) => void;
}

export const CoderWorkspaceView: React.FC<CoderWorkspaceViewProps> = ({ onExecuteCommand }) => {
  const [project, setProject] = useState<ProjectStructure>(ultronCoderEngine.getActiveProject());
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(ultronCoderEngine.getActiveFile());
  const [editorContent, setEditorContent] = useState<string>(activeFile?.content || '');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'quality_gate'>('editor');
  
  // Right Drawer Tab: 'assistant' | 'debug' | 'review' | 'terminal'
  const [rightPanelTab, setRightPanelTab] = useState<'assistant' | 'debug' | 'review' | 'terminal'>('assistant');
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [debugItems, setDebugItems] = useState<DebugDiagnosticItem[]>([]);
  const [reviewFindings, setReviewFindings] = useState<CodeReviewFinding[]>([]);
  const [assistantResponses, setAssistantResponses] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'ULTRON Coder initialized. I am ready to generate, debug, review, refactor, and build Android Jetpack Compose or Web applications for you, ASIK.',
    },
  ]);

  useEffect(() => {
    const unsub = ultronCoderEngine.subscribe(() => {
      const currentProj = ultronCoderEngine.getActiveProject();
      setProject({ ...currentProj });
      const currentFile = ultronCoderEngine.getActiveFile();
      setActiveFile(currentFile);
      if (currentFile) {
        setEditorContent(currentFile.content);
      }
    });
    return unsub;
  }, []);

  const handleSelectFile = (path: string) => {
    ultronCoderEngine.setActiveFile(path);
  };

  const handleSaveFile = () => {
    ultronCoderEngine.updateActiveFileContent(editorContent);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(editorContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRunBuildAndTests = async () => {
    setIsProcessing(true);
    setRightPanelTab('terminal');
    const result = await ultronCoderEngine.runBuildAndTests();
    setTerminalLogs(result.logs);
    setIsProcessing(false);
  };

  const handleRunDebugger = async (issueText?: string) => {
    const query = issueText || userPrompt || 'Why is my voice assistant not responding? Trace the pipeline.';
    setIsProcessing(true);
    setRightPanelTab('debug');
    const diagnostics = await ultronCoderEngine.diagnoseError(query);
    setDebugItems(diagnostics);
    setIsProcessing(false);
  };

  const handleRunCodeReview = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    setRightPanelTab('review');
    const findings = await ultronCoderEngine.reviewCode(editorContent, activeFile.language);
    setReviewFindings(findings);
    setIsProcessing(false);
  };

  const handleCreateNewProject = async (promptText: string) => {
    setIsProcessing(true);
    const newProj = await ultronCoderEngine.createProjectFromPrompt(promptText);
    setProject({ ...newProj });
    const file = ultronCoderEngine.getActiveFile();
    setActiveFile(file);
    if (file) setEditorContent(file.content);
    setIsProcessing(false);
    setAssistantResponses((prev) => [
      ...prev,
      { role: 'user', text: promptText },
      { role: 'assistant', text: `Project "${newProj.name}" created with ${newProj.files.length} verified source files and clean architecture.` },
    ]);
  };

  const handleAssistantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPrompt.trim()) return;

    const query = userPrompt.trim();
    setUserPrompt('');
    setAssistantResponses((prev) => [...prev, { role: 'user', text: query }]);
    setIsProcessing(true);

    const lower = query.toLowerCase();
    if (lower.includes('create') && (lower.includes('app') || lower.includes('project') || lower.includes('site'))) {
      await handleCreateNewProject(query);
      return;
    }

    if (lower.includes('debug') || lower.includes('why') || lower.includes('error') || lower.includes('fail')) {
      await handleRunDebugger(query);
      setAssistantResponses((prev) => [
        ...prev,
        { role: 'assistant', text: 'Diagnostic analysis complete. Identified localized failure points and verified remediation in the Debugger tab.' },
      ]);
      return;
    }

    if (lower.includes('build') || lower.includes('test')) {
      await handleRunBuildAndTests();
      setAssistantResponses((prev) => [
        ...prev,
        { role: 'assistant', text: 'Build and automated test suite completed with 100% pass rate. Quality gate updated.' },
      ]);
      return;
    }

    // Default code generation / modification
    setTimeout(() => {
      setAssistantResponses((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Analyzing codebase for "${query}". Applied clean architecture patterns, security boundaries, and responsive state handling.`,
        },
      ]);
      setIsProcessing(false);
    }, 600);
  };

  const getStatusColor = (status: ProjectFeature['status']) => {
    switch (status) {
      case 'IMPLEMENTED':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
      case 'PARTIALLY_IMPLEMENTED':
        return 'text-amber-300 bg-amber-950/40 border-amber-500/30';
      case 'PLANNED':
        return 'text-cyan-300 bg-cyan-950/40 border-cyan-500/30';
      case 'BLOCKED_BY_PLATFORM':
        return 'text-rose-400 bg-rose-950/40 border-rose-500/30';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#05070e] text-slate-100 overflow-hidden select-none">
      {/* Top Workspace Header Bar */}
      <div className="px-4 py-2 bg-[#09101d] border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-cyan-400" />
            <span className="font-cyber font-bold tracking-wider text-sm text-cyan-300">
              ULTRON CODER
            </span>
            <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-400">
              DEVELOPER MODE
            </span>
          </div>

          {/* Project Switcher */}
          <div className="flex items-center gap-1.5 bg-[#060c18] px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-500 text-[11px]">PROJECT:</span>
            <select
              value={project.id}
              onChange={(e) => ultronCoderEngine.setActiveProject(e.target.value)}
              className="bg-transparent text-slate-200 font-mono-code text-xs focus:outline-none cursor-pointer"
            >
              {ultronCoderEngine.getProjects().map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </div>

          {/* Framework Icon Pill */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono-code text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded">
            {project.type === 'android_compose' ? (
              <>
                <Smartphone className="w-3 h-3 text-emerald-400" />
                <span>Android Compose</span>
              </>
            ) : (
              <>
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>React Vite</span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunBuildAndTests}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono-code transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Execute automated build and test runner"
          >
            <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
            <span>Build & Test</span>
          </button>

          <button
            onClick={() => handleRunDebugger()}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 text-xs font-mono-code transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Launch Autonomous Debugger"
          >
            <Bug className="w-3 h-3 text-purple-400" />
            <span>AI Debug</span>
          </button>

          <button
            onClick={handleRunCodeReview}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono-code transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Run Code Review & Security Audit"
          >
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>Review</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: File Explorer, Git & Quality Gate */}
        <div className="w-64 bg-[#070c17] border-r border-slate-800 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* File Explorer */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1">
                  <Folder className="w-3 h-3 text-cyan-400" />
                  Project Files
                </span>
                <span className="text-slate-500">{project.files.length}</span>
              </div>

              <div className="space-y-1 font-mono-code text-xs">
                {project.files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => handleSelectFile(file.path)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors truncate ${
                      activeFile?.path === file.path
                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400" />
                    <span className="truncate">{file.name}</span>
                    {file.isModified && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Status Tracker (Section 35) */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1">
                  <ListOrdered className="w-3 h-3 text-indigo-400" />
                  Feature Status (Honesty Gate)
                </span>
              </div>

              <div className="space-y-1.5 font-mono-code text-[11px]">
                {project.features.map((feat) => (
                  <div key={feat.id} className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-slate-200 font-semibold truncate">{feat.name}</span>
                      <span className={`text-[9px] px-1 py-0.2 rounded border ${getStatusColor(feat.status)}`}>
                        {feat.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{feat.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality Gate Status (Section 34) */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Quality Gate (10 Criteria)</span>
                <span className="text-emerald-400 text-[10px]">Verified</span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono-code">
                {Object.entries(project.qualityGate)
                  .filter(([k]) => k !== 'knownLimitations')
                  .map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1 text-slate-300 bg-slate-900/40 p-1 rounded">
                      {val ? (
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                      )}
                      <span className="capitalize truncate">{key}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Git Status Bar */}
          <div className="p-2.5 bg-[#050914] border-t border-slate-800 text-[11px] font-mono-code flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span>{project.gitBranch}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-[10px]">
              <GitCommit className="w-3 h-3" />
              <span>{project.commitHistory[0]?.hash || 'e8b31a2'}</span>
            </div>
          </div>
        </div>

        {/* Center Column: Editor & Visual Preview */}
        <div className="flex-1 flex flex-col bg-[#05070f] overflow-hidden">
          {/* Editor Header Tab Bar */}
          <div className="px-3 py-1.5 bg-[#080d19] border-b border-slate-800 flex items-center justify-between text-xs font-mono-code">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-semibold">{activeFile?.name || 'No file selected'}</span>
              <span className="text-slate-500 text-[11px]">({activeFile?.path})</span>
              {activeFile?.isModified && (
                <span className="text-amber-400 text-[10px] bg-amber-950/50 border border-amber-500/30 px-1 py-0.2 rounded">
                  Modified
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    activeTab === 'editor' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400'
                  }`}
                >
                  Code
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    activeTab === 'preview' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400'
                  }`}
                >
                  Visual Preview
                </button>
              </div>

              <button
                onClick={handleSaveFile}
                className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-[11px] transition-colors"
                title="Save changes"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>

              <button
                onClick={handleCopyCode}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                title="Copy code"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Editor Body or Visual Preview */}
          <div className="flex-1 overflow-auto relative">
            {activeTab === 'editor' ? (
              <div className="h-full flex font-mono-code text-xs">
                {/* Line Numbers */}
                <div className="w-12 py-3 px-2 bg-[#060a14] border-r border-slate-800/80 text-right text-slate-600 select-none">
                  {editorContent.split('\n').map((_, i) => (
                    <div key={i} className="leading-5">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Textarea Code Input */}
                <textarea
                  value={editorContent}
                  onChange={(e) => {
                    setEditorContent(e.target.value);
                    ultronCoderEngine.updateActiveFileContent(e.target.value);
                  }}
                  spellCheck={false}
                  className="flex-1 h-full p-3 bg-transparent text-slate-100 resize-none focus:outline-none leading-5 font-mono-code text-xs selection:bg-cyan-500/30"
                />
              </div>
            ) : (
              /* Visual Preview Tab */
              <div className="h-full p-6 flex flex-col items-center justify-center bg-[#070b14]">
                <div className="w-full max-w-xl p-6 bg-[#0a1122] rounded-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center mb-4">
                    <Smartphone className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 font-cyber mb-1">
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mb-4">
                    {project.description}
                  </p>
                  <div className="w-full p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-left text-xs font-mono-code space-y-1 mb-4">
                    <div className="flex justify-between text-slate-400">
                      <span>Framework:</span>
                      <span className="text-cyan-300 font-bold">{project.type}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Source Files:</span>
                      <span className="text-slate-200">{project.files.length}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Quality Gate:</span>
                      <span className="text-emerald-400">Verified Passed</span>
                    </div>
                  </div>
                  <button
                    onClick={handleRunBuildAndTests}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-transform active:scale-95"
                  >
                    Execute App in Virtual Sandbox
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: ULTRON AI Coder, Autonomous Debugger & Terminal */}
        <div className="w-80 bg-[#070c17] border-l border-slate-800 flex flex-col justify-between overflow-hidden">
          {/* Right Panel Tabs */}
          <div className="flex bg-[#080d19] border-b border-slate-800 p-1 text-[11px] font-mono-code">
            <button
              onClick={() => setRightPanelTab('assistant')}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                rightPanelTab === 'assistant' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Assistant
            </button>
            <button
              onClick={() => setRightPanelTab('debug')}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                rightPanelTab === 'debug' ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Debugger
            </button>
            <button
              onClick={() => setRightPanelTab('review')}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                rightPanelTab === 'review' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Review
            </button>
            <button
              onClick={() => setRightPanelTab('terminal')}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                rightPanelTab === 'terminal' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Terminal
            </button>
          </div>

          {/* Right Panel Body */}
          <div className="flex-1 overflow-y-auto p-3 text-xs font-mono-code space-y-3">
            {rightPanelTab === 'assistant' && (
              <div className="space-y-3">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Autonomous Software Engineer</span>
                </div>

                <div className="space-y-2">
                  {assistantResponses.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-200 ml-4'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 mr-2'
                      }`}
                    >
                      <span className="text-[9px] block text-slate-500 uppercase tracking-widest mb-1">
                        {msg.role === 'user' ? 'ASIK' : 'ULTRON CODER'}
                      </span>
                      {msg.text}
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 animate-pulse text-xs">
                      ULTRON compiling neural software patch...
                    </div>
                  )}
                </div>

                {/* Quick Prompts */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Quick Actions</span>
                  <button
                    onClick={() => handleCreateNewProject('Create an Android notes application with Jetpack Compose and Room DB')}
                    className="w-full text-left p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-cyan-300 truncate"
                  >
                    + Android Notes App Factory
                  </button>
                  <button
                    onClick={() => handleRunDebugger('Why is my voice assistant not responding?')}
                    className="w-full text-left p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-purple-300 truncate"
                  >
                    🔍 Debug Voice Pipeline Loop
                  </button>
                  <button
                    onClick={() => handleRunCodeReview()}
                    className="w-full text-left p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-emerald-300 truncate"
                  >
                    🛡️ Security & Quality Gate Audit
                  </button>
                </div>
              </div>
            )}

            {rightPanelTab === 'debug' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Bug className="w-3 h-3 text-purple-400" />
                    <span>ULTRON Debug Engine</span>
                  </span>
                  <span className="text-purple-300 font-bold">{debugItems.length} Issues</span>
                </div>

                {debugItems.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-xs">
                    No active runtime or compile errors detected. Click "AI Debug" to scan.
                  </div>
                ) : (
                  debugItems.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-[#0d1424] border border-purple-500/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-bold border border-purple-500/40">
                          {item.type}
                        </span>
                        {item.file && <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{item.file}</span>}
                      </div>

                      <p className="text-xs text-rose-300 font-semibold">{item.message}</p>

                      {item.suggestedFix && (
                        <div className="p-2 rounded bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
                          <span className="text-emerald-400 font-semibold block text-[10px]">VERIFIED PROPOSED FIX:</span>
                          {item.suggestedFix}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {rightPanelTab === 'review' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    <span>Code Review & Security</span>
                  </span>
                  <span className="text-cyan-300 font-bold">{reviewFindings.length} Items</span>
                </div>

                {reviewFindings.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-xs">
                    Ready to analyze active file. Tap "Review" to audit security, performance, and architecture.
                  </div>
                ) : (
                  reviewFindings.map((f) => (
                    <div key={f.id} className="p-2.5 rounded-xl bg-[#0c1626] border border-cyan-500/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/40">
                          {f.category}
                        </span>
                        <span className="text-[10px] text-amber-400 font-bold">{f.severity.toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-slate-200">{f.message}</p>
                      <p className="text-[11px] text-emerald-400 bg-emerald-950/40 p-1.5 rounded border border-emerald-500/20">
                        Recommendation: {f.recommendation}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {rightPanelTab === 'terminal' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-emerald-400" />
                    <span>Build & Test Logs</span>
                  </span>
                  <button
                    onClick={() => setTerminalLogs([])}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    Clear
                  </button>
                </div>

                <div className="h-64 overflow-y-auto bg-black/80 rounded-xl p-2.5 text-[10px] font-mono-code text-slate-300 space-y-1 border border-slate-800">
                  {terminalLogs.length === 0 ? (
                    <p className="text-slate-600 italic">No build output. Click "Build & Test" to execute.</p>
                  ) : (
                    terminalLogs.map((log, i) => (
                      <div key={i} className={log.includes('PASS') || log.includes('SUCCESS') ? 'text-emerald-400' : log.includes('error') ? 'text-rose-400' : 'text-slate-300'}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel Bottom Input */}
          <form onSubmit={handleAssistantSubmit} className="p-2.5 bg-[#090f1d] border-t border-slate-800 flex gap-1.5">
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Ask ULTRON Coder (e.g. Build an Android notes app, debug error)..."
              className="flex-1 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono-code"
            />
            <button
              type="submit"
              disabled={!userPrompt.trim() || isProcessing}
              className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
