import React from 'react';
import { Eye, Volume2, MousePointer, X, CheckCircle, ShieldCheck } from 'lucide-react';
import { ScreenElement } from '../types';

interface ScreenReaderModalProps {
  isOpen: boolean;
  elements: ScreenElement[];
  onClose: () => void;
  onReadAloud: () => void;
  onTapElement: (element: ScreenElement) => void;
}

export const ScreenReaderModal: React.FC<ScreenReaderModalProps> = ({
  isOpen,
  elements,
  onClose,
  onReadAloud,
  onTapElement,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-[#090f1d] border border-cyan-500/40 rounded-3xl p-5 max-w-xl w-full max-h-[85vh] flex flex-col hologram-glow">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-950 pb-3 mb-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Eye className="w-5 h-5" />
            <div>
              <h3 className="font-cyber font-bold text-white text-base">
                ANDROID ACCESSIBILITY SCREEN INSPECTOR
              </h3>
              <p className="text-[11px] font-mono-code text-slate-400">
                Active Viewport Inspection & Screen Understanding Layer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read aloud action bar */}
        <div className="flex items-center justify-between bg-[#040710] p-2.5 rounded-xl border border-cyan-500/20 mb-3">
          <span className="text-xs font-mono-code text-slate-300">
            Detected <strong className="text-cyan-400">{elements.length} accessible UI nodes</strong> on current screen.
          </span>
          <button
            onClick={onReadAloud}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono-code font-bold text-xs transition-all"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Read Screen Aloud</span>
          </button>
        </div>

        {/* Elements list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {elements.map((el) => (
            <div
              key={el.id}
              className="bg-[#0b1222] border border-slate-800 hover:border-cyan-500/40 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs font-mono-code transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
                    {el.type.toUpperCase()}
                  </span>
                  <span className="font-semibold text-slate-200">
                    {el.label}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  "{el.text}"
                </p>
              </div>

              {el.action && (
                <button
                  onClick={() => onTapElement(el)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 text-[11px] transition-colors"
                >
                  <MousePointer className="w-3 h-3" />
                  <span>Tap Node</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-cyan-950 flex items-center justify-between text-[11px] font-mono-code text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Android Accessibility Service Permitted</span>
          </span>
          <span>Privacy Hardened</span>
        </div>
      </div>
    </div>
  );
};
