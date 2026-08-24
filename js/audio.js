class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.cachedNoiseBuffer = null;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
        this.initNoiseBuffer();
      }
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  initNoiseBuffer() {
    if (!this.audioCtx) return;
    try {
      const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.05);
      this.cachedNoiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = this.cachedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } catch (e) {
      console.warn('Failed to pre-allocate audio noise buffer', e);
    }
  }

  ensureAudioRunning() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playMechanicalClick() {
    if (!this.soundEnabled || !this.audioCtx) return;
    this.ensureAudioRunning();

    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const oscGain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.04);

    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(oscGain);
    oscGain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.05);

    if (this.cachedNoiseBuffer) {
      const landingTime = now + 0.34;
      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = this.cachedNoiseBuffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, landingTime);
      filter.Q.setValueAtTime(2.2, landingTime);

      const noiseGain = this.audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.setValueAtTime(0.22, landingTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, landingTime + 0.05);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.audioCtx.destination);

      whiteNoise.start(landingTime);
      whiteNoise.stop(landingTime + 0.055);
    }
  }

  playAlarmChime() {
    if (!this.audioCtx) return;
    this.ensureAudioRunning();

    const notes = [523.25, 659.25, 783.99, 1046.50];
    const startTime = this.audioCtx.currentTime;

    notes.forEach((freq, idx) => {
      const noteTime = startTime + idx * 0.12;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.6);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.65);
    });
  }
}

window.AudioManager = AudioManager;
