/**
 * ALGORAVE - Code Evaluator
 * Evaluates user code and creates patterns
 */

class CodeEvaluator {
    constructor() {
        this.patternCounter = 0;
        // Pattern slots like TidalCycles (d1, d2, d3, etc.)
        this.slots = {};
    }

    /**
     * Evaluate a line of code
     * @param {string} code - Code to evaluate
     * @returns {Object} Result object
     */
    evaluate(code) {
        code = code.trim();

        // Ignore empty lines and comments
        if (!code || code.startsWith('//')) {
            return { success: true, message: 'Skipped comment/empty line' };
        }

        try {
            // Create safe evaluation context with our API
            const context = this.createContext();

            // Wrap code in function and execute
            const func = new Function(...Object.keys(context), `
                try {
                    return ${code};
                } catch(e) {
                    // Try as statement instead of expression
                    ${code};
                    return undefined;
                }
            `);

            const result = func(...Object.values(context));

            // If result has a success property, it's from a slot or control function
            if (result && result.success !== undefined) {
                return result;
            }

            // Legacy: If result is a pattern without slot, warn user
            if (result instanceof Pattern) {
                return {
                    success: false,
                    message: '✗ Use slots! Example: d1(s("bd sd")) instead of s("bd sd")'
                };
            } else if (Array.isArray(result)) {
                return {
                    success: false,
                    message: '✗ Use slots! Example: d1(stack(...))'
                };
            }

            return { success: true, message: '✓ Evaluated', result };

        } catch (error) {
            return { success: false, message: `✗ Error: ${error.message}`, error };
        }
    }

    /**
     * Create evaluation context with API functions
     */
    createContext() {
        return {
            // Pattern creation functions
            s: this.soundPattern.bind(this),
            note: this.notePattern.bind(this),
            stack: window.stack,

            // Pattern slots (like TidalCycles d1, d2, etc.)
            d1: this.createSlot('d1'),
            d2: this.createSlot('d2'),
            d3: this.createSlot('d3'),
            d4: this.createSlot('d4'),
            d5: this.createSlot('d5'),
            d6: this.createSlot('d6'),
            d7: this.createSlot('d7'),
            d8: this.createSlot('d8'),
            d9: this.createSlot('d9'),

            // Control functions
            hush: this.hush.bind(this),
            silence: this.silence.bind(this),

            // Utility functions
            Pattern: window.Pattern,
            fast: (n) => (p) => p.fast(n),
            slow: (n) => (p) => p.slow(n),
            rev: () => (p) => p.rev(),

            // Math/random
            Math: Math,
            random: Math.random,

            // Console for debugging
            console: console,

            // Tone.js access (advanced)
            Tone: Tone
        };
    }

    /**
     * Create a slot function (like TidalCycles d1, d2, etc.)
     * @param {string} slotName - Name of the slot (d1, d2, etc.)
     */
    createSlot(slotName) {
        return (pattern) => {
            if (!pattern) {
                // Empty slot = silence this slot
                window.scheduler.removePattern(slotName);
                this.slots[slotName] = null;
                return { success: true, message: `✓ ${slotName} silenced` };
            }

            // Register pattern in this slot (replaces previous)
            window.scheduler.setPattern(slotName, pattern);
            this.slots[slotName] = pattern;
            return { success: true, message: `✓ ${slotName}: ${pattern.toString()}`, pattern };
        };
    }

    /**
     * Create a sound/sample pattern from mini-notation
     * @param {string} notation - Mini-notation string like "bd sd hh*2"
     * @returns {Pattern} Pattern object or null for empty patterns
     */
    soundPattern(notation) {
        // Empty pattern = silence
        if (!notation || notation.trim() === '') {
            return null;
        }

        const events = window.parser.parse(notation);
        return new Pattern(events, 'sound');
    }

    /**
     * Create a note pattern from mini-notation
     * @param {string} notation - Mini-notation string like "c3 e3 g3"
     * @returns {Pattern} Pattern object
     */
    notePattern(notation) {
        const events = window.parser.parse(notation);

        // Convert note names to MIDI numbers
        const noteEvents = events.map(event => ({
            ...event,
            sound: window.parser.parseNote(event.sound)
        }));

        return new Pattern(noteEvents, 'note');
    }

    /**
     * Get next pattern ID
     */
    getNextPatternId() {
        return `pattern_${this.patternCounter++}`;
    }

    /**
     * Hush - Stop all patterns (like TidalCycles)
     */
    hush() {
        window.scheduler.clearPatterns();
        return { success: true, message: '✓ All patterns stopped (hushed)' };
    }

    /**
     * Silence - Returns null to silence a specific slot
     * Usage: d3(silence()) will only stop slot d3
     */
    silence() {
        return null;
    }

    /**
     * Reset pattern counter
     */
    reset() {
        this.patternCounter = 0;
    }
}

// Create global instance
window.codeEvaluator = new CodeEvaluator();
