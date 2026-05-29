/**
 * COGNAPSE AudioSystem — Phase 1
 *
 * State-driven audio engine with ambient atmospheres and event sounds.
 * All sounds are synthesized via Web Audio API (zero audio files).
 *
 * Phase 1 scope:
 *   - State machine: idle | silent
 *   - Ambient idle atmosphere (continuous subharmonic + filtered noise)
 *   - Research Start / Complete (existing sounds preserved)
 *   - Deep Research Complete (existing sound preserved)
 *   - Error sound
 *   - Master mute toggle
 *   - Speak protocol (kept from previous version)
 */

type AudioState = 'idle' | 'silent';

type SoundEvent =
  | 'research-start'
  | 'research-complete'
  | 'deep-research-complete'
  | 'error';

class AudioSystem {
  private ctx: AudioContext | null = null;

  /* ─── Routing ─── */
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  /* ─── State ─── */
  private _state: AudioState = 'silent';
  private _muted = false;

  /* ─── Ambient oscillator references ─── */
  private ambientSub: OscillatorNode | null = null;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private ambientNoiseGain: GainNode | null = null;
  private ambientActive = false;

  /* ─── Initialisation guard ─── */
  private _initialised = false;

  /* ─── Public API ─── */

  get muted() { return this._muted; }
  get state() { return this._state; }

  /** Must be called on first user interaction (browser autoplay policy). */
  init() {
    if (this._initialised) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0;
      this.ambientGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.masterGain);

      this._initialised = true;
    } catch {
      // Web Audio unavailable — all methods become no-ops
    }
  }

  /** Toggle master mute on/off. Returns the new mute state. */
  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : 0.6;
    }
    return this._muted;
  }

  /** Set mute state directly. */
  setMuted(muted: boolean) {
    this._muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 0.6;
    }
  }

  /* ─── State machine ─── */

  setState(state: AudioState) {
    if (state === this._state) return;
    const prev = this._state;
    this._state = state;

    if (state === 'idle' && prev === 'silent') {
      this.startAmbientIdle();
    } else if (state === 'silent' && prev === 'idle') {
      this.stopAmbient();
    }
  }

  /* ─── Event sounds ─── */

  play(event: SoundEvent) {
    if (!this.ctx || this._muted) return;
    switch (event) {
      case 'research-start':
        this.playResearchStart();
        break;
      case 'research-complete':
        this.playResearchComplete(false);
        break;
      case 'deep-research-complete':
        this.playResearchComplete(true);
        break;
      case 'error':
        this.playError();
        break;
    }
  }

  /* ─── Speech ─── */

  speakProtocol(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const normalizedText = text.replace(/COGNAPSE/g, 'Cognapse');
    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.rate = 0.85;
    utterance.pitch = 0.1;
    utterance.volume = 0.4;
    window.speechSynthesis.speak(utterance);
  }

  /* ─── Cleanup ─── */

  dispose() {
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this._initialised = false;
  }

  /* ══════════════════════════════════════════════
     INTERNAL — AMBIENT IDLE ATMOSPHERE
     ══════════════════════════════════════════════ */

  private startAmbientIdle() {
    if (!this.ctx || this.ambientActive) return;
    this.ambientActive = true;
    const now = this.ctx.currentTime;

    // ── Subharmonic drone (55 Hz, A1) ──
    this.ambientSub = this.ctx.createOscillator();
    this.ambientSub.type = 'sine';
    this.ambientSub.frequency.setValueAtTime(55, now);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.04, now + 3); // slow fade-in
    this.ambientSub.connect(subGain);
    subGain.connect(this.ambientGain!);
    this.ambientSub.start(now);

    // ── Filtered noise bed (simulating ventilation / command-centre air) ──
    const bufferSize = this.ctx.sampleRate * 4; // 4-second loop
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Slightly coloured noise — tilt toward low frequencies
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    this.ambientNoiseSource = this.ctx.createBufferSource();
    this.ambientNoiseSource.buffer = noiseBuffer;
    this.ambientNoiseSource.loop = true;

    // Low-pass filter — roll off above 400 Hz for warmth
    const lpFilter = this.ctx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.setValueAtTime(400, now);
    lpFilter.Q.setValueAtTime(0.5, now);

    this.ambientNoiseGain = this.ctx.createGain();
    this.ambientNoiseGain.gain.setValueAtTime(0, now);
    this.ambientNoiseGain.gain.linearRampToValueAtTime(0.015, now + 4);

    // LFO for subtle movement — amplitude modulation on the noise
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, now); // very slow pulse (~12s cycle)
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.005, now);
    lfo.connect(lfoGain);
    lfoGain.connect(this.ambientNoiseGain.gain);
    lfo.start(now);

    this.ambientNoiseSource.connect(lpFilter);
    lpFilter.connect(this.ambientNoiseGain);
    this.ambientNoiseGain.connect(this.ambientGain!);
    this.ambientNoiseSource.start(now);

    // Fade ambient bus in
    this.ambientGain!.gain.setValueAtTime(0, now);
    this.ambientGain!.gain.linearRampToValueAtTime(0.5, now + 4);
  }

  private stopAmbient() {
    this.ambientActive = false;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Fade out ambient bus
    if (this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
      this.ambientGain.gain.linearRampToValueAtTime(0, now + 1.5);
    }

    // Stop oscillators after fade
    if (this.ambientSub) {
      try { this.ambientSub.stop(now + 1.6); } catch {}
      this.ambientSub = null;
    }
    if (this.ambientNoiseSource) {
      try { this.ambientNoiseSource.stop(now + 1.6); } catch {}
      this.ambientNoiseSource = null;
    }
    this.ambientNoiseGain = null;
  }

  /* ══════════════════════════════════════════════
     INTERNAL — EVENT SOUND GENERATORS
     ══════════════════════════════════════════════ */

  private playResearchStart() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, now); // E5
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  private playResearchComplete(isDeep: boolean) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (isDeep) {
      // Deep Research: Two-note ascending chime (D5 → A5), ~350ms
      const notes = [587.33, 880.00]; // D5, A5
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.25);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.3);
      });
    } else {
      // Normal Research: Single soft bell ping (A5), ~200ms
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880.00, now); // A5
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  private playError() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Descending minor third: A3 (220 Hz) → F#3 (185 Hz)
    const notes = [220.00, 184.99];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });
  }
}

/** Singleton instance */
export const audioSystem = new AudioSystem();

/** Re-export for backward compatibility during migration */
export const audioService = {
  playCompletionSound: (isDeep: boolean) => {
    audioSystem.play(isDeep ? 'deep-research-complete' : 'research-complete');
  },
  playWalkthroughTick: () => {
    // Replaced with a softer click
    audioSystem.play('research-start');
  },
  playNeuralHum: () => {
    // No longer used — ambient system handles this
  },
  speakProtocol: (text: string) => {
    audioSystem.speakProtocol(text);
  },
};
