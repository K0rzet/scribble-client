import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'scribble-sound';

// ─── Shared AudioContext ───────────────────────────────────────
let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new AudioContext();
    }
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

// Unlock AudioContext on first user gesture (browser autoplay policy)
if (typeof window !== 'undefined') {
  const unlock = () => { getCtx(); };
  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
}

// ─── Low-level tone primitive ─────────────────────────────────
function tone(
  ac: AudioContext,
  freq: number,
  dur: number,
  vol = 0.28,
  type: OscillatorType = 'sine',
  delay = 0,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ac.destination);
  const t = ac.currentTime + delay;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// ─── Synth sweep (for whoosh effects) ─────────────────────────
function sweep(
  ac: AudioContext,
  freqStart: number,
  freqEnd: number,
  dur: number,
  vol = 0.12,
  type: OscillatorType = 'sawtooth',
  delay = 0,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.connect(gain);
  gain.connect(ac.destination);
  const t = ac.currentTime + delay;
  osc.frequency.setValueAtTime(freqStart, t);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// ─── Sound library ────────────────────────────────────────────
export type SoundEffect =
  | 'correct'
  | 'myCorrect'
  | 'close'
  | 'speedWord'
  | 'roundStart'
  | 'roundEnd'
  | 'gameEnd'
  | 'tick'
  | 'join';

function playEffect(effect: SoundEffect) {
  const ac = getCtx();
  if (!ac) return;

  switch (effect) {
    case 'correct':
      // Bright arpeggio C5 → E5 → G5
      tone(ac, 523, 0.18, 0.3, 'sine', 0);
      tone(ac, 659, 0.18, 0.32, 'sine', 0.09);
      tone(ac, 784, 0.28, 0.4, 'sine', 0.18);
      break;

    case 'myCorrect':
      // Brighter, louder version for "I guessed it"
      tone(ac, 523, 0.15, 0.5, 'sine', 0);
      tone(ac, 659, 0.15, 0.55, 'sine', 0.08);
      tone(ac, 784, 0.22, 0.6, 'sine', 0.16);
      tone(ac, 1047, 0.35, 0.65, 'sine', 0.24);
      break;

    case 'close':
      // Soft "almost" plink
      tone(ac, 494, 0.1, 0.18, 'sine', 0);
      tone(ac, 440, 0.14, 0.15, 'sine', 0.06);
      break;

    case 'speedWord':
      // Quick ascending whoosh
      sweep(ac, 280, 920, 0.13, 0.13, 'sawtooth');
      tone(ac, 880, 0.08, 0.18, 'sine', 0.09);
      break;

    case 'roundStart':
      // Ready-set-go jingle
      tone(ac, 440, 0.1, 0.22, 'sine', 0);
      tone(ac, 523, 0.1, 0.26, 'sine', 0.14);
      tone(ac, 659, 0.22, 0.38, 'sine', 0.28);
      break;

    case 'roundEnd':
      // Resolving chord
      [261, 329, 392, 523].forEach((f, i) =>
        tone(ac, f, 0.8, 0.16, 'sine', i * 0.07),
      );
      break;

    case 'gameEnd':
      // Victory fanfare
      [261, 329, 392, 523, 659, 784].forEach((f, i) =>
        tone(ac, f, 0.55, 0.28, 'sine', i * 0.1),
      );
      break;

    case 'tick':
      // Clock tick — high & short
      tone(ac, 1200, 0.04, 0.12, 'square', 0);
      break;

    case 'join':
      // Player joined — soft double ding
      tone(ac, 523, 0.12, 0.18, 'sine', 0);
      tone(ac, 784, 0.18, 0.22, 'sine', 0.1);
      break;
  }
}

// ─── Hook ────────────────────────────────────────────────────
export function useSound() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const playSound = useCallback((effect: SoundEffect) => {
    if (!enabledRef.current) return;
    playEffect(effect);
  }, []);

  return { enabled, toggle, playSound };
}
