/**
 * ALGORAVE - Mini-Notation Parser
 * Parses TidalCycles-style mini-notation into pattern events
 *
 * Examples:
 * "bd sd" -> [bd, sd]
 * "bd*4" -> [bd, bd, bd, bd]
 * "bd ~ sd" -> [bd, rest, sd]
 * "<bd sd> hh" -> alternates between [bd, hh] and [sd, hh]
 */

class MiniNotationParser {
    constructor() {
        this.currentCycle = 0;
    }

    /**
     * Parse a mini-notation string into events
     * @param {string} str - Mini-notation string like "bd sd hh*2"
     * @param {number} subdivision - Number of steps (default 16)
     * @returns {Array} Array of events with timing
     */
    parse(str, subdivision = 16) {
        if (!str || str.trim() === '') {
            return [];
        }

        // Remove comments
        str = str.split('//')[0].trim();

        // Handle alternation <a b c>
        if (str.includes('<') && str.includes('>')) {
            return this.parseAlternation(str, subdivision);
        }

        // Split by whitespace
        const tokens = str.trim().split(/\s+/);
        const events = [];
        const stepDuration = 1.0 / tokens.length;

        tokens.forEach((token, index) => {
            const time = index * stepDuration;

            if (token === '~') {
                // Rest/silence
                return;
            }

            // Handle repetition (bd*4)
            if (token.includes('*')) {
                const [sound, countStr] = token.split('*');
                const count = parseInt(countStr) || 1;
                const subDuration = stepDuration / count;

                for (let i = 0; i < count; i++) {
                    events.push({
                        sound: sound,
                        time: time + (i * subDuration),
                        duration: subDuration * 0.9 // Slightly shorter for clarity
                    });
                }
            }
            // Handle subdivision (bd/4)
            else if (token.includes('/')) {
                const [sound, divStr] = token.split('/');
                const divisor = parseInt(divStr) || 1;
                // Only play on that subdivision
                events.push({
                    sound: sound,
                    time: time,
                    duration: stepDuration / divisor
                });
            }
            // Simple sound
            else {
                events.push({
                    sound: token,
                    time: time,
                    duration: stepDuration * 0.9
                });
            }
        });

        return events;
    }

    /**
     * Parse alternation patterns <a b c>
     * Cycles through options on each cycle
     */
    parseAlternation(str, subdivision) {
        const match = str.match(/<([^>]+)>/);
        if (!match) {
            return this.parse(str, subdivision);
        }

        const options = match[1].trim().split(/\s+/);
        const optionIndex = this.currentCycle % options.length;
        const selected = options[optionIndex];

        // Replace the alternation with the selected option
        const replaced = str.replace(/<[^>]+>/, selected);
        return this.parse(replaced, subdivision);
    }

    /**
     * Parse note notation (c3, eb4, etc.)
     * @param {string} note - Note like "c3", "eb4", "f#5"
     * @returns {number} MIDI note number
     */
    parseNote(note) {
        const noteMap = {
            'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11
        };

        note = note.toLowerCase().trim();

        let noteName = note[0];
        let accidental = '';
        let octave = 4; // default octave

        // Check for sharp or flat
        if (note.length > 1 && (note[1] === '#' || note[1] === 'b')) {
            accidental = note[1];
            if (note.length > 2) {
                octave = parseInt(note.slice(2)) || 4;
            }
        } else if (note.length > 1) {
            octave = parseInt(note.slice(1)) || 4;
        }

        let midiNote = noteMap[noteName];
        if (midiNote === undefined) {
            return 60; // default to C4
        }

        if (accidental === '#') midiNote += 1;
        if (accidental === 'b') midiNote -= 1;

        return (octave + 1) * 12 + midiNote;
    }

    /**
     * Increment the cycle counter (called each cycle)
     */
    nextCycle() {
        this.currentCycle++;
    }

    /**
     * Reset the cycle counter
     */
    resetCycle() {
        this.currentCycle = 0;
    }
}

// Create global instance
window.parser = new MiniNotationParser();
