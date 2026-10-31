/** Sons discretos e elegantes (WebAudio, sem arquivos externos). */
let ctx = null;
const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

function blip(freq, dur = 0.08, vol = 0.05, type = 'sine') {
  try {
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  } catch { /* áudio indisponível */ }
}

export const sfx = {
  click:  () => blip(660, .05, .04, 'triangle'),   // peça no tabuleiro
  card:   () => { blip(320, .12, .05); setTimeout(() => blip(480, .1, .04), 60); },
  coin:   () => { blip(1200, .06, .05, 'square'); setTimeout(() => blip(1600, .05, .03, 'square'), 40); },
  move:   () => blip(440, .07, .03, 'triangle'),
  battle: () => { blip(160, .25, .07, 'sawtooth'); setTimeout(() => blip(110, .3, .06, 'sawtooth'), 120); },
  victory:() => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, .3, .06), i * 140)),
};

/** Ambiente siciliano suave: vento suave + ondas (ruído filtrado em loop). */
export function startAmbient() {
  try {
    const c = ac();
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 420;
    const g = c.createGain(); g.gain.value = 0.025;
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 0.12; lg.gain.value = 0.012;
    lfo.connect(lg).connect(g.gain);
    src.connect(filt).connect(g).connect(c.destination);
    src.start(); lfo.start();
  } catch { /* silêncio */ }
}
