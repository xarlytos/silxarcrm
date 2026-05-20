/* ============================================================
   Confetti
============================================================ */

export function spawnConfetti(host: HTMLElement, intensity = 1) {
  const colors = ['#fbbf24', '#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#fb7185', '#facc15'];
  const n = Math.floor(36 * intensity);
  for (let i = 0; i < n; i++) {
    const piece = document.createElement('span');
    piece.className = 'crm-confetti-piece';
    piece.style.left = '50%';
    piece.style.top = '50%';
    piece.style.background = colors[i % colors.length];
    const angle = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const dist = (80 + Math.random() * 140) * intensity;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    piece.style.setProperty('--dx', `${dx}px`);
    piece.style.setProperty('--dy', `${dy}px`);
    piece.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
    piece.style.animationDelay = `${Math.random() * 80}ms`;
    host.appendChild(piece);
    setTimeout(() => piece.remove(), 1400);
  }
}
