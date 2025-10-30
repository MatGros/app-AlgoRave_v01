/**
 * ALGORAVE - Audio Effects
 * Manages audio effects using Tone.js
 */

class EffectsEngine {
    constructor() {
        this.effects = {};
        this.initialized = false;
    }

    /**
     * Initialize effects
     */
    init() {
        if (this.initialized) return;

        // Note: These effects are for individual patterns
        // Master effects are in masterBus

        // Create effect instances
        this.effects.reverb = new Tone.Reverb({
            decay: 2.5,
            wet: 0
        }).connect(window.masterBus.getInput());

        this.effects.delay = new Tone.FeedbackDelay({
            delayTime: '8n',
            feedback: 0.3,
            wet: 0
        }).connect(window.masterBus.getInput());

        this.effects.lpf = new Tone.Filter({
            type: 'lowpass',
            frequency: 20000,
            rolloff: -24
        }).connect(window.masterBus.getInput());

        this.effects.hpf = new Tone.Filter({
            type: 'highpass',
            frequency: 20,
            rolloff: -24
        }).connect(window.masterBus.getInput());

        this.effects.panner = new Tone.Panner(0).connect(window.masterBus.getInput());

        this.initialized = true;
    }

    /**
     * Apply effects to a pattern
     * @param {Pattern} pattern - Pattern with effects settings
     * @param {Tone.Signal} source - Audio source
     */
    applyEffects(pattern, source) {
        if (!this.initialized) return source;

        let chain = source;

        // Apply filters
        if (pattern.effects.lpf) {
            this.effects.lpf.frequency.value = pattern.effects.lpf;
            chain = chain.connect(this.effects.lpf);
        }

        if (pattern.effects.hpf) {
            this.effects.hpf.frequency.value = pattern.effects.hpf;
            chain = chain.connect(this.effects.hpf);
        }

        // Apply reverb
        if (pattern.effects.room > 0) {
            this.effects.reverb.wet.value = pattern.effects.room;
            chain = chain.connect(this.effects.reverb);
        }

        // Apply delay
        if (pattern.effects.delay > 0) {
            this.effects.delay.wet.value = pattern.effects.delay;
            chain = chain.connect(this.effects.delay);
        }

        // Apply panning
        if (pattern.effects.pan !== 0.5) {
            this.effects.panner.pan.value = (pattern.effects.pan - 0.5) * 2;
            chain = chain.connect(this.effects.panner);
        }

        return chain;
    }

    /**
     * Set global reverb amount
     */
    setReverb(amount) {
        if (this.effects.reverb) {
            this.effects.reverb.wet.value = amount;
        }
    }

    /**
     * Set global delay amount
     */
    setDelay(amount) {
        if (this.effects.delay) {
            this.effects.delay.wet.value = amount;
        }
    }
}

// Create global instance
window.effectsEngine = new EffectsEngine();
