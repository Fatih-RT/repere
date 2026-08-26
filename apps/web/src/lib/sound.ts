// A short two-note chime, synthesized with the Web Audio API — no asset
// file to fetch or ship, works offline. One shared AudioContext, created
// lazily on first use (browsers refuse to start one before any user
// gesture on the page, which every call site here already follows —
// rating a card, a pomodoro timer the user pressed "Démarrer" on).
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function playChime(): void {
  const audioCtx = getContext();
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    for (const [i, freq] of [660, 880].entries()) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    }
  } catch {
    // Sound is a nice-to-have — never worth breaking the review/pomodoro
    // flow over (e.g. autoplay policy still blocking the context).
  }
}
