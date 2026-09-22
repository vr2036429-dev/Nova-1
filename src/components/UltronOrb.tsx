import React, { useEffect, useRef } from 'react';
import { UltronState } from '../types';
import { voiceService } from '../services/voiceService';
import { liveVoiceSession } from '../services/liveVoiceSession';

interface UltronOrbProps {
  state: UltronState;
  onClick?: () => void;
  size?: number;
}

export const UltronOrb: React.FC<UltronOrbProps> = ({ state, onClick, size = 320 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const rotationRef = useRef<number>(0);
  const pulsePhaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Array<{
      x: number;
      y: number;
      radius: number;
      angle: number;
      speed: number;
      dist: number;
      alpha: number;
    }> = [];

    // Initialize orbital particles
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: 0,
        y: 0,
        radius: Math.random() * 2 + 1,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        dist: Math.random() * 80 + 35,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      rotationRef.current += 0.015;
      pulsePhaseRef.current += 0.035;

      // Read audio frequency data from active voice engine
      const liveFreq = liveVoiceSession.getAudioFrequencyData();
      const legacyFreq = voiceService.getAudioFrequencyData();
      
      let avgFreq = 0;
      let hasLiveAudio = false;
      for (let i = 0; i < Math.min(liveFreq.length, 32); i++) {
        if (liveFreq[i] > 0) hasLiveAudio = true;
        avgFreq += liveFreq[i];
      }
      if (!hasLiveAudio) {
        avgFreq = 0;
        for (let i = 0; i < Math.min(legacyFreq.length, 32); i++) {
          avgFreq += legacyFreq[i];
        }
      }
      avgFreq = avgFreq / 32; // 0 to 255
      const freqData = hasLiveAudio ? liveFreq : legacyFreq;

      // Base radius modulation - react dynamically to microphone or assistant audio
      const isVoiceActive = state === 'LISTENING' || state === 'USER_SPEAKING' || state === 'SPEAKING' || state === 'AI_SPEAKING';
      const audioScale = isVoiceActive
        ? (avgFreq / 255) * 52 
        : Math.sin(pulsePhaseRef.current) * 6;
      
      const coreRadius = Math.max(38, 52 + audioScale);

      // Color scheme based on state
      let primaryColor = '#06b6d4'; // Cyan
      let secondaryColor = '#0284c7'; // Sky
      let glowColor = 'rgba(6, 182, 212, 0.4)';
      let ringSpeed = 1;

      if (state === 'LISTENING') {
        primaryColor = '#22d3ee'; // Bright cyan
        secondaryColor = '#06b6d4';
        glowColor = 'rgba(34, 211, 238, 0.65)';
        ringSpeed = 2.2;
      } else if (state === 'USER_SPEAKING') {
        primaryColor = '#38bdf8'; // Electric Sky Blue
        secondaryColor = '#0284c7';
        glowColor = 'rgba(56, 189, 248, 0.8)';
        ringSpeed = 3.2;
      } else if (state === 'THINKING' || state === 'PROCESSING') {
        primaryColor = '#a855f7'; // Purple / Violet
        secondaryColor = '#3b82f6'; // Blue
        glowColor = 'rgba(168, 85, 247, 0.7)';
        ringSpeed = 3.8;
      } else if (state === 'SEARCHING') {
        primaryColor = '#f59e0b'; // Amber Gold
        secondaryColor = '#ef4444'; // Reddish gold
        glowColor = 'rgba(245, 158, 11, 0.6)';
        ringSpeed = 2.8;
      } else if (state === 'EXECUTING') {
        primaryColor = '#3b82f6'; // Electric Cobalt
        secondaryColor = '#06b6d4';
        glowColor = 'rgba(59, 130, 246, 0.65)';
        ringSpeed = 3.0;
      } else if (state === 'SPEAKING' || state === 'AI_SPEAKING') {
        primaryColor = '#10b981'; // Emerald Cyan
        secondaryColor = '#06b6d4';
        glowColor = 'rgba(16, 185, 129, 0.75)';
        ringSpeed = 2.0;
      } else if (state === 'INTERRUPTED') {
        primaryColor = '#fbbf24'; // Amber Yellow (Barge-in reaction)
        secondaryColor = '#f97316';
        glowColor = 'rgba(251, 191, 36, 0.85)';
        ringSpeed = 4.5;
      } else if (state === 'RECONNECTING') {
        primaryColor = '#f59e0b'; // Amber Pulse
        secondaryColor = '#3b82f6';
        glowColor = 'rgba(245, 158, 11, 0.5)';
        ringSpeed = 2.0;
      } else if (state === 'ERROR') {
        primaryColor = '#ef4444'; // Crimson Red
        secondaryColor = '#b91c1c';
        glowColor = 'rgba(239, 68, 68, 0.7)';
        ringSpeed = 0.8;
      } else if (state === 'IDLE' || state === 'STOPPED') {
        primaryColor = '#0284c7';
        secondaryColor = '#0f172a';
        glowColor = 'rgba(2, 132, 199, 0.25)';
        ringSpeed = 0.6;
      }

      // 1. Outermost Ambient Glow
      const ambientGrad = ctx.createRadialGradient(centerX, centerY, coreRadius * 0.4, centerX, centerY, coreRadius * 2.4);
      ambientGrad.addColorStop(0, glowColor);
      ambientGrad.addColorStop(0.6, 'rgba(6, 182, 212, 0.05)');
      ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // 2. Outer Segmented Reactor Ring (Rotates Clockwise)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRef.current * ringSpeed);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = primaryColor;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 14;

      const segments = 12;
      const ringOuterRadius = coreRadius + 44;
      for (let i = 0; i < segments; i++) {
        const startAngle = (i * (Math.PI * 2)) / segments;
        const endAngle = startAngle + (Math.PI * 2) / (segments * 1.6);
        ctx.beginPath();
        ctx.arc(0, 0, ringOuterRadius, startAngle, endAngle);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Middle Counter-Rotating Ring (Rotates Counter-Clockwise)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-rotationRef.current * ringSpeed * 1.3);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = secondaryColor;
      ctx.shadowColor = secondaryColor;
      ctx.shadowBlur = 10;

      const midSegments = 8;
      const ringMidRadius = coreRadius + 24;
      for (let i = 0; i < midSegments; i++) {
        const start = (i * (Math.PI * 2)) / midSegments;
        const end = start + (Math.PI * 2) / (midSegments * 2);
        ctx.beginPath();
        ctx.arc(0, 0, ringMidRadius, start, end);
        ctx.stroke();

        // Little HUD tick marks
        const tickX = Math.cos(start) * (ringMidRadius + 6);
        const tickY = Math.sin(start) * (ringMidRadius + 6);
        ctx.fillStyle = primaryColor;
        ctx.fillRect(tickX - 1.5, tickY - 1.5, 3, 3);
      }
      ctx.restore();

      // 4. Acoustic Waveform Rings during Listening or Speaking
      if (state === 'LISTENING' || state === 'SPEAKING') {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `${primaryColor}99`;
        ctx.beginPath();
        const wavePoints = 48;
        for (let i = 0; i <= wavePoints; i++) {
          const theta = (i / wavePoints) * Math.PI * 2;
          const freqIndex = i % Math.min(freqData.length, 32);
          const sample = freqData[freqIndex] ? freqData[freqIndex] / 255 : Math.sin(pulsePhaseRef.current * 4 + i) * 0.4;
          const r = coreRadius + 14 + sample * 22;
          const px = Math.cos(theta) * r;
          const py = Math.sin(theta) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // 5. Particles Swarm
      ctx.save();
      ctx.translate(centerX, centerY);
      particles.forEach((p) => {
        p.angle += p.speed * ringSpeed;
        const currentDist = p.dist + Math.sin(pulsePhaseRef.current + p.angle) * 8;
        const px = Math.cos(p.angle) * currentDist;
        const py = Math.sin(p.angle) * currentDist;
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // 6. Central Arc Reactor Core
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, coreRadius);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.25, primaryColor);
      coreGrad.addColorStop(0.85, secondaryColor);
      coreGrad.addColorStop(1, '#05070e');

      ctx.fillStyle = coreGrad;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // 7. Core Inner Reticle / Triangle / Geometric Jarvis Accent
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRef.current * 0.5);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius * 0.42, 0, Math.PI * 2);
      ctx.stroke();

      // Center glowing dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, size]);

  return (
    <div 
      className="relative flex items-center justify-center cursor-pointer select-none group"
      onClick={onClick}
      style={{ width: size, height: size }}
      title="Click to toggle ULTRON voice listening"
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="transition-transform duration-500 group-hover:scale-105 active:scale-95"
      />

      {/* Holographic Radar Rings overlay */}
      <div className="absolute inset-0 pointer-events-none rounded-full border border-cyan-500/10 scale-110 animate-pulse" />
      <div className="absolute inset-0 pointer-events-none rounded-full border border-cyan-400/5 scale-125" />
    </div>
  );
};
