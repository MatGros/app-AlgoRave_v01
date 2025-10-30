/**
 * ALGORAVE - Pattern Scheduler
 * Schedules and plays patterns using Tone.js Transport
 */

class PatternScheduler {
    constructor() {
        this.patterns = new Map(); // id -> pattern
        this.currentCycle = 0;
        this.bpm = 135;
        this.isPlaying = false;
        this.initialized = false;
    }

    /**
     * Initialize scheduler
     */
    async init() {
        if (this.initialized) return;

        // Initialize audio engines
        await window.synthEngine.init();
        await window.sampleLibrary.init();
        window.effectsEngine.init();

        // Setup Tone.js Transport
        Tone.Transport.bpm.value = this.bpm;
        Tone.Transport.timeSignature = 4;

        // Schedule pattern playback
        Tone.Transport.scheduleRepeat((time) => {
            this.scheduleCycle(time);
        }, '1m'); // Every measure (1 cycle)

        this.initialized = true;
        console.log('Scheduler initialized');
    }

    /**
     * Schedule all patterns for the current cycle
     */
    scheduleCycle(time) {
        this.currentCycle++;

        // Update parser cycle for alternation
        window.parser.currentCycle = this.currentCycle;

        // Schedule each pattern
        this.patterns.forEach((pattern, id) => {
            // Safety check: ensure pattern is valid
            if (pattern && typeof pattern.getEventsForCycle === 'function') {
                this.schedulePattern(pattern, time, this.currentCycle);
            }
        });

        // Update UI
        if (window.updateCycleDisplay) {
            window.updateCycleDisplay(this.currentCycle);
        }
    }

    /**
     * Schedule a single pattern's events
     */
    schedulePattern(pattern, time, cycleNumber) {
        const events = pattern.getEventsForCycle(cycleNumber);
        const gain = pattern.effects.gain || 1.0;

        events.forEach(event => {
            const eventTime = time + (event.time * 4); // 4 beats per cycle
            const duration = event.duration * 4; // in beats

            if (pattern.type === 'sound') {
                // Play sample/drum with gain
                window.sampleLibrary.play(event.sound, eventTime, gain);
            } else if (pattern.type === 'note') {
                // Play note with synth
                const synthType = pattern.synthType || 'sawtooth';
                const midiNote = typeof event.sound === 'number'
                    ? event.sound
                    : window.parser.parseNote(event.sound);

                window.synthEngine.playNote(
                    midiNote,
                    synthType,
                    eventTime,
                    duration + 's',
                    gain
                );
            }
        });
    }

    /**
     * Add or update a pattern
     */
    setPattern(id, pattern) {
        this.patterns.set(id, pattern);
        console.log(`Pattern ${id} registered:`, pattern.toString());

        // Update active patterns display
        if (window.updateActivePatterns) {
            window.updateActivePatterns(this.patterns);
        }
    }

    /**
     * Remove a pattern
     */
    removePattern(id) {
        this.patterns.delete(id);

        if (window.updateActivePatterns) {
            window.updateActivePatterns(this.patterns);
        }
    }

    /**
     * Clear all patterns
     */
    clearPatterns() {
        this.patterns.clear();

        if (window.updateActivePatterns) {
            window.updateActivePatterns(this.patterns);
        }
    }

    /**
     * Start playback
     */
    async start() {
        if (!this.initialized) {
            await this.init();
        }

        if (this.isPlaying) return;

        Tone.Transport.start();
        this.isPlaying = true;
        this.currentCycle = 0;

        console.log('Playback started');
    }

    /**
     * Stop playback
     */
    stop() {
        if (!this.isPlaying) return;

        Tone.Transport.stop();
        this.isPlaying = false;
        this.currentCycle = 0;

        console.log('Playback stopped');
    }

    /**
     * Set BPM
     */
    setBPM(bpm) {
        this.bpm = Math.max(60, Math.min(200, bpm));
        Tone.Transport.bpm.value = this.bpm;
        console.log(`BPM set to ${this.bpm}`);
    }

    /**
     * Get current state
     */
    getState() {
        return {
            isPlaying: this.isPlaying,
            bpm: this.bpm,
            currentCycle: this.currentCycle,
            patternCount: this.patterns.size
        };
    }
}

// Create global instance
window.scheduler = new PatternScheduler();
