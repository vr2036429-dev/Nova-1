import React, { useState } from 'react';
import { 
  Wrench, 
  Smartphone, 
  Settings as SettingsIcon, 
  Flashlight, 
  Vibrate, 
  Eye, 
  FileText, 
  Bell, 
  PhoneCall, 
  Battery, 
  Lock, 
  Globe, 
  Search, 
  ExternalLink,
  Plus,
  Play
} from 'lucide-react';
import { StoredFile, StoredNotification, DeviceStatus } from '../types';
import { toolRegistry } from '../services/toolRegistry';

interface ToolsViewProps {
  files: StoredFile[];
  notifications: StoredNotification[];
  deviceStatus: DeviceStatus;
  onOpenApp: (appName: string) => void;
  onOpenSettings: (section: string) => void;
  onInspectScreen: () => void;
  onToggleTorch: () => void;
  onTriggerVibration: () => void;
  onCheckBattery: () => void;
  onMakeCall: (name: string, phone: string) => void;
  onTriggerWebSearch: (query: string) => void;
}

export const ToolsView: React.FC<ToolsViewProps> = ({
  files,
  notifications,
  deviceStatus,
  onOpenApp,
  onOpenSettings,
  onInspectScreen,
  onToggleTorch,
  onTriggerVibration,
  onCheckBattery,
  onMakeCall,
  onTriggerWebSearch,
}) => {
  const [activeSection, setActiveSection] = useState<'apps' | 'hardware' | 'files' | 'notifications'>('apps');
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [showCreateFile, setShowCreateFile] = useState(false);

  const androidApps = [
    { name: 'YouTube', color: 'bg-red-500/20 text-red-400 border-red-500/30', desc: 'Media streaming & video search' },
    { name: 'Chrome', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', desc: 'Web browsing & search' },
    { name: 'Spotify', color: 'bg-green-500/20 text-green-400 border-green-500/30', desc: 'Music playback & ambient sounds' },
    { name: 'WhatsApp', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', desc: 'Secure communication' },
    { name: 'Settings', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', desc: 'Android system configurations' },
    { name: 'Camera', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', desc: 'Live optical vision' },
    { name: 'Google Maps', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', desc: 'Navigation & location coordinates' },
    { name: 'Calculator', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', desc: 'Mathematical engine' },
  ];

  const settingsPanels = [
    { id: 'wifi', label: 'Wi-Fi & Networks' },
    { id: 'bluetooth', label: 'Bluetooth Devices' },
    { id: 'battery', label: 'Battery Optimization' },
    { id: 'display', label: 'Display & Night Light' },
    { id: 'accessibility', label: 'Accessibility Services' },
    { id: 'permissions', label: 'Permission Manager' },
  ];

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    toolRegistry.executeTool({
      id: `call_${Date.now()}`,
      name: 'fileOperation',
      args: {
        operation: 'create',
        fileName: newFileName.trim(),
        content: newFileContent.trim() || 'Created via ULTRON tool manager.',
      },
    }, {});
    setNewFileName('');
    setNewFileContent('');
    setShowCreateFile(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full space-y-5">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-cyan-950/60 pb-2">
        <button
          onClick={() => setActiveSection('apps')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono-code transition-all ${
            activeSection === 'apps'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Android Apps & Settings</span>
        </button>

        <button
          onClick={() => setActiveSection('hardware')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono-code transition-all ${
            activeSection === 'hardware'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Hardware & Diagnostics</span>
        </button>

        <button
          onClick={() => setActiveSection('files')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono-code transition-all ${
            activeSection === 'files'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Scoped Storage ({files.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('notifications')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono-code transition-all ${
            activeSection === 'notifications'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notifications ({notifications.length})</span>
        </button>
      </div>

      {/* SECTION 1: APPS & SETTINGS */}
      {activeSection === 'apps' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-mono-code text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>Supported Android Applications (Voice-Launchable)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {androidApps.map((app) => (
                <div
                  key={app.name}
                  onClick={() => onOpenApp(app.name)}
                  className="bg-[#0b1222]/80 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3.5 cursor-pointer transition-all active:scale-95 group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded-md border ${app.color}`}>
                      INTENT
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
                  </div>
                  <h4 className="font-semibold text-slate-100 text-sm group-hover:text-cyan-300">
                    {app.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {app.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-mono-code text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-cyan-400" />
              <span>Android Settings Hub</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {settingsPanels.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => onOpenSettings(sp.id)}
                  className="flex items-center justify-between p-3 bg-[#0d1629]/70 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left text-xs font-mono-code text-slate-200 transition-all active:scale-95"
                >
                  <span>{sp.label}</span>
                  <Play className="w-3 h-3 text-cyan-400 opacity-60" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: HARDWARE & DIAGNOSTICS */}
      {activeSection === 'hardware' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Flashlight / Torch */}
          <div className="bg-[#0b1222]/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <Flashlight className="w-5 h-5" />
                  <h4 className="font-cyber font-bold text-white text-sm">FLASH-TORCH ACTUATOR</h4>
                </div>
                <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded border ${
                  deviceStatus.torchOn ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {deviceStatus.torchOn ? 'ACTIVE' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 leading-relaxed">
                Toggles physical hardware torch via MediaStream camera constraints or high-intensity display white beam.
              </p>
            </div>
            <button
              onClick={onToggleTorch}
              className={`mt-4 w-full py-2 rounded-xl text-xs font-mono-code font-semibold transition-all ${
                deviceStatus.torchOn
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_16px_rgba(245,158,11,0.5)]'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {deviceStatus.torchOn ? 'Turn Flashlight OFF' : 'Turn Flashlight ON'}
            </button>
          </div>

          {/* Screen Accessibility Inspector */}
          <div className="bg-[#0b1222]/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Eye className="w-5 h-5" />
                  <h4 className="font-cyber font-bold text-white text-sm">SCREEN INTELLIGENCE</h4>
                </div>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  ACCESSIBILITY
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 leading-relaxed">
                Scans visible screen elements, extracts text, identifies buttons and form inputs, and reads content aloud.
              </p>
            </div>
            <button
              onClick={onInspectScreen}
              className="mt-4 w-full py-2 rounded-xl text-xs font-mono-code font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_14px_rgba(6,182,212,0.3)] transition-all"
            >
              Inspect & Read Active Screen
            </button>
          </div>

          {/* Haptic Vibration */}
          <div className="bg-[#0b1222]/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sky-400">
                  <Vibrate className="w-5 h-5" />
                  <h4 className="font-cyber font-bold text-white text-sm">HAPTIC MOTOR PULSE</h4>
                </div>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  NAVIGATOR.VIBRATE
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 leading-relaxed">
                Triggers hardware vibration pattern [100ms, 60ms, 100ms] for tactile confirmation feedback.
              </p>
            </div>
            <button
              onClick={onTriggerVibration}
              className="mt-4 w-full py-2 rounded-xl text-xs font-mono-code font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
            >
              Test Haptic Actuator
            </button>
          </div>

          {/* Battery Diagnostics */}
          <div className="bg-[#0b1222]/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Battery className="w-5 h-5" />
                  <h4 className="font-cyber font-bold text-white text-sm">POWER DIAGNOSTICS</h4>
                </div>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {(deviceStatus.batteryLevel * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 leading-relaxed">
                Reads real-time battery voltage, discharge cycles, and power charging state.
              </p>
            </div>
            <button
              onClick={onCheckBattery}
              className="mt-4 w-full py-2 rounded-xl text-xs font-mono-code font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
            >
              Run Power Diagnostics
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: SCOPED STORAGE & FILES */}
      {activeSection === 'files' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono-code text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Android Storage Access Framework (SAF)</span>
            </h3>
            <button
              onClick={() => setShowCreateFile(prev => !prev)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono-code transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Note</span>
            </button>
          </div>

          {showCreateFile && (
            <form onSubmit={handleCreateFileSubmit} className="bg-[#0c1424] border border-cyan-500/40 rounded-xl p-3 space-y-2">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Filename (e.g. jarvis_notes.txt)"
                className="w-full bg-[#060a14] border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono-code text-slate-100"
              />
              <textarea
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                placeholder="Document content..."
                rows={3}
                className="w-full bg-[#060a14] border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono-code text-slate-100"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFile(false)}
                  className="px-3 py-1 rounded-lg text-xs font-mono-code text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg text-xs font-mono-code bg-cyan-500 text-slate-950 font-semibold"
                >
                  Save File
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-[#0b1222]/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-100 text-xs truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <span className="text-[10px] font-mono-code text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30">
                      {file.size} B
                    </span>
                  </div>
                  <p className="text-[11px] font-mono-code text-slate-400 line-clamp-3 bg-[#060a14] p-2 rounded-lg border border-slate-900">
                    {file.content}
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-mono-code text-slate-500 flex justify-between">
                  <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
                  <span>{file.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: NOTIFICATIONS */}
      {activeSection === 'notifications' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono-code text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <span>Android Notification Feed</span>
            </h3>
            <span className="text-xs font-mono-code text-cyan-400">
              Notification Listener Active
            </span>
          </div>

          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="bg-[#0b1222]/80 border border-slate-800 hover:border-cyan-500/30 rounded-xl p-3 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyan-300">
                      {n.appName}
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-500">
                      {n.timestamp}
                    </span>
                  </div>
                  <h5 className="text-xs font-medium text-slate-200 mt-0.5">
                    {n.title}
                  </h5>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {n.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
