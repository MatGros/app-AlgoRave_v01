/**
 * AlgoSignalSound - Pattern Scheduler
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
                this.schedulePattern(pattern, time, this.currentCycle, id);
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

            // Trigger beat pulse for psychedelic visuals
            if (window.psychedelicVisuals) {
                window.psychedelicVisuals.onBeat();
            }
        } catch (e) {
            // Silently ignore errors
        }
    }

    /**
     * Schedule a single pattern's events
     */
    schedulePattern(pattern, time, cycleNumber, slotId) {
        const events = pattern.getEventsForCycle(cycleNumber);

        // Pass the complete effects object (including gain, room, delay, lpf, hpf, pan)
        const effects = pattern.effects || { gain: 1.0 };

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
                // Play sample/drum with complete effects and duration for timing
                // Store duration in effects object for fallback synths
                const effectsWithDuration = { ...effects, _duration: duration };
                window.sampleLibrary.play(event.sound, eventTime, effectsWithDuration, slotId);
            } else if (pattern.type === 'note') {
                // Play note with synth and complete effects
                const synthType = pattern.synthType || 'sawtooth';
                const midiNote = typeof event.sound === 'number'
                    ? event.sound
                    : window.parser.parseNote(event.sound);

                window.synthEngine.playNote(
                    midiNote,
                    synthType,
                    eventTime,
                    duration + 's',
                    effects,
                    slotId
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

        // Start a high-precision metronome timer with drift compensation
        // At 135 BPM: 1 beat = 444ms (pulse 4 times per measure)
        const beatDurationMs = 60000 / this.bpm; // milliseconds per beat
        const cycleDurationMs = beatDurationMs * 4; // 4 beats per cycle
        
        // Use high-precision timing with drift correction
        let beatCounter = 0;
        let expectedTime = Date.now() + beatDurationMs;
        
        const tick = () => {
            if (!this.isPlaying) return;
            
            const now = Date.now();
            const drift = now - expectedTime;
            
            // Pulse LED on every beat
            this.pulseMetronome();
            
            // Trigger cycle pattern only on beat 1 of 4
            beatCounter++;
            if (beatCounter >= 4) {
                beatCounter = 0;
                // Use immediate time - let Tone.js handle the minimal scheduling needed
                this.scheduleCycle(Tone.now());
            }
            
            // Schedule next tick with drift compensation
            expectedTime += beatDurationMs;
            const nextInterval = Math.max(0, beatDurationMs - drift);
            this.metronomeInterval = setTimeout(tick, nextInterval);
        };
        
        // Start the first tick
        this.metronomeInterval = setTimeout(tick, beatDurationMs);

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
            clearTimeout(this.metronomeInterval);
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
        
        // If playing, restart the metronome with new BPM
        // Just stop and restart - the new timing will be picked up automatically
        if (this.isPlaying) {
            const wasPlaying = true;
            this.stop();
            if (wasPlaying) {
                // Use setTimeout to ensure clean restart
                setTimeout(() => this.start(), 10);
            }
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
