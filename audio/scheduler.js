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
        this.metronomeInterval = null; // Timer pour le métronome
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

        // Transport still needed for synth note scheduling (for duration)
        // but we're NOT using scheduleRepeat for cycles
        // Patterns are now triggered immediately from independent metronome timer

        this.initialized = true;
        console.log('Scheduler initialized');
        console.log('Transport lookAhead:', Tone.Transport.lookAhead);
        console.log('Transport updateInterval:', Tone.Transport.updateInterval);
    }

    /**
     * Schedule all patterns for the current cycle
     */
    scheduleCycle(time) {
        this.currentCycle++;

        // Update parser cycle for alternation
        window.parser.currentCycle = this.currentCycle;
        
        // Log every 4 cycles (reduce spam)
        if (this.currentCycle % 4 === 0) {
            console.log(`Cycle ${this.currentCycle} at time ${time.toFixed(2)}s`);
        }

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
     * Pulse the metronome LED
     */
    pulseMetronome() {
        try {
            const led = document.getElementById('metronomeLed');
            if (!led) {
                return;
            }

            // Force animation restart by removing class, forcing reflow, then adding back
            led.classList.remove('pulse');
            
            // Force browser reflow by reading offsetHeight
            void led.offsetHeight;
            
            // Add class back immediately
            led.classList.add('pulse');
        } catch (e) {
            // Silently ignore errors
        }
    }

    /**
     * Schedule a single pattern's events
     */
    schedulePattern(pattern, time, cycleNumber) {
        const events = pattern.getEventsForCycle(cycleNumber);
        const gain = pattern.effects.gain || 1.0;

        // Calculate exact timing for each event within the cycle
        // At 135 BPM: 1 beat = 0.444s, so event.time (0-1) maps to 0-1.778s
        const beatDuration = 60 / this.bpm; // seconds per beat
        const cycleDuration = beatDuration * 4; // 4 beats per cycle

        events.forEach(event => {
            // Calculate offset from cycle start in seconds
            const offset = event.time * cycleDuration;
            const eventTime = time + offset;
            const duration = event.duration * cycleDuration; // in seconds

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

        // Start a reliable metronome timer (independent of Tone.Transport)
        // At 135 BPM: 1 cycle/measure = 1.778 seconds
        const cycleDurationMs = (60000 / this.bpm) * 4; // 4 beats per cycle
        
        let lastPulseTime = Date.now();
        this.metronomeInterval = setInterval(() => {
            if (this.isPlaying) {
                const now = Date.now();
                const actualInterval = now - lastPulseTime;
                console.log(`⏱️ LED pulse (actual interval: ${actualInterval}ms, expected: ${cycleDurationMs.toFixed(0)}ms)`);
                lastPulseTime = now;
                
                // Pulse LED IMMEDIATELY when timer fires (perfect sync)
                this.pulseMetronome();
                
                // Trigger patterns with tiny offset (0.05s) for audio system to process
                const toneNow = Tone.now();
                this.scheduleCycle(toneNow + 0.05); // Small 50ms buffer for audio processing
            }
        }, cycleDurationMs);

        console.log('Playback started');
        console.log(`Metronome interval: ${cycleDurationMs.toFixed(0)}ms at ${this.bpm} BPM`);
    }

    /**
     * Stop playback
     */
    stop() {
        if (!this.isPlaying) return;

        Tone.Transport.stop();
        this.isPlaying = false;
        this.currentCycle = 0;

        // Stop the metronome timer
        if (this.metronomeInterval) {
            clearInterval(this.metronomeInterval);
            this.metronomeInterval = null;
        }

        console.log('Playback stopped');
    }

    /**
     * Set BPM
     */
    setBPM(bpm) {
        this.bpm = Math.max(60, Math.min(200, bpm));
        Tone.Transport.bpm.value = this.bpm;
        
        // If playing, restart the metronome interval with new BPM
        if (this.isPlaying && this.metronomeInterval) {
            clearInterval(this.metronomeInterval);
            
            const cycleDurationMs = (60000 / this.bpm) * 4; // 4 beats per cycle
            this.metronomeInterval = setInterval(() => {
                if (this.isPlaying) {
                    this.pulseMetronome();
                }
            }, cycleDurationMs);
        }
        
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
