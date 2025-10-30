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
     * @param {Object|number} effects - Effect settings {gain, room, delay, lpf, hpf, pan} or just gain for backward compat
     */
    playNote(midiNote, synthType = 'sine', time = '+0', duration = '8n', effects = {gain: 1.0}) {
        if (!this.initialized) {
            console.warn('SynthEngine not initialized');
            return;
        }

        // Backward compatibility: if effects is a number, treat it as gain
        if (typeof effects === 'number') {
            effects = { gain: effects };
        }

        if (!effects) effects = {};
        const gain = effects.gain !== undefined ? effects.gain : 1.0;

        const synth = this.synths[synthType] || this.synths.sine;
        const frequency = Tone.Frequency(midiNote, 'midi').toFrequency();
        const velocity = gain; // Use gain as velocity

        synth.triggerAttackRelease(frequency, duration, time, velocity);
    }

    /**
     * Create and play a synthesized drum sound with effect chain
     * @param {string} type - Drum type (kick, snare, hihat, clap, etc.)
     * @param {number} time - When to play
     * @param {Object|number} effects - Effect settings {gain, room, delay, lpf, hpf, pan} or just gain for backward compat
     * @param {number} duration - Duration of the drum (in seconds) - used for envelope timing
     */
    playDrum(type, time = '+0', effects = {gain: 1.0}, duration = null) {
        if (!this.initialized) return;

        // Backward compatibility: if effects is a number, treat it as gain
        if (typeof effects === 'number') {
            effects = { gain: effects };
        }

        if (!effects) effects = {};

        switch (type.toLowerCase()) {
            case 'bd':
            case 'kick':
                this.playKick(time, effects, duration);
                break;
            case 'sd':
            case 'snare':
                this.playSnare(time, effects, duration);
                break;
            case 'hh':
            case 'hihat':
                this.playHihat(time, effects, duration);
                break;
            case 'cp':
            case 'clap':
                this.playClap(time, effects, duration);
                break;
            case 'oh':
            case 'openhh':
                this.playOpenHH(time, effects, duration);
                break;
            default:
                console.warn(`Unknown drum type: ${type}`);
        }
    }

    /**
     * Synthesized kick drum with effect chain
     * @param {number} time - When to play
     * @param {Object} effects - Effect settings
     * @param {number} duration - Event duration in seconds (respects pattern timing)
     */
    playKick(time, effects = {gain: 1.0}, duration = null) {
        // Ensure effects is an object
        if (typeof effects === 'number') {
            effects = { gain: effects };
        }
        if (!effects) effects = {};

        // FIXED DURATION for tight kick drum (300ms)
        // Ignores the scheduler duration parameter (which represents time slot, not sound duration)
        const kickDuration = 0.3;

        // Create source node that will feed into effect chain
        const sourceGain = new Tone.Gain(1.0);
        const osc = new Tone.Oscillator(150, 'sine').connect(sourceGain);
        const env = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.24,  // Fixed decay for tight kick
            sustain: 0,
            release: 0.01
        }).connect(sourceGain);

        osc.connect(env);

        // Create effect chain for this drum
        const effectChain = window.effectsEngine.createEffectChain(effects, sourceGain);

        // Connect effect chain output to master bus
        effectChain.connect(window.masterBus.getInput());

        // Frequency envelope: pitch falls from 150 to 40 Hz
        osc.start(time).stop(time + kickDuration);
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.03);
        env.triggerAttackRelease(kickDuration, time);

        // Cleanup nodes after playback
        setTimeout(() => {
            try {
                osc.dispose();
                env.dispose();
                sourceGain.dispose();
                effectChain.dispose();
            } catch (e) {
                // Silently ignore disposal errors
            }
        }, 400); // Fixed 400ms cleanup
    }

    /**
     * Synthesized snare drum with effect chain
     * @param {number} time - When to play
     * @param {Object} effects - Effect settings
     * @param {number} duration - Event duration in seconds (respects pattern timing)
     */
    playSnare(time, effects = {gain: 1.0}, duration = null) {
        // Ensure effects is an object
        if (typeof effects === 'number') {
            effects = { gain: effects };
        }
        if (!effects) effects = {};

        // FIXED DURATION for snappy snare (150ms)
        // Ignores the scheduler duration parameter (which represents time slot, not sound duration)
        const snareDuration = 0.15;

        // Create source node that will feed into effect chain
        const sourceGain = new Tone.Gain(1.0);

        // Noise component
        const noise = new Tone.Noise('white');
        const noiseEnv = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.1,  // Fixed decay for snare noise
            sustain: 0,
            release: 0.01
        }).connect(sourceGain);

        const noiseFilter = new Tone.Filter(4000, 'highpass').connect(noiseEnv);
        noise.connect(noiseFilter);

        // Tone component
        const osc = new Tone.Oscillator(200, 'triangle');
        const oscEnv = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.075,  // Fixed decay for snare tone
            sustain: 0,
            release: 0.01
        }).connect(sourceGain);

        osc.connect(oscEnv);

        // Create effect chain for this drum
        const effectChain = window.effectsEngine.createEffectChain(effects, sourceGain);

        // Connect effect chain output to master bus
        effectChain.connect(window.masterBus.getInput());

        noise.start(time).stop(time + snareDuration);
        noiseEnv.triggerAttackRelease(0.1, time);

        osc.start(time).stop(time + snareDuration);
        oscEnv.triggerAttackRelease(0.075, time);

        // Cleanup nodes after playback
        setTimeout(() => {
            try {
                noise.dispose();
                noiseFilter.dispose();
                noiseEnv.dispose();
                osc.dispose();
                oscEnv.dispose();
                sourceGain.dispose();
                effectChain.dispose();
            } catch (e) {
                // Silently ignore disposal errors
            }
        }, 250); // Fixed 250ms cleanup
    }

    /**
     * Synthesized hi-hat with effect chain
     * @param {number} time - When to play
     * @param {Object} effects - Effect settings
     * @param {number} duration - Event duration (scheduler parameter - NOT used for envelope)
     */
    playHihat(time, effects = {gain: 1.0}, duration = null) {
        // Ensure effects is an object
        if (typeof effects === 'number') {
            effects = { gain: effects };
        }
        if (!effects) effects = {};

        // FIXED DURATION for snappy hihat sound (50ms)
        // Ignores the scheduler duration parameter (which represents time slot, not sound duration)
        const hihatDuration = 0.05;

        // Create source node that will feed into effect chain
        const sourceGain = new Tone.Gain(1.0);
        const noise = new Tone.Noise('white');
        const filter = new Tone.Filter(8000, 'highpass');
        const env = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.04,  // Fixed decay for crisp hihat
            sustain: 0,
            release: 0.01
        }).connect(sourceGain);

        noise.connect(filter);
        filter.connect(env);

        // Create effect chain for this drum
        const effectChain = window.effectsEngine.createEffectChain(effects, sourceGain);

        // Connect effect chain output to master bus
        effectChain.connect(window.masterBus.getInput());

        noise.start(time).stop(time + hihatDuration);
        env.triggerAttackRelease(0.04, time);

        // Cleanup nodes after playback
        setTimeout(() => {
            try {
                noise.dispose();
                filter.dispose();
                env.dispose();
                sourceGain.dispose();
                effectChain.dispose();
            } catch (e) {
                // Silently ignore disposal errors
            }
        }, 150); // Fixed 150ms cleanup
    }

    /**
     * Synthesized clap with effect chain
     * @param {number} time - When to play
     * @param {Object} effects - Effect settings
     * @param {number} duration - Event duration in seconds (respects pattern timing)
     */
    playClap(time, effects = {gain: 1.0}, duration = null) {
        // Ensure effects is an object
        if (typeof effects === 'number') {
            effects = { gain: effects };
        }
        if (!effects) effects = {};

        // FIXED DURATION for natural clap (120ms)
        // Ignores the scheduler duration parameter (which represents time slot, not sound duration)
        const clapDuration = 0.12;

        // Create source node that will feed into effect chain
        const sourceGain = new Tone.Gain(1.0);
        const noise = new Tone.Noise('white');
        const filter = new Tone.Filter(2000, 'bandpass');
        const env = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.064,  // Fixed decay for clap
            sustain: 0.2,
            release: 0.04
        }).connect(sourceGain);

        noise.connect(filter);
        filter.connect(env);

        // Create effect chain for this drum
        const effectChain = window.effectsEngine.createEffectChain(effects, sourceGain);

        // Connect effect chain output to master bus
        effectChain.connect(window.masterBus.getInput());

        // Multiple hits for clap (fixed spacing)
        noise.start(time).stop(time + clapDuration);
        env.triggerAttackRelease(0.04, time);
        env.triggerAttackRelease(0.04, time + 0.015);
        env.triggerAttackRelease(0.08, time + 0.032);

        // Cleanup nodes after playback
        setTimeout(() => {
            try {
                noise.dispose();
                filter.dispose();
                env.dispose();
                sourceGain.dispose();
                effectChain.dispose();
            } catch (e) {
                // Silently ignore disposal errors
            }
        }, 220); // Fixed 220ms cleanup
    }

    /**
     * Synthesized open hi-hat with effect chain
     * @param {number} time - When to play
     * @param {Object} effects - Effect settings
     * @param {number} duration - Event duration in seconds (respects pattern timing)
     */
    playOpenHH(time, effects = {gain: 1.0}, duration = null) {
        // Ensure effects is an object
        if (typeof effects === 'number') {
            effects = { gain: effects };
        }
        if (!effects) effects = {};

        // FIXED DURATION for open hi-hat (250ms)
        // Ignores the scheduler duration parameter (which represents time slot, not sound duration)
        const openHHDuration = 0.25;

        // Create source node that will feed into effect chain
        const sourceGain = new Tone.Gain(1.0);
        const noise = new Tone.Noise('white');
        const filter = new Tone.Filter(7000, 'highpass');
        const env = new Tone.AmplitudeEnvelope({
            attack: 0.001,
            decay: 0.15,  // Fixed decay for open hihat
            sustain: 0,
            release: 0.05
        }).connect(sourceGain);

        noise.connect(filter);
        filter.connect(env);

        // Create effect chain for this drum
        const effectChain = window.effectsEngine.createEffectChain(effects, sourceGain);

        // Connect effect chain output to master bus
        effectChain.connect(window.masterBus.getInput());

        noise.start(time).stop(time + openHHDuration);
        env.triggerAttackRelease(0.15, time);

        // Cleanup nodes after playback
        setTimeout(() => {
            try {
                noise.dispose();
                filter.dispose();
                env.dispose();
                sourceGain.dispose();
                effectChain.dispose();
            } catch (e) {
                // Silently ignore disposal errors
            }
        }, 350); // Fixed 350ms cleanup
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
