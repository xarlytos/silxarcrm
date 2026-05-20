'use client';

export function GlobalStyles() {
  return (
    <style jsx global>{`
      .crm-confetti-piece {
        position: absolute;
        width: 8px;
        height: 12px;
        border-radius: 2px;
        pointer-events: none;
        transform: translate(-50%, -50%);
        animation: crm-confetti 1.1s ease-out forwards;
        z-index: 30;
      }
      @keyframes crm-confetti {
        0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.6); opacity: 1; }
        100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy) + 40px)) rotate(var(--rot)) scale(1); opacity: 0; }
      }
      @keyframes crm-levelup {
        0% { opacity: 0; transform: scale(0.5) rotate(-6deg); }
        20% { opacity: 1; transform: scale(1.08) rotate(2deg); }
        40% { transform: scale(0.96) rotate(-1deg); }
        60% { transform: scale(1.02) rotate(0.5deg); }
        80% { transform: scale(1) rotate(0deg); opacity: 1; }
        100% { opacity: 0; transform: scale(0.9) rotate(0deg); }
      }
      .animate-levelup { animation: crm-levelup 3.4s ease-in-out forwards; }

      @keyframes pulse-slow {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
      }
      .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }

      @keyframes shine {
        0%, 100% { transform: translateX(-100%); }
        50% { transform: translateX(100%); }
      }
      .animate-shine { animation: shine 6s linear infinite; }
      .animate-shine-fast { animation: shine 2.5s linear infinite; }

      @keyframes float-a {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(40px, 30px); }
      }
      @keyframes float-b {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(-50px, -20px); }
      }
      @keyframes float-c {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(30px, -40px); }
      }
      .animate-float-a { animation: float-a 12s ease-in-out infinite; }
      .animate-float-b { animation: float-b 14s ease-in-out infinite; }
      .animate-float-c { animation: float-c 16s ease-in-out infinite; }

      @keyframes float-companion {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .animate-float-companion { animation: float-companion 3.5s ease-in-out infinite; }

      @keyframes chest-bob {
        0%, 100% { transform: translateY(0) rotate(-1deg); }
        50% { transform: translateY(-4px) rotate(1deg); }
      }
      .animate-chest-bob { animation: chest-bob 2.4s ease-in-out infinite; }

      @keyframes fade-in {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in { animation: fade-in 280ms ease-out forwards; }

      @keyframes twinkle {
        0%, 100% { opacity: 0.25; }
        50% { opacity: 0.85; }
      }
      .constellation-twinkle { animation: twinkle 3.6s ease-in-out infinite; }

      @keyframes star-pulse {
        0%, 100% { transform: scale(1); opacity: 0.4; }
        50% { transform: scale(1.5); opacity: 0.05; }
      }
      .constellation-pulse { transform-origin: center; animation: star-pulse 1.8s ease-in-out infinite; transform-box: fill-box; }

      .constellation-star { transition: transform 220ms ease-out; transform-origin: center; transform-box: fill-box; }
      .constellation-star:hover { transform: scale(1.6); }

      @keyframes slot-blur {
        0%, 100% { filter: blur(0); transform: translateY(0); }
        50% { filter: blur(2px); transform: translateY(2px); }
      }
      .animate-slot-blur { animation: slot-blur 60ms linear infinite; }

      @keyframes cloud-drift-0 {
        0% { transform: translateX(-80px); }
        100% { transform: translateX(1300px); }
      }
      @keyframes cloud-drift-1 {
        0% { transform: translateX(1300px); }
        100% { transform: translateX(-80px); }
      }
      .animate-cloud-0 { animation: cloud-drift-0 60s linear infinite; }
      .animate-cloud-1 { animation: cloud-drift-1 75s linear infinite; }

      @keyframes smoke {
        0% { transform: translateY(0); opacity: 0.3; }
        100% { transform: translateY(-30px); opacity: 0; }
      }
      .animate-smoke circle { animation: smoke 3.5s ease-out infinite; }
      .animate-smoke circle:nth-child(2) { animation-delay: 0.8s; }
      .animate-smoke circle:nth-child(3) { animation-delay: 1.8s; }

      .kingdom-building { transition: transform 200ms ease-out; }
      .kingdom-building:hover { transform: translate(-50%, calc(-50% - 4px)); }

      @keyframes smoke-puff {
        0%   { transform: translate(-50%, 0) scale(1); opacity: 0; }
        20%  { opacity: 0.7; }
        100% { transform: translate(-50%, -30px) scale(1.6); opacity: 0; }
      }
      .animate-smoke-puff { animation: smoke-puff 3.5s ease-out infinite; }

      /* ===== Sistema de materiales (paneles flotantes) ===== */
      .panel-base {
        background: color-mix(in srgb, var(--bg-secondary) 85%, transparent);
        border: 1px solid var(--border-primary);
        box-shadow:
          inset 0 1px 0 0 color-mix(in srgb, var(--text-primary) 5%, transparent),
          0 1px 2px 0 rgba(0, 0, 0, 0.15),
          0 20px 40px -16px rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(20px) saturate(180%);
      }
      .panel-base:hover { border-color: color-mix(in srgb, var(--text-primary) 15%, transparent); }

      .panel-premium {
        background:
          radial-gradient(120% 100% at 0% 0%, rgba(245, 158, 11, 0.12), transparent 60%),
          radial-gradient(120% 100% at 100% 100%, rgba(180, 83, 9, 0.10), transparent 60%),
          color-mix(in srgb, var(--bg-secondary) 90%, transparent);
        border: 1px solid rgba(245, 158, 11, 0.22);
        box-shadow:
          inset 0 1px 0 0 rgba(251, 191, 36, 0.15),
          0 1px 2px 0 rgba(0, 0, 0, 0.15),
          0 20px 60px -20px rgba(245, 158, 11, 0.15);
      }

      .panel-epic {
        background:
          radial-gradient(120% 100% at 0% 0%, rgba(168, 85, 247, 0.13), transparent 60%),
          radial-gradient(120% 100% at 100% 100%, rgba(168, 85, 247, 0.08), transparent 60%),
          color-mix(in srgb, var(--bg-secondary) 90%, transparent);
        border: 1px solid rgba(168, 85, 247, 0.22);
        box-shadow:
          inset 0 1px 0 0 rgba(196, 181, 253, 0.15),
          0 1px 2px 0 rgba(0, 0, 0, 0.15),
          0 20px 60px -20px rgba(139, 92, 246, 0.15);
      }

      .panel-tech {
        background:
          radial-gradient(120% 100% at 100% 0%, rgba(34, 211, 238, 0.10), transparent 60%),
          color-mix(in srgb, var(--bg-secondary) 90%, transparent);
        border: 1px solid rgba(34, 211, 238, 0.20);
        box-shadow:
          inset 0 1px 0 0 rgba(165, 243, 252, 0.12),
          0 1px 2px 0 rgba(0, 0, 0, 0.15),
          0 20px 60px -20px rgba(34, 211, 238, 0.12);
      }

      .panel-dark {
        background:
          radial-gradient(120% 100% at 0% 0%, rgba(190, 18, 60, 0.10), transparent 60%),
          color-mix(in srgb, var(--bg-secondary) 92%, transparent);
        border: 1px solid rgba(244, 63, 94, 0.18);
        box-shadow:
          inset 0 1px 0 0 rgba(254, 205, 211, 0.10),
          0 1px 2px 0 rgba(0, 0, 0, 0.15),
          0 20px 60px -20px rgba(190, 18, 60, 0.18);
      }

      /* ===== Ambient drift ===== */
      @keyframes ambient-1 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(80px, 60px) scale(1.1); }
      }
      @keyframes ambient-2 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(-100px, 40px) scale(1.05); }
      }
      @keyframes ambient-3 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(60px, -80px) scale(1.15); }
      }
      .animate-ambient-1 { animation: ambient-1 22s ease-in-out infinite; }
      .animate-ambient-2 { animation: ambient-2 28s ease-in-out infinite; }
      .animate-ambient-3 { animation: ambient-3 24s ease-in-out infinite; }

      /* ===== Breathing glow (4-6s) ===== */
      @keyframes breathing-glow {
        0%, 100% { opacity: 0.4; filter: blur(20px); }
        50% { opacity: 0.85; filter: blur(28px); }
      }
      .animate-breathing { animation: breathing-glow 5s ease-in-out infinite; }

      /* ===== Hexágono ===== */
      .hexagon-clip {
        clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
      }

      /* ===== XP bar shimmer ===== */
      @keyframes xp-flow {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .xp-shimmer {
        background-image: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%);
        background-size: 200% 100%;
        animation: xp-flow 3s linear infinite;
      }

      /* ===== Particle dust ===== */
      @keyframes float-up {
        0% { transform: translateY(0) scale(1); opacity: 0; }
        10%, 90% { opacity: 0.6; }
        100% { transform: translateY(-40px) scale(0.6); opacity: 0; }
      }
      .particle-dust {
        position: absolute;
        width: 3px;
        height: 3px;
        background: currentColor;
        border-radius: 50%;
        animation: float-up 4s ease-out infinite;
      }

      /* ===== Holographic shine ===== */
      @keyframes holo-shine {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      .holo-shine {
        background-image: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%);
        background-size: 200% 200%;
        animation: holo-shine 6s ease-in-out infinite;
      }

      /* ===== Soft hover lift ===== */
      .panel-hover { transition: transform 280ms ease, box-shadow 280ms ease, border-color 280ms ease; }
      .panel-hover:hover { transform: translateY(-2px); }

      @keyframes tarot-hover {
        0%, 100% { transform: rotateY(0deg) translateY(0); }
        50% { transform: rotateY(0deg) translateY(-4px); }
      }
      .tarot-card-3d:not(:hover) .tarot-card-inner { animation: tarot-hover 4s ease-in-out infinite; }
    `}</style>
  );
}
