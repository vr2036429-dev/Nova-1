import React from 'react';
import { AlertTriangle, Check, X, Phone, Trash2, Send } from 'lucide-react';
import { ConfirmationRequest } from '../types';

interface ConfirmationModalProps {
  request: ConfirmationRequest | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  request,
  onConfirm,
  onCancel,
}) => {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-[#0a101f] border border-amber-500/40 rounded-3xl p-6 max-w-md w-full relative hologram-glow-amber">
        <div className="flex items-center gap-2 text-amber-400 mb-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="font-cyber font-bold tracking-widest text-xs uppercase">
            SENSITIVE OPERATION AUTHORIZATION (LEVEL 2)
          </span>
        </div>

        <h3 className="font-cyber font-bold text-white text-lg mb-1">
          {request.title}
        </h3>
        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          {request.description}
        </p>

        {/* Parameters verification card */}
        {request.params && Object.keys(request.params).length > 0 && (
          <div className="bg-[#050810] border border-amber-500/20 rounded-xl p-3 mb-5 text-xs font-mono-code space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">
              Parameters to execute:
            </span>
            {Object.entries(request.params).map(([k, v]) => (
              <div key={k} className="flex justify-between text-slate-300">
                <span className="text-slate-400">{k}:</span>
                <span className="text-amber-300 font-semibold">{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-mono-code text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Abort Action</span>
          </button>

          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono-code font-bold text-xs transition-all shadow-[0_0_16px_rgba(245,158,11,0.4)] flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Authorize & Execute</span>
          </button>
        </div>
      </div>
    </div>
  );
};
