/**
 * ALGORAVE - Synthesizers using Tone.js
 * Provides various synthesis engines for live coding
 */

class SynthEngine {
    constructor() {
        this.synths = {};
        this.masterGain = null;
        this.initialized = false;
    }

    /**
     * Initialize Tone.js audio context
     */
    async init() {
        if (this.initialized) return;

        // Start audio context (requires user interaction)
        // Note: latencyHint is read-only after context is created
        await Tone.start();
        console.log('Audio context started');
        console.log('Sample rate:', Tone.context.sampleRate);
        console.log('Base latency:', Tone.context.baseLatency);
        console.log('Latency hint:', Tone.context.latencyHint);

        // Initialize master bus first
        if (!window.masterBus.initialized) {
            await window.masterBus.init();
        }

        // Connect to master bus instead of destination
        this.masterGain = new Tone.Gain(0.7);
        const limiter = new Tone.Limiter(-3).connect(this.masterGain);

        // Route to master bus
        this.masterGain.connect(window.masterBus.getInput());

        // Create synth pool for different types
        // Note: PolySynth in Tone.js v14 uses different syntax
        // LIMITED to 16 voices max per synth to prevent memory issues
        this.synths = {
            sine: new Tone.PolySynth(Tone.Synth, {
                maxPolyphony: 16,
                options: {
                    oscillator: { type: 'sine' },
                    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 }
                }
            }).connect(limiter),

            square: new Tone.PolySynth(Tone.Synth, {
                maxPolyphony: 16,
                options: {
                    oscillator: { type: 'square' },
                    envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.3 }
                }
            }).connect(limiter),

            sawtooth: new Tone.PolySynth(Tone.Synth, {
                maxPolyphony: 16,
                options: {
                    oscillator: { type: 'sawtooth' },
                    envelope: { attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.5 }
                }
            }).connect(limiter),

            triangle: new Tone.PolySynth(Tone.Synth, {
                maxPolyphony: 16,
                options: {
                    oscillator: { type: 'triangle' },
                    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.4 }
                }
            }).connect(limiter),

            fm: new Tone.PolySynth(Tone.FMSynth, {
                maxPolyphony: 12,
                options: {
                    harmonicity: 3,
                    modulationIndex: 10,
                    envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.5 },
                    modulation: { type: 'square' },
                    modulationEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.2 }
                }
            }).connect(limiter),

            am: new Tone.PolySynth(Tone.AMSynth, {
                maxPolyphony: 12,
                options: {
                    harmonicity: 2,
                    envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 }
                }
            }).connect(limiter)
        };

        this.initialized = true;
    }

    /**
     * Play a note with a specific synth
     * @param {number} midiNote - MIDI note number
     * @param {string} synthType - Type of synth
     * @param {number} time - When to play (Tone.js time)
     * @param {number} duration - How long to play
     * @param {number} gain - Volume (0-2, default 1.0)
     */
    playNote(midiNote, synthType = 'sine', time = '+0', duration = '8n', gain = 1.0) {
        if (!this.initialized) {
            console.warn('SynthEngine not initialized');
            return;
        }

        const synth = this.synths[synthType] || this.synths.sine;
        const frequency = Tone.Frequency(midiNote, 'midi').toFrequency();
        const velocity = gain; // Use gain as velocity (0-1 range is standard, but we allow 0-2)

        synth.triggerAttackRelease(frequency, duration, time, velocity);
    }

    /**
     * Create and play a synthesized drum sound
     * @param {string} type - Drum type (kick, snare, hihat, clap, etc.)
     * @param {number} time - When to play
     * @param {number} gain - Volume (0-2, default 1.0)
     */
    playDrum(type, time = '+0', gain = 1.0) {
        if (!this.initialized) return;

        switch (type.toLowerCase()) {
            case 'bd':
            case 'kick':
                this.playKick(time, gain);
                break;
            case 'sd':
            case 'snare':
                this.playSnare(time, gain);
                break;
            case 'hh':
            case 'hihat':
                this.playHihat(time, gain);
                break;
            case 'cp':
            case 'clap':
                this.playClap(time, gain);
                break;
            case 'oh':
            case 'openhh':
                this.playOpenHH(time, gain);
                break;
            default:
                console.warn(`Unknown drum type: ${type}`);
        }
    }

    /**
     * Synthesized kick drum
     */
    playKick(time, gain = 1.0) {
        const gainNode = new Tone.Gain(gain).connect(window.masterBus.getInput());
        const osc = new Tone.Oscillator(150, 'sine').connect(gainNode);
        const env = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.4,
            sustain: 0,
            release: 0.01
        }).connect(gainNode);

        osc.connect(env);
        osc.start(time).stop(time + 0.5);
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
        env.triggerAttackRelease(0.5, time);

        // Cleanup nodes after playback to prevent memory leak
        setTimeout(() => {
            try {
                osc.dispose();
                env.dispose();
                gainNode.dispose();
            } catch (e) {
                // Silently ignore disposal errors
            }
        }, (time - Tone.now()) * 1000 + 1000);
    }

    /**
     * Synthesized snare drum
     */
    playSnare(time, gain = 1.0) {
        const gainNode = new Tone.Gain(gain).connect(window.masterBus.getInput());

        // Noise component
        const noise = new Tone.Noise('white');
        const noiseEnv = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.15,
            sustain: 0,
            release: 0.01
        }).connect(gainNode);

        const noiseFilter = new Tone.Filter(4000, 'highpass').connect(noiseEnv);
        noise.connect(noiseFilter);

        // Tone component
        const osc = new Tone.Oscillator(200, 'triangle');
        const oscEnv = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.1,
            sustain: 0,
            release: 0.01
        }).connect(gainNode);

        osc.connect(oscEnv);

        noise.start(time).stop(time + 0.2);
        noiseEnv.triggerAttackRelease(0.15, time);

        osc.start(time).stop(time + 0.15);
        oscEnv.triggerAttackRelease(0.1, time);

        // Cleanup nodes after playback
        setTimeout(() => {
            try {
                noise.dispose();
                noiseFilter.dispose();
                noiseEnv.dispose();
                osc.dispose();
                oscEnv.dispose();
                gainNode.dispose();
            } catch (e) {
                // Silently ignore disposal errors
            }
        }, (time - Tone.now()) * 1000 + 500);
    }

    /**
     * Synthesized hi-hat
     */
    playHihat(time, gain = 1.0) {
        const gainNode = new Tone.Gain(gain).connect(window.masterBus.getInput());
        const noise = new Tone.Noise('white');
        const filter = new Tone.Filter(8000, 'highpass');
        const env = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.05,
            sustain: 0,
            release: 0.01
        }).connect(gainNode);

        noise.connect(filter);
        filter.connect(env);

        noise.start(time).stop(time + 0.1);
        env.triggerAttackRelease(0.05, time);

        // Cleanup nodes after playback
        setTimeout(() => {
            try {
                noise.dispose();
                filter.dispose();
                env.dispose();
                gainNode.dispose();
            } catch (e) {
                // Silently ignore disposal errors
            }
        }, (time - Tone.now()) * 1000 + 200);
    }

    /**
     * Synthesized clap
     */
    playClap(time, gain = 1.0) {
        const gainNode = new Tone.Gain(gain).connect(window.masterBus.getInput());
        const noise = new Tone.Noise('white');
        const filter = new Tone.Filter(2000, 'bandpass');
        const env = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.08,
            sustain: 0.2,
            release: 0.05
        }).connect(gainNode);

        noise.connect(filter);
        filter.connect(env);

        // Multiple hits for clap
        noise.start(time).stop(time + 0.15);
        env.triggerAttackRelease(0.05, time);
        env.triggerAttackRelease(0.05, time + 0.02);
        env.triggerAttackRelease(0.1, time + 0.04);

        // Cleanup nodes after playback
        setTimeout(() => {
            try {
                noise.dispose();
                filter.dispose();
                env.dispose();
                gainNode.dispose();
            } catch (e) {
                // Silently ignore disposal errors
            }
        }, (time - Tone.now()) * 1000 + 300);
    }

    /**
     * Synthesized open hi-hat
     */
    playOpenHH(time, gain = 1.0) {
        const gainNode = new Tone.Gain(gain).connect(window.masterBus.getInput());
        const noise = new Tone.Noise('white');
        const filter = new Tone.Filter(7000, 'highpass');
        const env = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.3,
            sustain: 0,
            release: 0.1
        }).connect(gainNode);

        noise.connect(filter);
        filter.connect(env);

        noise.start(time).stop(time + 0.5);
        env.triggerAttackRelease(0.3, time);

        // Cleanup nodes after playback
        setTimeout(() => {
            try {
                noise.dispose();
                filter.dispose();
                env.dispose();
                gainNode.dispose();
            } catch (e) {
                // Silently ignore disposal errors
            }
        }, (time - Tone.now()) * 1000 + 600);
    }

    /**
     * Set master volume
     * @param {number} volume - Volume 0-1
     */
    setVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.rampTo(volume, 0.1);
        }
    }
}

// Create global instance
window.synthEngine = new SynthEngine();
