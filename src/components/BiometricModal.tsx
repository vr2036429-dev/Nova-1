import React, { useState, useEffect } from 'react';
import { Fingerprint, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { biometricService } from '../services/biometricService';

interface BiometricModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const BiometricModal: React.FC<BiometricModalProps> = ({
  isOpen,
  title,
  description,
  onSuccess,
  onCancel,
}) => {
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [message, setMessage] = useState('Touch sensor or place face in view to authenticate.');

  useEffect(() => {
    if (isOpen) {
      setStatus('SCANNING');
      setMessage('Hardware biometric sensor active. Verifying cryptographic key...');

      biometricService.authenticate(title).then((res) => {
        if (res.success) {
          setStatus('SUCCESS');
          setMessage(res.message);
          setTimeout(() => {
            onSuccess();
          }, 800);
        } else {
          setStatus('FAILED');
          setMessage(res.message || 'Biometric identity match failed.');
        }
      });
    } else {
      setStatus('IDLE');
    }
  }, [isOpen, title, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-[#090f1d] border border-cyan-500/40 rounded-3xl p-6 max-w-sm w-full relative hologram-glow text-center">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center gap-1.5 text-cyan-400 mb-2">
          <ShieldAlert className="w-5 h-5" />
          <span className="font-cyber font-bold tracking-widest text-xs uppercase">
            RESTRICTED SECURITY LEVEL 3
          </span>
        </div>

        <h3 className="font-cyber font-bold text-white text-lg mb-1">
          {title}
        </h3>
        <p className="text-xs font-mono-code text-slate-400 mb-6">
          {description}
        </p>

        {/* Biometric Scanner Visual */}
        <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full border-2 transition-all ${
            status === 'SUCCESS' 
              ? 'border-emerald-500 bg-emerald-500/10'
              : status === 'FAILED'
              ? 'border-red-500 bg-red-500/10'
              : 'border-cyan-500 animate-pulse bg-cyan-500/10'
          }`} />

          {status === 'SCANNING' && (
            <div className="absolute inset-x-2 h-0.5 bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-scanline" />
          )}

          {status === 'SUCCESS' ? (
            <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-scale" />
          ) : (
            <Fingerprint className={`w-14 h-14 transition-colors ${
              status === 'FAILED' ? 'text-red-400' : 'text-cyan-400'
            }`} />
          )}
        </div>

        <p className="text-xs font-mono-code text-cyan-300 min-h-[32px]">
          {message}
        </p>

        {status === 'FAILED' && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setStatus('SCANNING');
                biometricService.authenticate(title).then((res) => {
                  if (res.success) {
                    setStatus('SUCCESS');
                    setTimeout(onSuccess, 800);
                  }
                });
              }}
              className="flex-1 py-2 rounded-xl text-xs font-mono-code bg-cyan-500 text-slate-950 font-bold"
            >
              Retry Biometrics
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-mono-code bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
