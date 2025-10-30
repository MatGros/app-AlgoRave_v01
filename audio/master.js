/**
 * ALGORAVE - Master Effects Bus
 * Global effects applied to the entire mix using Tone.js
 */

class MasterBus {
    constructor() {
        this.initialized = false;
        this.effects = {};
        this.chain = null;
        this.uiUpdateCallback = null; // Callback pour mettre à jour l'UI
    }

    /**
     * Register UI update callback
     * @param {Function} callback - Function to call when values change
     */
    setUIUpdateCallback(callback) {
        this.uiUpdateCallback = callback;
    }

    /**
     * Notify UI of value changes
     * @param {string} param - Parameter name
     * @param {number} value - New value
     */
    notifyUI(param, value) {
        try {
            if (this.uiUpdateCallback && typeof this.uiUpdateCallback === 'function') {
                this.uiUpdateCallback(param, value);
            }
        } catch (e) {
            // Silently ignore UI update errors to not block audio
            console.warn('UI update callback error:', e);
        }
    }

    /**
     * Initialize master effects chain
     */
    async init() {
        if (this.initialized) return;

        try {
            // Ensure Tone.context exists
            if (!Tone.context) {
                console.warn('Tone.context not available, creating AudioContext...');
                // Force creation of audio context
                await Tone.start();
            }

            // Log audio context info
            console.log('Master Bus initializing...');
            if (Tone.context) {
                console.log('Context state:', Tone.context.state);
            }
        } catch (e) {
            console.warn('Could not initialize Tone context:', e);
        }

        // Create effects chain (order matters!)
        // Signal flow: Input → HPF → LPF → Compressor → Reverb → Delay → Output

        // High-pass filter (pour couper les basses/kicks si besoin)
        this.effects.hpf = new Tone.Filter({
            type: 'highpass',
            frequency: 20,  // Default: transparent (20Hz)
            rolloff: -24,
            Q: 1
        });

        // Low-pass filter (pour atténuer les aigus)
        this.effects.lpf = new Tone.Filter({
            type: 'lowpass',
            frequency: 20000,  // Default: transparent (20kHz)
            rolloff: -24,
            Q: 1
        });

        // Compressor (pour contrôler la dynamique)
        this.effects.compressor = new Tone.Compressor({
            threshold: -20,  // dB
            ratio: 4,        // Compression ratio
            attack: 0.003,   // Fast attack
            release: 0.25,   // Medium release
            knee: 10         // Soft knee
        });

        // Reverb master (ambiance globale)
        this.effects.reverb = new Tone.Reverb({
            decay: 2.5,
            preDelay: 0.01,
            wet: 0  // Default: 0 (dry)
        });

        // Delay master (echo global)
        this.effects.delay = new Tone.FeedbackDelay({
            delayTime: '8n',  // 1/8 note
            feedback: 0.3,
            wet: 0  // Default: 0 (dry)
        });

        // Master gain (volume final)
        this.effects.gain = new Tone.Gain(0.8);

        // Limiter (protection contre le clipping)
        this.effects.limiter = new Tone.Limiter(-1);

        // Build the effects chain
        this.effects.hpf.chain(
            this.effects.lpf,
            this.effects.compressor,
            this.effects.reverb,
            this.effects.delay,
            this.effects.gain,
            this.effects.limiter,
            Tone.Destination
        );

        // Wait for reverb to be ready
        await this.effects.reverb.ready;

        // Store the input of the chain
        this.chain = this.effects.hpf;

        this.initialized = true;
        console.log('Master Bus initialized');
    }

    /**
     * Get the input node for the master chain
     */
    getInput() {
        return this.chain;
    }

    /**
     * Set master low-pass filter frequency
     * @param {number} freq - Frequency in Hz (20-20000)
     */
    setLPF(freq) {
        if (!this.initialized) return;
        const frequency = Math.max(20, Math.min(20000, freq));

        try {
            this.effects.lpf.frequency.rampTo(frequency, 0.1);
            console.log(`Master LPF: ${frequency}Hz`);
        } catch (e) {
            console.error('Error setting LPF:', e);
        }

        this.notifyUI('lpf', frequency); // Update UI
    }

    /**
     * Set master high-pass filter frequency
     * @param {number} freq - Frequency in Hz (20-20000)
     * Utile pour couper les basses/kicks: utilisez 100-200Hz
     */
    setHPF(freq) {
        if (!this.initialized) return;
        const frequency = Math.max(20, Math.min(20000, freq));

        try {
            this.effects.hpf.frequency.rampTo(frequency, 0.1);
            console.log(`Master HPF: ${frequency}Hz`);
        } catch (e) {
            console.error('Error setting HPF:', e);
        }

        this.notifyUI('hpf', frequency); // Update UI
    }

    /**
     * Set master compressor threshold
     * @param {number} threshold - dB (-100 to 0)
     */
    setCompressorThreshold(threshold) {
        if (!this.initialized) return;
        const db = Math.max(-100, Math.min(0, threshold));
        this.effects.compressor.threshold.value = db;
        console.log(`Master Compressor Threshold: ${db}dB`);
    }

    /**
     * Set master compressor ratio
     * @param {number} ratio - Compression ratio (1-20)
     */
    setCompressorRatio(ratio) {
        if (!this.initialized) return;
        const r = Math.max(1, Math.min(20, ratio));
        this.effects.compressor.ratio.value = r;
        console.log(`Master Compressor Ratio: ${r}:1`);
    }

    /**
     * Set master reverb amount
     * @param {number} amount - Wet amount (0-1)
     */
    setReverb(amount) {
        if (!this.initialized) return;
        const wet = Math.max(0, Math.min(1, amount));

        try {
            this.effects.reverb.wet.rampTo(wet, 0.1);
            console.log(`Master Reverb: ${(wet * 100).toFixed(0)}%`);
        } catch (e) {
            console.error('Error setting reverb:', e);
        }

        this.notifyUI('reverb', wet); // Update UI
    }

    /**
     * Set master reverb decay time
     * @param {number} decay - Decay time in seconds (0.1-10)
     */
    setReverbDecay(decay) {
        if (!this.initialized) return;
        const time = Math.max(0.1, Math.min(10, decay));
        this.effects.reverb.decay = time;
        console.log(`Master Reverb Decay: ${time}s`);
    }

    /**
     * Set master delay amount
     * @param {number} amount - Wet amount (0-1)
     */
    setDelay(amount) {
        if (!this.initialized) return;
        const wet = Math.max(0, Math.min(1, amount));

        try {
            this.effects.delay.wet.rampTo(wet, 0.1);
            console.log(`Master Delay: ${(wet * 100).toFixed(0)}%`);
        } catch (e) {
            console.error('Error setting delay:', e);
        }

        this.notifyUI('delay', wet); // Update UI
    }

    /**
     * Set master delay time
     * @param {string} time - Time value (e.g., '8n', '4n', '0.25')
     */
    setDelayTime(time) {
        if (!this.initialized) return;
        this.effects.delay.delayTime.value = time;
        console.log(`Master Delay Time: ${time}`);
    }

    /**
     * Set master delay feedback
     * @param {number} feedback - Feedback amount (0-0.95)
     */
    setDelayFeedback(feedback) {
        if (!this.initialized) return;
        const fb = Math.max(0, Math.min(0.95, feedback));
        this.effects.delay.feedback.value = fb;
        console.log(`Master Delay Feedback: ${(fb * 100).toFixed(0)}%`);
    }

    /**
     * Set master volume
     * @param {number} volume - Volume (0-2, default 0.8)
     */
    setVolume(volume) {
        if (!this.initialized) return;
        const vol = Math.max(0, Math.min(2, volume));

        try {
            this.effects.gain.gain.rampTo(vol, 0.1);
            console.log(`Master Volume: ${(vol * 100).toFixed(0)}%`);
        } catch (e) {
            console.error('Error setting volume:', e);
        }

        this.notifyUI('volume', vol); // Update UI
    }

    /**
     * Reset all effects to default
     */
    reset() {
        if (!this.initialized) return;

        // Reset all effects (will trigger UI updates via notifyUI)
        this.setLPF(20000);
        this.setHPF(20);
        this.setCompressorThreshold(-20);
        this.setCompressorRatio(4);
        this.setReverb(0);
        this.setDelay(0);
        this.setVolume(0.8);

        console.log('Master Bus reset to defaults');
    }

    /**
     * Get current state of all effects
     */
    getState() {
        if (!this.initialized) return {};

        return {
            lpf: this.effects.lpf.frequency.value,
            hpf: this.effects.hpf.frequency.value,
            compressorThreshold: this.effects.compressor.threshold.value,
            compressorRatio: this.effects.compressor.ratio.value,
            reverb: this.effects.reverb.wet.value,
            reverbDecay: this.effects.reverb.decay,
            delay: this.effects.delay.wet.value,
            delayTime: this.effects.delay.delayTime.value,
            delayFeedback: this.effects.delay.feedback.value,
            volume: this.effects.gain.gain.value
        };
    }
}

// Create global instance
window.masterBus = new MasterBus();
