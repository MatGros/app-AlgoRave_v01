/**
 * AlgoSignalSound - Pattern Class
 * Manages musical patterns with transformations
 */

class Pattern {
    constructor(events, type = 'sound') {
        this.events = events || [];
        this.type = type; // 'sound' or 'note'
        this.speed = 1.0;
        this.reversed = false;
        this.transformations = [];
        this.effects = {
            room: 0,
            delay: 0,
            lpf: null,
            hpf: null,
            pan: 0.5,
            gain: 1.0
        };
        this.synthType = null;
        this.id = Math.random().toString(36).substr(2, 9);
    }

    /**
     * Speed up the pattern
     * @param {number} factor - Speed multiplier
     */
    fast(factor = 2) {
        const newPattern = this.clone();
        newPattern.speed *= factor;
        newPattern.transformations.push({ type: 'fast', factor });
        return newPattern;
    }

    /**
     * Slow down the pattern
     * @param {number} factor - Slow divisor
     */
    slow(factor = 2) {
        const newPattern = this.clone();
        newPattern.speed /= factor;
        newPattern.transformations.push({ type: 'slow', factor });
        return newPattern;
    }

    /**
     * Reverse the pattern
     */
    rev() {
        const newPattern = this.clone();
        newPattern.reversed = !newPattern.reversed;
        newPattern.transformations.push({ type: 'rev' });
        return newPattern;
    }

    /**
     * Apply effect - Room reverb
     * @param {number} amount - Reverb amount (0-1)
     */
    room(amount) {
        this.effects.room = Math.max(0, Math.min(1, amount));
        return this;
    }

    /**
     * Apply effect - Delay
     * @param {number} amount - Delay amount (0-1)
     */
    delay(amount) {
        this.effects.delay = Math.max(0, Math.min(1, amount));
        return this;
    }

    /**
     * Apply effect - Low-pass filter
     * @param {number} freq - Cutoff frequency in Hz
     */
    lpf(freq) {
        this.effects.lpf = freq;
        return this;
    }

    /**
     * Apply effect - High-pass filter
     * @param {number} freq - Cutoff frequency in Hz
     */
    hpf(freq) {
        this.effects.hpf = freq;
        return this;
    }

    /**
     * Pan the sound
     * @param {number} position - Pan position (-1 to 1, or 0 to 1)
     */
    pan(position) {
        this.effects.pan = Math.max(-1, Math.min(1, position));
        return this;
    }

    /**
     * Set volume/gain
     * @param {number} amount - Gain amount (0-2, default 1.0)
     */
    gain(amount) {
        this.effects.gain = Math.max(0, Math.min(2, amount));
        return this;
    }

    /**
     * Set synthesizer type for note patterns
     * @param {string} type - Synth type (sine, square, sawtooth, triangle, fm)
     */
    s(type) {
        this.synthType = type;
        return this;
    }

    /**
     * Apply transformation every N cycles
     * @param {number} n - Every n cycles
     * @param {Function} fn - Transformation function
     */
    every(n, fn) {
        const newPattern = this.clone();
        newPattern.transformations.push({ type: 'every', n, fn });
        return newPattern;
    }

    /**
     * Sometimes apply a transformation (50% chance)
     * @param {Function} fn - Transformation function
     */
    sometimes(fn) {
        if (Math.random() < 0.5) {
            return fn(this);
        }
        return this;
    }

    /**
     * Rarely apply a transformation (25% chance)
     * @param {Function} fn - Transformation function
     */
    rarely(fn) {
        if (Math.random() < 0.25) {
            return fn(this);
        }
        return this;
    }

    /**
     * Often apply a transformation (75% chance)
     * @param {Function} fn - Transformation function
     */
    often(fn) {
        if (Math.random() < 0.75) {
            return fn(this);
        }
        return this;
    }

    /**
     * Get events for the current cycle with transformations applied
     * @param {number} cycleNumber - Current cycle number
     */
    getEventsForCycle(cycleNumber) {
        let events = [...this.events];

        // Apply speed
        if (this.speed !== 1.0) {
            events = events.map(e => ({
                ...e,
                time: e.time / this.speed,
                duration: e.duration / this.speed
            }));

            // If sped up, we might need to repeat events
            if (this.speed > 1.0) {
                const repetitions = Math.floor(this.speed);
                const allEvents = [];
                for (let i = 0; i < repetitions; i++) {
                    events.forEach(e => {
                        allEvents.push({
                            ...e,
                            time: (e.time + i) / repetitions
                        });
                    });
                }
                events = allEvents;
            }
        }

        // Apply reverse
        if (this.reversed) {
            events = events.map(e => ({
                ...e,
                time: 1.0 - e.time - e.duration
            })).reverse();
        }

        // Apply conditional transformations
        this.transformations.forEach(trans => {
            if (trans.type === 'every' && cycleNumber % trans.n === 0) {
                const transformed = trans.fn(new Pattern(events, this.type));
                events = transformed.events;
            }
        });

        return events;
    }

    /**
     * Clone the pattern
     */
    clone() {
        const cloned = new Pattern([...this.events], this.type);
        cloned.speed = this.speed;
        cloned.reversed = this.reversed;
        cloned.transformations = [...this.transformations];
        cloned.effects = { ...this.effects };
        cloned.synthType = this.synthType;
        return cloned;
    }

    /**
     * Get a string representation
     */
    toString() {
        const effectsStr = Object.entries(this.effects)
            .filter(([k, v]) => v !== 0 && v !== 0.5 && v !== null)
            .map(([k, v]) => `${k}:${v}`)
            .join(' ');

        const transStr = this.transformations
            .map(t => t.type)
            .join(',');

        return `Pattern(${this.type}, events:${this.events.length}${transStr ? ', trans:' + transStr : ''}${effectsStr ? ', fx:' + effectsStr : ''})`;
    }
}

/**
 * Stack multiple patterns together
 * @param {...Pattern} patterns - Patterns to stack
 * @returns {Pattern} Combined pattern with all events
 */
function stack(...patterns) {
    // Combine all events from all patterns
    const allEvents = [];
    let combinedType = 'sound';

    patterns.forEach(pattern => {
        if (pattern instanceof Pattern) {
            // Get base events from this pattern
            const events = pattern.getEventsForCycle(0);
            allEvents.push(...events);
            // Use first non-sound type if any
            if (pattern.type !== 'sound') {
                combinedType = pattern.type;
            }
        }
    });

    return new Pattern(allEvents, combinedType);
}

// Make available globally
window.Pattern = Pattern;
window.stack = stack;
