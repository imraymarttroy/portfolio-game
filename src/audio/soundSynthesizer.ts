/**
 * Procedural Web Audio API sound synthesizer for Isle of Troy.
 * Zero external audio file dependencies.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private isAmbientPlaying: boolean = false;
  private ambientTimer: number | null = null;

  constructor() {
    // AudioContext will be initialized upon user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : 0.18, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startAmbient() {
    this.initContext();
    if (this.isAmbientPlaying || !this.ctx || !this.ambientGain) return;
    this.isAmbientPlaying = true;
    this.scheduleNextAmbientChord();
  }

  public stopAmbient() {
    this.isAmbientPlaying = false;
    if (this.ambientTimer !== null) {
      window.clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
  }

  // Soft pentatonic acoustic kalimba/harp chord generator for cozy island atmosphere
  private scheduleNextAmbientChord() {
    if (!this.isAmbientPlaying || !this.ctx || !this.ambientGain) return;

    const chords = [
      [261.63, 329.63, 392.0, 523.25], // C Major
      [220.0, 261.63, 329.63, 440.0],  // A Minor
      [174.61, 220.0, 261.63, 349.23], // F Major
      [196.0, 246.94, 293.66, 392.0],  // G Major
    ];

    const chord = chords[Math.floor(Math.random() * chords.length)];
    const now = this.ctx.currentTime;

    chord.forEach((freq, i) => {
      if (!this.ctx || !this.ambientGain) return;
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.18);

      const noteTime = now + i * 0.18;
      noteGain.gain.setValueAtTime(0, noteTime);
      noteGain.gain.linearRampToValueAtTime(0.045, noteTime + 0.08);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 2.4);

      osc.connect(noteGain);
      noteGain.connect(this.ambientGain);

      osc.start(noteTime);
      osc.stop(noteTime + 2.5);
    });

    const nextDelay = 3400 + Math.random() * 1800;
    this.ambientTimer = window.setTimeout(() => {
      this.scheduleNextAmbientChord();
    }, nextDelay);
  }

  public playFootstep() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    const pitch = 110 + (Math.random() - 0.5) * 20;
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.06);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playJump() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playNpcChirp(npcId: string) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let baseFreq = 380;
    let type: OscillatorType = 'sine';

    if (npcId === 'captain_barnaby') {
      baseFreq = 200 + (Math.random() - 0.5) * 40;
      type = 'triangle';
    } else if (npcId === 'gearsmith_pip') {
      baseFreq = 520 + (Math.random() - 0.5) * 80;
      type = 'sawtooth';
    } else if (npcId === 'curator_celeste') {
      baseFreq = 420 + (Math.random() - 0.5) * 50;
      type = 'sine';
    } else if (npcId === 'sage_zephyr') {
      baseFreq = 160 + (Math.random() - 0.5) * 30;
      type = 'triangle';
    } else if (npcId === 'puck_courier') {
      baseFreq = 600 + (Math.random() - 0.5) * 90;
      type = 'sine';
    }

    osc.type = type;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playShellPickup() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const noteTime = now + idx * 0.065;
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.14, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.36);
    });
  }

  public playJournalOpen() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.12);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playVictoryFanfare() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const melody = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.14 },
      { f: 1046.5, d: 0.4 },
    ];

    let t = now;
    melody.forEach((note) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + note.d + 0.05);
      t += note.d * 0.85;
    });
  }
}

export const soundManager = new SoundSynthesizer();
