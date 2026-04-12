"use client";

import { useRef, useEffect } from "react";

// Beautiful flowing orb using Canvas — inspired by Siri/Doubao style
export default function MomoOrb({ size = 80, speaking = false }: { size?: number; speaking?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = size * 1.5;
    canvas.width = w * dpr;
    canvas.height = w * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${w}px`;
    ctx.scale(dpr, dpr);

    const cx = w / 2, cy = w / 2;
    const baseR = size * 0.34;
    let t = 0;
    let animId: number;

    const colors = [
      [255, 107, 107],  // coral
      [255, 154, 92],   // orange
      [255, 208, 107],  // amber
      [255, 126, 179],  // pink
      [180, 120, 255],  // lavender
    ];

    function draw() {
      t += speakingRef.current ? 0.04 : 0.008;
      ctx.clearRect(0, 0, w, w);

      // Outer glow
      const glowR = baseR * (1.6 + 0.15 * Math.sin(t * 1.5));
      const glow = ctx.createRadialGradient(cx, cy, baseR * 0.5, cx, cy, glowR);
      glow.addColorStop(0, "rgba(255,140,100,0.15)");
      glow.addColorStop(0.5, "rgba(255,180,120,0.06)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, w);

      // Draw blob shape with noise
      const points = 120;
      const speaking = speakingRef.current;
      const noiseAmp = speaking ? baseR * 0.14 : baseR * 0.04;
      const noiseSpeed = speaking ? 3 : 1;

      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        // Multiple sine waves for organic shape
        const n1 = Math.sin(angle * 3 + t * noiseSpeed) * noiseAmp;
        const n2 = Math.sin(angle * 5 - t * noiseSpeed * 0.7) * noiseAmp * 0.5;
        const n3 = Math.sin(angle * 7 + t * noiseSpeed * 1.3) * noiseAmp * 0.3;
        const breathe = Math.sin(t * 0.8) * baseR * 0.025;
        const r = baseR + n1 + n2 + n3 + breathe;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Gradient fill — rotates over time
      const gradAngle = t * 0.3;
      const gx1 = cx + Math.cos(gradAngle) * baseR;
      const gy1 = cy + Math.sin(gradAngle) * baseR;
      const gx2 = cx - Math.cos(gradAngle) * baseR;
      const gy2 = cy - Math.sin(gradAngle) * baseR;
      const grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
      const ci = Math.floor(t * 0.5) % colors.length;
      for (let i = 0; i < 3; i++) {
        const c = colors[(ci + i) % colors.length];
        grad.addColorStop(i * 0.5, `rgba(${c[0]},${c[1]},${c[2]},1)`);
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner highlight
      const hlGrad = ctx.createRadialGradient(cx - baseR * 0.25, cy - baseR * 0.3, 0, cx, cy, baseR);
      hlGrad.addColorStop(0, "rgba(255,255,255,0.45)");
      hlGrad.addColorStop(0.4, "rgba(255,255,255,0.1)");
      hlGrad.addColorStop(1, "transparent");
      ctx.fillStyle = hlGrad;
      ctx.fill();

      // Shadow below
      const shadowGrad = ctx.createRadialGradient(cx, cy + baseR * 0.8, 0, cx, cy + baseR * 1.2, baseR * 0.6);
      shadowGrad.addColorStop(0, "rgba(255,120,100,0.12)");
      shadowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(0, 0, w, w);

      // "M" letter
      ctx.save();
      ctx.font = `bold ${baseR * 0.7}px -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.shadowColor = "rgba(0,0,0,0.15)";
      ctx.shadowBlur = 4;
      ctx.fillText("M", cx, cy + 1);
      ctx.restore();

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, [size]);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

// Small avatar for chat — CSS version for performance (many instances)
export function MomoOrbSmall({ speaking = false }: { speaking?: boolean }) {
  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center relative overflow-hidden"
      style={{
        width: 34, height: 34,
        background: "linear-gradient(135deg, #FF6B6B, #FF9A5C, #FFD06B, #FF7EB3)",
        boxShadow: "0 2px 8px rgba(255,107,107,0.25)",
        animation: speaking ? "momo-sm-speak 0.8s ease-in-out infinite" : undefined,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.2) 25%, transparent 50%)",
          animation: "momo-sm-rotate 5s linear infinite",
        }}
      />
      <span className="relative z-10 text-white font-bold text-xs" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>M</span>
    </div>
  );
}
