/**
 * Slot Analyser - Per-slot audio volume tracking
 * Monitors the audio output of each slot independently
 */

class SlotAnalyser {
    constructor() {
        this.analysers = new Map(); // slot -> analyser node
        this.volumes = new Map();   // slot -> current volume (0-1)
        this.smoothedVolumes = new Map(); // slot -> smoothed volume
        this.smoothingFactor = 0.3; // lower = more smooth
    }

    /**
     * Create analyser for a slot
     */
    createAnalyserForSlot(slotId) {
        if (this.analysers.has(slotId)) {
            return this.analysers.get(slotId);
        }

        try {
            const analyser = new Tone.Analyser('waveform', 512);
            this.analysers.set(slotId, analyser);
            this.volumes.set(slotId, 0);
            this.smoothedVolumes.set(slotId, 0);
            return analyser;
        } catch (e) {
            console.warn(`Could not create analyser for ${slotId}:`, e.message);
            return null;
        }
    }

    /**
     * Get current volume for a slot (smoothed)
     * Returns value from 0 to 1
     */
    getVolume(slotId) {
        return this.smoothedVolumes.get(slotId) || 0;
    }

    /**
     * Get raw volume for a slot (unsmoothed)
     */
    getRawVolume(slotId) {
        return this.volumes.get(slotId) || 0;
    }

    /**
     * Update volume reading from analyser
     * Should be called in animation loop
     */
    updateVolume(slotId) {
        const analyser = this.analysers.get(slotId);
        if (!analyser) return 0;

        try {
            const waveform = analyser.getValue();
            let sum = 0;

            // Calculate RMS (Root Mean Square)
            for (let i = 0; i < waveform.length; i++) {
                sum += waveform[i] * waveform[i];
            }
            const rms = Math.sqrt(sum / waveform.length);
            const rawVolume = Math.min(1, Math.abs(rms) * 2); // Scale and cap at 1

            // Store raw volume
            this.volumes.set(slotId, rawVolume);

            // Apply smoothing
            const currentSmoothed = this.smoothedVolumes.get(slotId) || 0;
            const smoothed = currentSmoothed * (1 - this.smoothingFactor) + rawVolume * this.smoothingFactor;
            this.smoothedVolumes.set(slotId, smoothed);

            return smoothed;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Update all slots
     */
    updateAll() {
        for (const [slotId] of this.analysers) {
            this.updateVolume(slotId);
        }
    }

    /**
     * Remove analyser for a slot
     */
    removeAnalyser(slotId) {
        const analyser = this.analysers.get(slotId);
        if (analyser) {
            try {
                analyser.dispose();
            } catch (e) {
                // Ignore disposal errors
            }
        }
        this.analysers.delete(slotId);
        this.volumes.delete(slotId);
        this.smoothedVolumes.delete(slotId);
    }

    /**
     * Set smoothing factor (0-1, lower = more smooth)
     */
    setSmoothing(factor) {
        this.smoothingFactor = Math.max(0, Math.min(1, factor));
    }

    /**
     * Reset all volumes
     */
    reset() {
        for (const [slotId] of this.analysers) {
            this.volumes.set(slotId, 0);
            this.smoothedVolumes.set(slotId, 0);
        }
    }
}

// Export for use in modules
if (typeof window !== 'undefined') {
    window.slotAnalyser = new SlotAnalyser();
}
