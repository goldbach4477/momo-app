"use client";

export default function MomoOrb({ size = 72, speaking = false }: { size?: number; speaking?: boolean }) {
  const orbSize = Math.round(size * 0.7);
  return (
    <div className={`momo-orb-wrap ${speaking ? "speaking" : ""}`} style={{ width: size, height: size }}>
      <div className="momo-glow" />
      {speaking && (
        <>
          <div className="momo-ripple" />
          <div className="momo-ripple" />
          <div className="momo-ripple" />
        </>
      )}
      <div className="momo-orb" style={{ width: orbSize, height: orbSize }}>
        <span className="momo-letter" style={{ fontSize: orbSize * 0.36 }}>M</span>
      </div>
    </div>
  );
}

export function MomoOrbSmall({ speaking = false }: { speaking?: boolean }) {
  return (
    <div className={`momo-orb-sm ${speaking ? "speaking" : ""}`}>
      <span className="relative z-[2] text-white font-bold text-xs" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.15)" }}>M</span>
    </div>
  );
}
