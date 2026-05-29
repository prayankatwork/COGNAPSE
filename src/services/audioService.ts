/**
 * COGNAPSE AudioSystem — Phase 2
 *
 * State-driven audio engine with ambient atmospheres, pipeline micro-sounds,
 * and event-driven feedback. All sounds synthesized via Web Audio API.
 *
 * States:
 *   idle          — calm workspace ambience (sub 55Hz + filtered noise)
 *   research      — subtle shift (slightly higher noise floor, gentle pulse)
 *   deep-research — deeper atmosphere (sub 27.5Hz + harmonic overtones)
 *   silent        — all audio stopped
 *
 * Sound events:
 *   research-start / research-complete
 *   deep-research-start / deep-research-complete
 *   retrieval-start / retrieval-complete
 *   verification-start / verification-complete
 *   consensus-complete
 *   error
 */

type AudioState = 'idle' | 'research' | 'deep-research' | 'focus' | 'silent';

type SoundEvent =
  | 'research-start'
  | 'research-complete'
  | 'deep-research-start'
  | 'deep-research-complete'
  | 'retrieval-start'
  | 'retrieval-complete'
  | 'verification-start'
  | 'verification-complete'
  | 'consensus-complete'
  | 'error'
  | 'notification-success'
  | 'notification-error'
  | 'notification-info'
  | 'modal-open'
  | 'modal-close';

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
  private ambientSubGain: GainNode | null = null;
  private ambientSub2: OscillatorNode | null = null; // deep-research harmonic
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private ambientNoiseGain: GainNode | null = null;
  private ambientLfo: OscillatorNode | null = null;
  private ambientActive = false;
  private currentAmbientState: AudioState | null = null;
  private lfoScheduled = false;

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

    if (state === 'idle' || state === 'research' || state === 'deep-research' || state === 'focus') {
      this.setAmbient(state);
    } else if (state === 'silent') {
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
      case 'deep-research-start':
        this.playDeepResearchStart();
        break;
      case 'deep-research-complete':
        this.playResearchComplete(true);
        break;
      case 'retrieval-start':
        this.playRetrievalStart();
        break;
      case 'retrieval-complete':
        this.playRetrievalComplete();
        break;
      case 'verification-start':
        this.playVerificationStart();
        break;
      case 'verification-complete':
        this.playVerificationComplete();
        break;
      case 'consensus-complete':
        this.playConsensusComplete();
        break;
      case 'error':
        this.playError();
        break;
      case 'notification-success':
        this.playNotificationSuccess();
        break;
      case 'notification-error':
        this.playNotificationError();
        break;
      case 'notification-info':
        this.playNotificationInfo();
        break;
      case 'modal-open':
        this.playModalOpen();
        break;
      case 'modal-close':
        this.playModalClose();
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
     INTERNAL — AMBIENT ATMOSPHERE ENGINE
     ══════════════════════════════════════════════ */

  /**
   * Transition ambient to match the given state, with smooth crossfade.
   * Creates oscillator/noise nodes once, then adjusts parameters per state.
   */
  private setAmbient(state: AudioState) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (state === this.currentAmbientState) return;
    this.currentAmbientState = state;

    // Ensure ambient nodes exist
    this.ensureAmbientNodes(now);

    // Set parameters based on state
    const subFreq = state === 'deep-research' ? 27.5 : 55; // A0 vs A1
    const subGainTarget = state === 'deep-research' ? 0.06 : state === 'focus' ? 0.025 : 0.04;
    const sub2GainTarget = state === 'deep-research' ? 0.025 : 0;
    const noiseGainTarget = state === 'research' ? 0.025 : state === 'deep-research' ? 0.03 : state === 'focus' ? 0.008 : 0.015;
    const lpFreqTarget = state === 'deep-research' ? 250 : state === 'research' ? 500 : state === 'focus' ? 300 : 400;
    const lfoRateTarget = state === 'focus' ? 0.01 : state === 'deep-research' ? 0.04 : state === 'research' ? 0.12 : 0.08;
    const lfoDepthTarget = state === 'focus' ? 0.001 : state === 'deep-research' ? 0.01 : state === 'research' ? 0.008 : 0.005;
    const busGainTarget = state === 'deep-research' ? 0.65 : state === 'research' ? 0.55 : state === 'focus' ? 0.35 : 0.5;

    const fadeSec = 3;

    // Sub oscillator
    if (this.ambientSub) {
      this.ambientSub.frequency.linearRampToValueAtTime(subFreq, now + fadeSec);
    }
    if (this.ambientSubGain) {
      this.ambientSubGain.gain.linearRampToValueAtTime(subGainTarget, now + fadeSec);
    }

    // Second sub (deep-research harmonic overtone)
    if (this.ambientSub2) {
      if (sub2GainTarget > 0 && this.ambientSub2Gain) {
        this.ambientSub2Gain.gain.linearRampToValueAtTime(sub2GainTarget, now + fadeSec);
        try { this.ambientSub2.start(now); } catch { /* already started */ }
      } else if (this.ambientSub2Gain) {
        this.ambientSub2Gain.gain.linearRampToValueAtTime(0, now + fadeSec);
      }
    }

    // Noise filter
    if (this.ambientLpFilter) {
      this.ambientLpFilter.frequency.linearRampToValueAtTime(lpFreqTarget, now + fadeSec);
    }

    // Noise gain
    if (this.ambientNoiseGain) {
      this.ambientNoiseGain.gain.linearRampToValueAtTime(noiseGainTarget, now + fadeSec);
    }

    // LFO rate + depth
    if (this.ambientLfo) {
      this.ambientLfo.frequency.linearRampToValueAtTime(lfoRateTarget, now + fadeSec);
    }
    if (this.ambientLfoDepth) {
      this.ambientLfoDepth.gain.linearRampToValueAtTime(lfoDepthTarget, now + fadeSec);
    }

    // Master ambient bus
    if (this.ambientGain) {
      this.ambientGain.gain.linearRampToValueAtTime(busGainTarget, now + fadeSec);
    }

    // Start ambient if not active
    if (!this.ambientActive) {
      this.ambientActive = true;
    }
  }

  /** Create ambient nodes once, silent until setAmbient fades them in. */
  private ambientSub2Gain: GainNode | null = null;
  private ambientLpFilter: BiquadFilterNode | null = null;
  private ambientLfoDepth: GainNode | null = null;

  private ensureAmbientNodes(now: number) {
    if (!this.ctx || this.ambientSub) return; // already created

    // ── Subharmonic drone (A1 = 55 Hz) ──
    this.ambientSub = this.ctx.createOscillator();
    this.ambientSub.type = 'sine';
    this.ambientSub.frequency.setValueAtTime(55, now);
    this.ambientSubGain = this.ctx.createGain();
    this.ambientSubGain.gain.setValueAtTime(0, now);
    this.ambientSub.connect(this.ambientSubGain);
    this.ambientSubGain.connect(this.ambientGain!);
    this.ambientSub.start(now);

    // ── Second sub (A0 = 27.5 Hz, used by deep-research) ──
    this.ambientSub2 = this.ctx.createOscillator();
    this.ambientSub2.type = 'sine';
    this.ambientSub2.frequency.setValueAtTime(27.5, now);
    this.ambientSub2Gain = this.ctx.createGain();
    this.ambientSub2Gain.gain.setValueAtTime(0, now);
    this.ambientSub2.connect(this.ambientSub2Gain);
    this.ambientSub2Gain.connect(this.ambientGain!);
    // Don't start yet — will start when setAmbient activates it
    try { this.ambientSub2.start(now); } catch {}

    // ── Filtered noise bed ──
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    this.ambientNoiseSource = this.ctx.createBufferSource();
    this.ambientNoiseSource.buffer = noiseBuffer;
    this.ambientNoiseSource.loop = true;

    this.ambientLpFilter = this.ctx.createBiquadFilter();
    this.ambientLpFilter.type = 'lowpass';
    this.ambientLpFilter.frequency.setValueAtTime(400, now);
    this.ambientLpFilter.Q.setValueAtTime(0.5, now);

    this.ambientNoiseGain = this.ctx.createGain();
    this.ambientNoiseGain.gain.setValueAtTime(0, now);

    this.ambientNoiseSource.connect(this.ambientLpFilter);
    this.ambientLpFilter.connect(this.ambientNoiseGain);
    this.ambientNoiseGain.connect(this.ambientGain!);
    this.ambientNoiseSource.start(now);

    // ── LFO for subtle movement ──
    this.ambientLfo = this.ctx.createOscillator();
    this.ambientLfo.type = 'sine';
    this.ambientLfo.frequency.setValueAtTime(0.08, now);
    this.ambientLfoDepth = this.ctx.createGain();
    this.ambientLfoDepth.gain.setValueAtTime(0.005, now);
    this.ambientLfo.connect(this.ambientLfoDepth);
    this.ambientLfoDepth.connect(this.ambientNoiseGain.gain);
    this.ambientLfo.start(now);

    // Fade in ambient bus
    this.ambientGain!.gain.setValueAtTime(0, now);
    this.ambientGain!.gain.linearRampToValueAtTime(0.5, now + 4);
  }

  private stopAmbient() {
    this.ambientActive = false;
    this.currentAmbientState = null;
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
    this.ambientSubGain = null;
    if (this.ambientSub2) {
      try { this.ambientSub2.stop(now + 1.6); } catch {}
      this.ambientSub2 = null;
    }
    this.ambientSub2Gain = null;
    if (this.ambientNoiseSource) {
      try { this.ambientNoiseSource.stop(now + 1.6); } catch {}
      this.ambientNoiseSource = null;
    }
    if (this.ambientLfo) {
      try { this.ambientLfo.stop(now + 1.6); } catch {}
      this.ambientLfo = null;
    }
    this.ambientLfoDepth = null;
    this.ambientNoiseGain = null;
    this.ambientLpFilter = null;
  }

  /* ══════════════════════════════════════════════
     INTERNAL — EVENT SOUND GENERATORS
     ══════════════════════════════════════════════ */

  private playTone(
    freq: number,
    type: OscillatorType,
    volume: number,
    duration: number,
    startDelay = 0,
    rampType: 'linear' | 'exponential' = 'exponential'
  ) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + startDelay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    if (rampType === 'exponential') {
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    } else {
      gain.gain.linearRampToValueAtTime(0, now + duration);
    }
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private playResearchStart() {
    if (!this.ctx) return;
    // Triangle pulse at E5 (660 Hz), 400ms — signals investigation begins
    this.playTone(660, 'triangle', 0.12, 0.4);
  }

  private playDeepResearchStart() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Deep swell: A2 (110 Hz) subharmonic swell, 800ms — signals depth
    this.playTone(110, 'sine', 0.1, 0.8);
    // Plus a soft harmonic at A4 (440 Hz) that fades in gradually
    this.playTone(440, 'sine', 0.06, 1.0, 0.15);
  }

  private playResearchComplete(isDeep: boolean) {
    if (!this.ctx) return;
    if (isDeep) {
      // Deep Research: Two-note ascending chime (D5 → A5), ~350ms
      const notes = [587.33, 880.00];
      notes.forEach((freq, i) => {
        this.playTone(freq, 'sine', 0.18, 0.25, i * 0.12);
      });
    } else {
      // Normal Research: Single soft bell ping (A5), ~200ms
      this.playTone(880, 'sine', 0.15, 0.22);
    }
  }

  /**
   * Retrieval Start — Rising micro-interval (E4→A4, ~300ms)
   * E4=329.63, A4=440. Two quick ascending tones, calm & curious.
   * Signals: "sources are being gathered"
   */
  private playRetrievalStart() {
    if (!this.ctx) return;
    this.playTone(329.63, 'triangle', 0.07, 0.12);
    this.playTone(440.00, 'triangle', 0.09, 0.18, 0.1);
  }

  /**
   * Retrieval Complete — Soft descending confirmation (A4→E4, ~200ms)
   * Signals: "sources collected successfully"
   */
  private playRetrievalComplete() {
    if (!this.ctx) return;
    this.playTone(440.00, 'sine', 0.08, 0.08);
    this.playTone(329.63, 'sine', 0.06, 0.15, 0.08);
  }

  /**
   * Verification Start — Quick bright ping (C5=523.25, ~100ms)
   * Signals: "checking claims against sources"
   */
  private playVerificationStart() {
    if (!this.ctx) return;
    this.playTone(523.25, 'triangle', 0.06, 0.1);
  }

  /**
   * Verification Complete — Gentle two-note chime (C5→E5, ~200ms)
   * C5=523.25, E5=659.25. Warm confirmation.
   * Signals: "citations verified"
   */
  private playVerificationComplete() {
    if (!this.ctx) return;
    this.playTone(523.25, 'sine', 0.07, 0.15);
    this.playTone(659.25, 'sine', 0.09, 0.2, 0.1);
  }

  /**
   * Consensus Complete — Soft chord (A3+E4, ~300ms)
   * A3=220, E4=329.63. Two notes simultaneously — agreement.
   * Signals: "models agree"
   */
  private playConsensusComplete() {
    if (!this.ctx) return;
    this.playTone(220.00, 'sine', 0.05, 0.3);
    this.playTone(329.63, 'sine', 0.07, 0.25, 0.03);
  }

  private playError() {
    if (!this.ctx) return;
    // Descending minor third: A3 (220 Hz) → F#3 (185 Hz)
    this.playTone(220.00, 'triangle', 0.18, 0.35);
    this.playTone(184.99, 'triangle', 0.14, 0.35, 0.15);
  }

  /* ─── Phase 3: Notification sounds ─── */

  /**
   * Notification Success — Single bright chime (C5=523.25, ~150ms)
   * Quick, positive, confident. Nothing exuberant — just a clean "done" signal.
   */
  private playNotificationSuccess() {
    if (!this.ctx) return;
    this.playTone(523.25, 'triangle', 0.08, 0.15);
  }

  /**
   * Notification Error — Soft descending two-note (E4→C4, ~250ms)
   * E4=329.63, C4=261.63. Muted minor third descent — subdued "didn't work".
   */
  private playNotificationError() {
    if (!this.ctx) return;
    this.playTone(329.63, 'triangle', 0.07, 0.1);
    this.playTone(261.63, 'triangle', 0.06, 0.15, 0.1);
  }

  /**
   * Notification Info — Gentle single tone (A4=440, ~100ms)
   * Pure sine, very quiet — neutral awareness, not an alert.
   */
  private playNotificationInfo() {
    if (!this.ctx) return;
    this.playTone(440.00, 'sine', 0.04, 0.1);
  }

  /* ─── Phase 3: Modal sounds ─── */

  /**
   * Modal Open — Soft "lift" (A3 swell, ~200ms)
   * A3=220. A single gentle sine that rises briefly — like lifting a hatch.
   */
  private playModalOpen() {
    if (!this.ctx) return;
    this.playTone(220.00, 'sine', 0.06, 0.2);
  }

  /**
   * Modal Close — Gentle "settle" (C4, ~150ms)
   * C4=261.63. A quick, soft thud — like a latch clicking closed.
   */
  private playModalClose() {
    if (!this.ctx) return;
    this.playTone(261.63, 'sine', 0.04, 0.15);
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
