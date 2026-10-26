/**
 * Web Audio API procedural sound engine for UAZ-452 Bukhanka.
 * Features an authentic 4-cylinder carbureted engine synthesizer (ZMZ-402 / UMZ-417),
 * transfer case gear whine, suspension squeaks, and mechanical switches.
 * Background music is disabled as requested.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Engine audio nodes
  private engineMasterGain: GainNode | null = null;
  private cylinderOsc1: OscillatorNode | null = null;
  private cylinderOsc2: OscillatorNode | null = null;
  private cylinderOsc3: OscillatorNode | null = null;
  private cylinderGain: GainNode | null = null;
  private exhaustFilter: BiquadFilterNode | null = null;
  private intakeFilter: BiquadFilterNode | null = null;
  private engineDistortion: WaveShaperNode | null = null;

  // Carburetor intake hiss & combustion noise
  private engineNoiseSource: AudioBufferSourceNode | null = null;
  private engineNoiseFilter: BiquadFilterNode | null = null;
  private engineNoiseGain: GainNode | null = null;

  // Transmission whine (прямозубые шестерни раздатки УАЗ)
  private whineOsc: OscillatorNode | null = null;
  private whineGain: GainNode | null = null;

  // Surface road noise (tires, mud, bumps)
  private tireNoiseNode: AudioBufferSourceNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;
  private tireGain: GainNode | null = null;

  // Rain noise
  private rainNoiseNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;

  constructor() {}

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.setupEngineSynth();
    this.setupTransmissionWhine();
    this.setupRoadNoise();
    this.setupRainNoise();
    // Background music intentionally NOT started
  }

  private makeDistortionCurve(amount: number = 25): Float32Array<ArrayBuffer> {
    const k = amount;
    const n_samples = 44100;
    const buffer = new ArrayBuffer(n_samples * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private setupEngineSynth() {
    if (!this.ctx) return;

    this.engineMasterGain = this.ctx.createGain();
    this.engineMasterGain.gain.value = 0.45;
    this.engineMasterGain.connect(this.ctx.destination);

    // 1. Fundamental cylinder firing oscillator (sawtooth for rich harmonic thrum)
    this.cylinderOsc1 = this.ctx.createOscillator();
    this.cylinderOsc1.type = 'sawtooth';
    this.cylinderOsc1.frequency.value = 25; // ~750 RPM idle

    // 2. Secondary combustion oscillator (triangle for deep low-end bass thump)
    this.cylinderOsc2 = this.ctx.createOscillator();
    this.cylinderOsc2.type = 'triangle';
    this.cylinderOsc2.frequency.value = 50;

    // 3. Third harmonic (carburetor pulse / intake throat)
    this.cylinderOsc3 = this.ctx.createOscillator();
    this.cylinderOsc3.type = 'square';
    this.cylinderOsc3.frequency.value = 12.5; // Half-cycle cam rotation

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.25;
    this.cylinderOsc3.connect(subGain);

    this.cylinderGain = this.ctx.createGain();
    this.cylinderGain.gain.value = 0.55;

    // Analog engine distortion curve (simulates iron block combustion chamber saturation)
    this.engineDistortion = this.ctx.createWaveShaper();
    this.engineDistortion.curve = this.makeDistortionCurve(22);
    this.engineDistortion.oversample = '2x';

    // Exhaust muffler lowpass filter with warm resonant body
    this.exhaustFilter = this.ctx.createBiquadFilter();
    this.exhaustFilter.type = 'lowpass';
    this.exhaustFilter.frequency.value = 220;
    this.exhaustFilter.Q.value = 2.4;

    // Intake throat bandpass filter
    this.intakeFilter = this.ctx.createBiquadFilter();
    this.intakeFilter.type = 'bandpass';
    this.intakeFilter.frequency.value = 350;
    this.intakeFilter.Q.value = 1.2;

    this.cylinderOsc1.connect(this.cylinderGain);
    this.cylinderOsc2.connect(this.cylinderGain);
    subGain.connect(this.cylinderGain);

    this.cylinderGain.connect(this.engineDistortion);
    this.engineDistortion.connect(this.exhaustFilter);
    this.exhaustFilter.connect(this.engineMasterGain);

    // 4. White noise generator for exhaust chug & air intake hiss
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.4;
    }
    this.engineNoiseSource = this.ctx.createBufferSource();
    this.engineNoiseSource.buffer = noiseBuffer;
    this.engineNoiseSource.loop = true;

    this.engineNoiseFilter = this.ctx.createBiquadFilter();
    this.engineNoiseFilter.type = 'bandpass';
    this.engineNoiseFilter.frequency.value = 450;
    this.engineNoiseFilter.Q.value = 2.0;

    this.engineNoiseGain = this.ctx.createGain();
    this.engineNoiseGain.gain.value = 0.08;

    this.engineNoiseSource.connect(this.engineNoiseFilter);
    this.engineNoiseFilter.connect(this.engineNoiseGain);
    this.engineNoiseGain.connect(this.engineMasterGain);

    this.cylinderOsc1.start();
    this.cylinderOsc2.start();
    this.cylinderOsc3.start();
    this.engineNoiseSource.start();
  }

  private setupTransmissionWhine() {
    if (!this.ctx || !this.engineMasterGain) return;

    // Straight-cut transfer case gear whine
    this.whineOsc = this.ctx.createOscillator();
    this.whineOsc.type = 'sine';
    this.whineOsc.frequency.value = 320;

    this.whineGain = this.ctx.createGain();
    this.whineGain.gain.value = 0.0;

    this.whineOsc.connect(this.whineGain);
    this.whineGain.connect(this.engineMasterGain);
    this.whineOsc.start();
  }

  private setupRoadNoise() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.tireNoiseNode = this.ctx.createBufferSource();
    this.tireNoiseNode.buffer = noiseBuffer;
    this.tireNoiseNode.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.value = 450;
    this.tireFilter.Q.value = 1.0;

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.value = 0.0;

    this.tireNoiseNode.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.ctx.destination);
    this.tireNoiseNode.start();
  }

  private setupRainNoise() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.rainNoiseNode = this.ctx.createBufferSource();
    this.rainNoiseNode.buffer = noiseBuffer;
    this.rainNoiseNode.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 1600;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.0;

    this.rainNoiseNode.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.ctx.destination);
    this.rainNoiseNode.start();
  }

  /**
   * Dual-tone Soviet electric horn ("Фа-фа! / Би-бип!").
   */
  public playHorn() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const hornOsc1 = this.ctx.createOscillator();
    const hornOsc2 = this.ctx.createOscillator();
    const hornGain = this.ctx.createGain();

    hornOsc1.type = 'sawtooth';
    hornOsc1.frequency.value = 385;
    hornOsc2.type = 'sawtooth';
    hornOsc2.frequency.value = 450;

    hornGain.gain.setValueAtTime(0.45, now);
    hornGain.gain.setValueAtTime(0.45, now + 0.28);
    hornGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    const hornFilter = this.ctx.createBiquadFilter();
    hornFilter.type = 'lowpass';
    hornFilter.frequency.value = 1400;

    hornOsc1.connect(hornFilter);
    hornOsc2.connect(hornFilter);
    hornFilter.connect(hornGain);
    hornGain.connect(this.ctx.destination);

    hornOsc1.start(now);
    hornOsc2.start(now);
    hornOsc1.stop(now + 0.36);
    hornOsc2.stop(now + 0.36);
  }

  /**
   * Tactile toggle switch / lever click sound.
   */
  public playSwitchClick() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  /**
   * Suspension bump impact sound.
   */
  public playSuspensionThump(intensity: number) {
    if (!this.ctx || intensity < 0.08) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.14);

    const volume = Math.min(0.5, intensity * 0.4);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playGearClunk() {
    this.playSwitchClick();
  }

  public playTapeClick() {
    this.playSwitchClick();
  }

  public nextTrack() {
    this.playSwitchClick();
  }

  /**
   * Updates real-time synthesized engine, transmission, tire, and rain audio parameters.
   */
  public update(rpm: number, speedKmh: number, engineLoad: number, surfaceType: string, rainIntensity: number, bumpShock: number) {
    if (!this.ctx) return;

    // 1. Engine frequency calculation (4 cylinders: 2 firings per revolution)
    const firingHz = Math.max(20, (rpm / 60) * 2);
    if (this.cylinderOsc1 && this.cylinderOsc2 && this.cylinderOsc3) {
      this.cylinderOsc1.frequency.setTargetAtTime(firingHz, this.ctx.currentTime, 0.04);
      this.cylinderOsc2.frequency.setTargetAtTime(firingHz * 2.0, this.ctx.currentTime, 0.04);
      this.cylinderOsc3.frequency.setTargetAtTime(firingHz * 0.5, this.ctx.currentTime, 0.04);
    }

    if (this.exhaustFilter && this.engineMasterGain) {
      // Muffler filter opens up on throttle / acceleration
      const filterFreq = 160 + (rpm / 4200) * 480 + engineLoad * 320;
      this.exhaustFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);

      // Volume increases under load and higher RPM
      const vol = 0.35 + (rpm / 4200) * 0.25 + engineLoad * 0.15;
      this.engineMasterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }

    // Noise bursts scale with RPM
    if (this.engineNoiseGain) {
      const noiseVol = 0.04 + (rpm / 4200) * 0.12 + engineLoad * 0.08;
      this.engineNoiseGain.gain.setTargetAtTime(noiseVol, this.ctx.currentTime, 0.05);
    }

    // 2. Transmission Gear Whine (scales with speed and engine load)
    if (this.whineOsc && this.whineGain) {
      const whineHz = 180 + (Math.abs(speedKmh) / 75) * 850;
      this.whineOsc.frequency.setTargetAtTime(whineHz, this.ctx.currentTime, 0.08);

      const targetWhineVol = Math.min(0.24, (Math.abs(speedKmh) / 60) * 0.18 * (0.6 + engineLoad * 0.4));
      this.whineGain.gain.setTargetAtTime(targetWhineVol, this.ctx.currentTime, 0.08);
    }

    // 3. Tire Road Noise
    if (this.tireGain && this.tireFilter) {
      let tireVol = (Math.abs(speedKmh) / 50) * 0.22;
      let centerHz = 500;

      if (surfaceType === 'mud') {
        centerHz = 220; // Deep squelching mud
        tireVol *= 1.35;
      } else if (surfaceType === 'asphalt') {
        centerHz = 850;
      } else {
        centerHz = 480; // Rough dirt & gravel
      }

      this.tireFilter.frequency.setTargetAtTime(centerHz, this.ctx.currentTime, 0.1);
      this.tireGain.gain.setTargetAtTime(Math.min(0.32, tireVol), this.ctx.currentTime, 0.1);
    }

    // 4. Rain on roof
    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(rainIntensity * 0.24, this.ctx.currentTime, 0.2);
    }

    // 5. Suspension bump sound
    if (bumpShock > 0.12) {
      this.playSuspensionThump(bumpShock);
    }
  }
}
