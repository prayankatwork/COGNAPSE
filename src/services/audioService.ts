/**
 * COGNAPSE AudioSystem
 *
 * Event-driven audio engine for micro-sounds (research pings, notifications,
 * modal chimes). All sounds synthesized via Web Audio API.
 *
 * Sound events:
 *   research-start / research-complete
 *   deep-research-start / deep-research-complete
 *   retrieval-start / retrieval-complete
 *   verification-start / verification-complete
 *   consensus-complete
 *   error
 *   notification-success / notification-error / notification-info
 *   modal-open / modal-close
 */

type AudioState = 'idle' | 'research' | 'deep-research' | 'silent';

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

      // Resume context on first real user interaction
      const resume = () => {
        if (this.ctx?.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        document.removeEventListener('click', resume);
        document.removeEventListener('keydown', resume);
        document.removeEventListener('touchstart', resume);
      };
      document.addEventListener('click', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
      document.addEventListener('touchstart', resume, { once: true });
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
    this._state = state;
  }

  /* ─── Event sounds ─── */

  play(event: SoundEvent) {
    if (!this.ctx || this._muted) return;
    // Resume context if still suspended (browser may have blocked init's resume call)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
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
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this._initialised = false;
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
