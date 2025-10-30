/**
 * ALGORAVE - Sample Management
 * For now uses synthesized drums, can be extended to load actual samples
 */

class SampleLibrary {
    constructor() {
        this.samples = {};
        this.loaded = false;
    }

    /**
     * Initialize sample library
     * For now, we'll use synthesized drums from synthEngine
     */
    async init() {
        // Sample names mapped to synth drum types
        this.samples = {
            'bd': 'kick',
            'sd': 'snare',
            'hh': 'hihat',
            'cp': 'clap',
            'oh': 'openhh',
            'kick': 'kick',
            'snare': 'snare',
            'hihat': 'hihat',
            'clap': 'clap',
            'openhh': 'openhh'
        };

        this.loaded = true;
    }

    /**
     * Play a sample
     * @param {string} name - Sample name
     * @param {number} time - When to play
     * @param {number} gain - Volume (0-2, default 1.0)
     */
    play(name, time = '+0', gain = 1.0) {
        if (!this.loaded) {
            console.warn('SampleLibrary not loaded');
            return;
        }

        const drumType = this.samples[name.toLowerCase()];
        if (drumType) {
            window.synthEngine.playDrum(drumType, time, gain);
        } else {
            console.warn(`Sample not found: ${name}`);
        }
    }

    /**
     * Check if sample exists
     */
    has(name) {
        return this.samples.hasOwnProperty(name.toLowerCase());
    }
}

// Create global instance
window.sampleLibrary = new SampleLibrary();
