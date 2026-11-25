// Tiny synthesized sound effects (WebAudio, no audio files): a chop thock, a grill
// sizzle, a serve chime, a fail buzz and a pick-up blip. Nothing is loaded over
// the network and nothing is stored; the first user gesture creates the context.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context === null) {
      try {
        const Ctor = window.AudioContext ?? window.webkitAudioContext;
        context = Ctor ? new Ctor() : null;
      } catch {
        context = null;
      }
    }
    if (context !== null && context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  function tone(freq, duration, type, volume, when = 0, slideTo = null) {
    if (muted) return;
    const ctx = ensure();
    if (ctx === null) return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    pickup() {
      tone(520, 0.08, 'sine', 0.12, 0, 760);
    },
    place() {
      tone(300, 0.07, 'triangle', 0.1, 0, 210);
    },
    chop() {
      tone(140, 0.09, 'square', 0.14, 0, 70);
      tone(900, 0.05, 'triangle', 0.06, 0, 500);
    },
    sizzle() {
      tone(2400, 0.35, 'sawtooth', 0.02, 0, 1200);
      tone(180, 0.12, 'sine', 0.1, 0, 90);
    },
    ready() {
      tone(880, 0.12, 'sine', 0.12);
      tone(1174, 0.14, 'sine', 0.12, 0.1);
    },
    serve() {
      tone(523, 0.12, 'sine', 0.14);
      tone(659, 0.12, 'sine', 0.14, 0.09);
      tone(784, 0.2, 'sine', 0.16, 0.18);
    },
    fail() {
      tone(220, 0.18, 'sawtooth', 0.1, 0, 140);
    },
    tick() {
      tone(980, 0.05, 'sine', 0.08);
    },
    expired() {
      tone(330, 0.15, 'triangle', 0.12, 0, 180);
      tone(220, 0.22, 'triangle', 0.12, 0.14, 130);
    },
  };
}
