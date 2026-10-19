// Notifications sonores — WebAudio, 100% hors-ligne, aucun fichier externe
let audioCtx: AudioContext | null = null;
let enabled = true;
let volume = 0.55;

export function setSoundEnabled(v: boolean) { enabled = v; }
export function isSoundEnabled() { return enabled; }
export function setSoundVolume(v: number) { volume = Math.min(1, Math.max(0, v)); }

function ctx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch { return null; }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.18) {
  const ac = ctx(); if (!ac || !enabled) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainVal * volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain); gain.connect(ac.destination);
  osc.start(t0); osc.stop(t0 + duration + 0.05);
}

export const playClick = () => tone(620, 0, 0.07, 'sine', 0.07);
export const playSuccess = () => { tone(659, 0, 0.16, 'sine', 0.16); tone(880, 0.12, 0.22, 'sine', 0.16); };
export const playWarning = () => { tone(440, 0, 0.18, 'triangle', 0.18); tone(440, 0.24, 0.18, 'triangle', 0.18); };
export const playError = () => { tone(220, 0, 0.22, 'sawtooth', 0.12); tone(185, 0.16, 0.28, 'sawtooth', 0.12); };
export const playLateAlert = () => { tone(523, 0, 0.16, 'triangle', 0.2); tone(392, 0.18, 0.16, 'triangle', 0.2); tone(523, 0.36, 0.24, 'triangle', 0.2); };
export const playWaterAlert = () => { tone(740, 0, 0.14, 'sine', 0.16); tone(988, 0.15, 0.2, 'sine', 0.14); tone(740, 0.38, 0.16, 'sine', 0.12); };
export const playNotification = () => { tone(784, 0, 0.14, 'sine', 0.15); tone(1046, 0.13, 0.2, 'sine', 0.13); };
export function playBySeverity(sev: 'success'|'info'|'warning'|'danger'|'water') {
  if (sev === 'success') playSuccess();
  else if (sev === 'danger') playLateAlert();
  else if (sev === 'warning') playWarning();
  else if (sev === 'water') playWaterAlert();
  else playNotification();
}
export function testSound(kind: 'success'|'warning'|'danger'|'water'|'info' = 'success') { playBySeverity(kind); }
