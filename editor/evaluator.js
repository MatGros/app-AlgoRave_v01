/**
 * AlgoSignalSound - Code Evaluator
 * Evaluates user code and creates patterns
 */

class CodeEvaluator {
    constructor() {
        this.patternCounter = 0;
        this.currentSlotIndex = 0; // Track next available slot
        // Pattern slots like TidalCycles (d1, d2, d3, etc.)
        this.slots = {};
    }

    /**
     * Get the next available slot
     */
    getNextAvailableSlot() {
        // Try to find first empty slot (d1 to d9)
        for (let i = 1; i <= 9; i++) {
            const slotName = `d${i}`;
            if (!this.slots[slotName]) {
                return slotName;
            }
        }
        // If all slots are full, use current pointer (round-robin)
        this.currentSlotIndex = (this.currentSlotIndex % 9) + 1;
        return `d${this.currentSlotIndex}`;
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

            // If result is a pattern without slot, auto-assign to next available slot
            if (result instanceof Pattern) {
                // Auto-start scheduler on first pattern
                if (!window.scheduler.isPlaying) {
                    window.scheduler.start();
                }
                
                const autoSlot = this.getNextAvailableSlot();
                window.scheduler.setPattern(autoSlot, result);
                this.slots[autoSlot] = result;
                return {
                    success: true,
                    message: `✓ Auto-assigned to ${autoSlot}: ${result.toString()}`,
                    result
                };
            } else if (Array.isArray(result)) {
                // Auto-start scheduler on first pattern
                if (!window.scheduler.isPlaying) {
                    window.scheduler.start();
                }
                
                const autoSlot = this.getNextAvailableSlot();
                const stackedPattern = new Pattern(result, 'stacked');
                window.scheduler.setPattern(autoSlot, stackedPattern);
                this.slots[autoSlot] = stackedPattern;
                return {
                    success: true,
                    message: `✓ Auto-assigned stacked pattern to ${autoSlot}`,
                    result
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
            // Pattern creation functions (both work the same now!)
            s: this.soundPattern.bind(this),
            note: this.soundPattern.bind(this),  // Alias: note() also detects automatically
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

            // Master effects controls
            masterLPF: this.masterLPF.bind(this),
            masterHPF: this.masterHPF.bind(this),
            masterReverb: this.masterReverb.bind(this),
            masterDelay: this.masterDelay.bind(this),
            masterCompressor: this.masterCompressor.bind(this),
            masterVolume: this.masterVolume.bind(this),
            masterReset: this.masterReset.bind(this),

            // Sample library info
            samples: this.getSamplesInfo.bind(this),

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

                // Also clear highlight for this slot
                if (window.app && window.app.editorEffects) {
                    const slotNumber = parseInt(slotName.substring(1));
                    window.app.editorEffects.clearSlotHighlight(slotNumber);
                }

                return { success: true, message: `✓ ${slotName} silenced` };
            }

            // Register pattern in this slot (replaces previous)
            window.scheduler.setPattern(slotName, pattern);
            this.slots[slotName] = pattern;
            return { success: true, message: `✓ ${slotName}: ${pattern.toString()}`, pattern };
        };
    }

    /**
     * Create a pattern - intelligently detects if it's a note or sample
     * Works like TidalCycles: detects automatically
     * @param {string} notation - Mini-notation string like "bd sd hh*2" OR "c3 e3 g3"
     * @returns {Pattern} Pattern object or null for empty patterns
     */
    soundPattern(notation) {
        // Empty pattern = silence
        if (!notation || notation.trim() === '') {
            return null;
        }

        // Check if this looks like musical notes or samples
        const isNote = this.looksLikeNotes(notation);

        if (isNote) {
            // Treat as notes (like TidalCycles)
            return this.notePattern(notation);
        } else {
            // Treat as samples (drums, sounds)
            return this.samplePattern(notation);
        }
    }

    /**
     * Detect if a notation string contains musical notes
     * @param {string} notation - Input string
     * @returns {boolean} True if it looks like notes
     */
    looksLikeNotes(notation) {
        // Extract individual items (split by space)
        const items = notation.trim().split(/\s+/);
        
        // Check first few items for note patterns
        for (let i = 0; i < Math.min(3, items.length); i++) {
            const item = items[i].toLowerCase();
            
            // Remove repetition markers (*, ~, etc)
            const cleanItem = item.replace(/[*~<>]/g, '').split(/[\d]/)[0];
            
            // Check if it starts with a note name (a-g)
            if (/^[a-g][#b]?\d/.test(item)) {
                return true; // It's a note (e.g., c3, d#4, eb2)
            }
        }
        
        // If no note pattern found, assume it's samples
        return false;
    }

    /**
     * Create a sample pattern from mini-notation
     * @param {string} notation - Mini-notation string like "bd sd hh*2"
     * @returns {Pattern} Pattern object
     */
    samplePattern(notation) {
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
        // Also clear all line highlights
        if (window.app && window.app.editorEffects) {
            window.app.editorEffects.clearAllHighlights();
        }
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

    /**
     * Master Effects Controls
     */

    /**
     * Set master low-pass filter
     * @param {number} freq - Frequency in Hz (20-20000)
     */
    masterLPF(freq) {
        window.masterBus.setLPF(freq);
        return { success: true, message: `✓ Master LPF: ${freq}Hz` };
    }

    /**
     * Set master high-pass filter (pour couper les basses/kicks)
     * @param {number} freq - Frequency in Hz (20-20000)
     */
    masterHPF(freq) {
        window.masterBus.setHPF(freq);
        return { success: true, message: `✓ Master HPF: ${freq}Hz` };
    }

    /**
     * Set master reverb amount
     * @param {number} amount - Wet amount (0-1)
     */
    masterReverb(amount) {
        window.masterBus.setReverb(amount);
        return { success: true, message: `✓ Master Reverb: ${(amount * 100).toFixed(0)}%` };
    }

    /**
     * Set master delay amount
     * @param {number} amount - Wet amount (0-1)
     */
    masterDelay(amount) {
        window.masterBus.setDelay(amount);
        return { success: true, message: `✓ Master Delay: ${(amount * 100).toFixed(0)}%` };
    }

    /**
     * Set master compressor
     * @param {number} threshold - Threshold in dB (-100 to 0)
     * @param {number} ratio - Compression ratio (1-20)
     */
    masterCompressor(threshold = -20, ratio = 4) {
        window.masterBus.setCompressorThreshold(threshold);
        window.masterBus.setCompressorRatio(ratio);
        return { success: true, message: `✓ Master Compressor: ${threshold}dB, ${ratio}:1` };
    }

    /**
     * Set master volume
     * @param {number} volume - Volume (0-2, default 0.8)
     */
    masterVolume(volume) {
        window.masterBus.setVolume(volume);
        return { success: true, message: `✓ Master Volume: ${(volume * 100).toFixed(0)}%` };
    }

    /**
     * Reset all master effects to default
     */
    masterReset() {
        window.masterBus.reset();
        return { success: true, message: '✓ Master effects reset to defaults' };
    }

    /**
     * Get information about loaded samples
     */
    getSamplesInfo() {
        if (!window.sampleLibrary || !window.sampleLibrary.loaded) {
            console.log('Sample library not loaded yet');
            return { success: true, message: '⚠ Sample library not loaded yet' };
        }

        const info = window.sampleLibrary.getInfo();

        // Display in console for detailed view
        console.log('=== SAMPLE LIBRARY INFO ===');
        console.log(`Loaded samples: ${info.loaded}`);
        console.log(`Synth fallbacks: ${info.failed}`);
        console.log(`Total: ${info.total}`);

        if (info.loaded > 0) {
            console.log('\n📂 Available custom samples:');
            info.samples.forEach(name => {
                console.log(`  - ${name}`);
            });
            console.log('\n💡 Use with: s("' + info.samples[0] + '*4")');
        } else {
            console.log('\nℹ No custom samples loaded. Using synthesized drums.');
            console.log('💡 Add samples to /samples folder (see samples/README.md)');
        }

        console.log('\n🎹 Always available (synth fallback):');
        console.log('  bd/kick, sd/snare, hh/hihat, cp/clap, oh/openhh');
        console.log('========================');

        return {
            success: true,
            message: `📊 Samples: ${info.loaded} loaded, ${info.failed} synth fallback (see console for details)`,
            info
        };
    }
}

// Create global instance
window.codeEvaluator = new CodeEvaluator();
