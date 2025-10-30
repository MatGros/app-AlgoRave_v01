/**
 * ALGORAVE - Main Application
 * Integrates all components for live coding music
 */

// Suppress expected browser warnings about AudioContext (normal behavior)
(function() {
    const originalWarn = console.warn;
    console.warn = function(...args) {
        const message = args[0];
        if (typeof message === 'string' && 
            (message.includes('AudioContext was not allowed to start') ||
             message.includes('passive event listener'))) {
            return; // Ignore these specific warnings
        }
        originalWarn.apply(console, args);
    };
})();

class AlgoRaveApp {
    constructor() {
        this.editor = null;
        this.isInitialized = false;
        this.STORAGE_KEY = 'algorave_code';
        this.DEFAULT_CODE = `// PSYTRANCE SET - 135 BPM 🎵
// 1. Click START first!
// 2. Press Ctrl+Enter on each line to build the track
// 3. Modify and re-evaluate to change patterns live!

// ====== BASIC PSYTRANCE PATTERN ======

// Slot 1: Kick 4-on-the-floor (foundation)
d1(s("bd*4"))

// Slot 2: Rolling bassline (psychedelic)
d2(note("c1 c1 d1 c1 c1 eb1 c1 c1").s("fm").lpf(600))

// Slot 3: Fast hi-hats (psytrance signature)
d3(s("hh*16").pan(0.6))

// Slot 4: Off-beat percussion
d4(s("~ cp ~ cp ~ oh ~ cp"))

// ====== ADVANCED PATTERNS ======

// More complex bassline (rolling 16ths)
d2(note("c1 ~ c1 d1 ~ eb1 ~ d1 c1 ~ c1 d1 ~ f1 ~ eb1").s("fm").lpf(800).room(0.2))

// Psychedelic FM lead
d5(note("c3 eb3 g3 bb3 c4 g3 eb3 c3").s("fm").room(0.4).delay(0.3).pan(0.3))

// Add snare on 2 and 4
d6(s("~ ~ sd ~ ~ ~ sd ~"))

// Trippy hi-hat variations
d3(s("hh*16").every(4, fast(2)))

// ====== BREAKDOWN PATTERNS ======

// Minimal (just kick + bass)
d1(s("bd*4"))
d2(note("c1 ~ ~ ~ c1 ~ ~ ~").s("fm").lpf(400))
d3(silence())
d4(silence())

// Build up tension
d3(s("hh*8").fast(2))
d5(note("c3 c3 c3 c3").s("sine").room(0.6))

// ====== FULL POWER ======

// Stack everything!
d1(s("bd*4"))
d2(note("c1 c1 d1 eb1 c1 c1 f1 eb1 c1 d1 c1 eb1 d1 c1 eb1 f1").s("fm").lpf(700))
d3(s("hh*16").pan(0.7))
d4(s("~ cp ~ oh ~ cp ~ oh"))
d5(note("c4 eb4 g4 bb4").s("fm").room(0.5).delay(0.25))
d6(s("~ ~ sd ~ ~ ~ sd ~"))

// ====== VARIATIONS ======

// Reverse bassline every 4 cycles
d2(note("c1 c1 d1 eb1 f1 eb1 d1 c1").s("fm").every(4, rev()).lpf(600))

// Alternate kick pattern
d1(s("<bd*4 bd*8>"))

// Crazy hi-hats
d3(s("hh*16").sometimes(fast(2)).pan(0.5))

// ====== STOP CONTROLS ======

// Stop all
hush()

// Stop specific slots
d5(silence())
d6(silence())`;
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.isInitialized) return;

        // Initialize CodeMirror editor
        this.initEditor();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize visualizer
        window.visualizer.init();

        // Setup UI update functions
        this.setupUIUpdates();

        this.isInitialized = true;
        this.log('AlgoRave initialized', 'success');
        this.log('Press Ctrl+Enter to evaluate code', 'info');
    }

    /**
     * Initialize CodeMirror editor
     */
    initEditor() {
        const textarea = document.getElementById('codeEditor');

        // Load saved code or use default
        const savedCode = this.loadCode();
        textarea.value = savedCode;

        this.editor = CodeMirror.fromTextArea(textarea, {
            mode: 'javascript',
            theme: 'monokai',
            lineNumbers: true,
            styleActiveLine: true,
            matchBrackets: true,
            indentUnit: 2,
            tabSize: 2,
            indentWithTabs: false,
            lineWrapping: true,
            autofocus: true,
            extraKeys: {
                'Ctrl-Space': 'autocomplete'
            }
        });

        // Setup autocomplete hints
        this.setupAutocomplete();

        // Set up keyboard shortcuts
        this.editor.setOption('extraKeys', {
            'Ctrl-Enter': (cm) => {
                this.evaluateCurrentLine();
                return true;
            },
            'Cmd-Enter': (cm) => {
                this.evaluateCurrentLine();
                return true;
            },
            'Ctrl-Shift-Enter': (cm) => {
                this.evaluateSelection();
                return true;
            },
            'Cmd-Shift-Enter': (cm) => {
                this.evaluateSelection();
                return true;
            },
            'Ctrl-.': (cm) => {
                this.stopCurrentSlot();
                return true;
            },
            'Cmd-.': (cm) => {
                this.stopCurrentSlot();
                return true;
            },
            'Ctrl-Space': (cm) => {
                this.showAutocomplete();
                return true;
            }
        });
        
        // Additional global keyboard handler
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
                e.preventDefault();
                this.evaluateSelection();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === '.') {
                e.preventDefault();
                this.stopCurrentSlot();
            }
        });

        // Auto-save code on changes
        this.editor.on('change', () => {
            this.saveCode();
        });

        console.log('CodeMirror initialized');
    }

    /**
     * Setup autocomplete hints
     */
    setupAutocomplete() {
        // Define all available commands and functions
        this.autocompleteHints = {
            // Pattern creation
            's': { text: 's("bd sd")', displayText: 's() - Sound/Sample pattern', hint: 's' },
            'note': { text: 'note("c3 e3 g3")', displayText: 'note() - Note pattern', hint: 'note' },
            'stack': { text: 'stack(\n  s("bd*4"),\n  note("c2")\n)', displayText: 'stack() - Stack multiple patterns', hint: 'stack' },

            // Pattern slots
            'd1': { text: 'd1(s(""))', displayText: 'd1 - Pattern slot 1', hint: 'd1' },
            'd2': { text: 'd2(s(""))', displayText: 'd2 - Pattern slot 2', hint: 'd2' },
            'd3': { text: 'd3(s(""))', displayText: 'd3 - Pattern slot 3', hint: 'd3' },
            'd4': { text: 'd4(s(""))', displayText: 'd4 - Pattern slot 4', hint: 'd4' },
            'd5': { text: 'd5(s(""))', displayText: 'd5 - Pattern slot 5', hint: 'd5' },
            'd6': { text: 'd6(s(""))', displayText: 'd6 - Pattern slot 6', hint: 'd6' },
            'd7': { text: 'd7(s(""))', displayText: 'd7 - Pattern slot 7', hint: 'd7' },
            'd8': { text: 'd8(s(""))', displayText: 'd8 - Pattern slot 8', hint: 'd8' },
            'd9': { text: 'd9(s(""))', displayText: 'd9 - Pattern slot 9', hint: 'd9' },

            // Control functions
            'hush': { text: 'hush()', displayText: 'hush() - Stop all patterns', hint: 'hush' },
            'silence': { text: 'silence()', displayText: 'silence() - Silence a slot', hint: 'silence' },

            // Effects
            'fast': { text: '.fast(2)', displayText: '.fast(n) - Speed up n times', hint: 'fast' },
            'slow': { text: '.slow(2)', displayText: '.slow(n) - Slow down n times', hint: 'slow' },
            'rev': { text: '.rev()', displayText: '.rev() - Reverse pattern', hint: 'rev' },
            'every': { text: '.every(4, fast(2))', displayText: '.every(n, effect) - Apply effect every n cycles', hint: 'every' },
            'sometimes': { text: '.sometimes(fast(2))', displayText: '.sometimes(effect) - 50% chance', hint: 'sometimes' },
            'rarely': { text: '.rarely(fast(2))', displayText: '.rarely(effect) - 25% chance', hint: 'rarely' },
            'often': { text: '.often(fast(2))', displayText: '.often(effect) - 75% chance', hint: 'often' },

            // Audio effects
            'gain': { text: '.gain(0.5)', displayText: '.gain(n) - Volume/gain', hint: 'gain' },
            'room': { text: '.room(0.5)', displayText: '.room(n) - Reverb', hint: 'room' },
            'delay': { text: '.delay(0.3)', displayText: '.delay(n) - Delay effect', hint: 'delay' },
            'lpf': { text: '.lpf(800)', displayText: '.lpf(hz) - Low-pass filter', hint: 'lpf' },
            'hpf': { text: '.hpf(100)', displayText: '.hpf(hz) - High-pass filter', hint: 'hpf' },
            'pan': { text: '.pan(0.5)', displayText: '.pan(n) - Pan left/right (0-1)', hint: 'pan' },

            // Synth types
            'sine': { text: '.s("sine")', displayText: '"sine" - Pure sine wave', hint: 'sine' },
            'square': { text: '.s("square")', displayText: '"square" - Square wave', hint: 'square' },
            'sawtooth': { text: '.s("sawtooth")', displayText: '"sawtooth" - Sawtooth wave', hint: 'sawtooth' },
            'triangle': { text: '.s("triangle")', displayText: '"triangle" - Triangle wave', hint: 'triangle' },
            'fm': { text: '.s("fm")', displayText: '"fm" - FM synthesis', hint: 'fm' },
            'am': { text: '.s("am")', displayText: '"am" - AM synthesis', hint: 'am' },

            // Drum samples
            'bd': { text: 's("bd")', displayText: '"bd"/"kick" - Bass drum', hint: 'bd' },
            'sd': { text: 's("sd")', displayText: '"sd"/"snare" - Snare drum', hint: 'sd' },
            'hh': { text: 's("hh")', displayText: '"hh"/"hihat" - Hi-hat', hint: 'hh' },
            'oh': { text: 's("oh")', displayText: '"oh"/"openhh" - Open hi-hat', hint: 'oh' },
            'cp': { text: 's("cp")', displayText: '"cp"/"clap" - Clap', hint: 'cp' }
        };
    }

    /**
     * Show autocomplete suggestions
     */
    showAutocomplete() {
        const cursor = this.editor.getCursor();
        const line = this.editor.getLine(cursor.line);
        const start = cursor.ch;
        let word = '';

        // Get the word being typed
        for (let i = start - 1; i >= 0; i--) {
            const char = line[i];
            if (/[a-zA-Z0-9_]/.test(char)) {
                word = char + word;
            } else {
                break;
            }
        }

        // Get matching hints
        const suggestions = [];
        for (const [key, hint] of Object.entries(this.autocompleteHints)) {
            if (key.toLowerCase().startsWith(word.toLowerCase())) {
                suggestions.push({
                    text: hint.text,
                    displayText: hint.displayText
                });
            }
        }

        if (suggestions.length > 0) {
            this.editor.showHint({
                hint: () => ({
                    from: CodeMirror.Pos(cursor.line, start - word.length),
                    to: cursor,
                    list: suggestions
                })
            });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Start button
        document.getElementById('startBtn').addEventListener('click', () => {
            this.start();
        });

        // Stop button
        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stop();
        });

        // BPM input
        document.getElementById('bpmInput').addEventListener('change', (e) => {
            const bpm = parseInt(e.target.value);
            if (bpm >= 60 && bpm <= 200) {
                window.scheduler.setBPM(bpm);
                this.log(`BPM set to ${bpm}`, 'info');
            }
        });

        // Clear console
        document.getElementById('clearConsole').addEventListener('click', () => {
            this.clearConsole();
        });

        // Reset code button
        document.getElementById('resetCodeBtn').addEventListener('click', () => {
            this.resetCode();
        });

        // Help button
        document.getElementById('helpBtn').addEventListener('click', () => {
            this.showHelp();
        });

        // Close help modal
        document.getElementById('closeHelpBtn').addEventListener('click', () => {
            this.hideHelp();
        });

        // Close modal when clicking outside
        document.getElementById('helpModal').addEventListener('click', (e) => {
            if (e.target.id === 'helpModal') {
                this.hideHelp();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideHelp();
            }
        });
    }

    /**
     * Setup UI update functions
     */
    setupUIUpdates() {
        // Update cycle display
        window.updateCycleDisplay = (cycle) => {
            document.getElementById('cycleCount').textContent = `cycle: ${cycle}`;
        };

        // Update active patterns display
        window.updateActivePatterns = (patterns) => {
            const container = document.getElementById('activePatterns');
            container.innerHTML = '';

            if (patterns.size === 0) {
                container.innerHTML = '<div class="pattern-item empty">No patterns running</div>';
                return;
            }

            patterns.forEach((pattern, id) => {
                const div = document.createElement('div');
                div.className = 'pattern-item';
                div.textContent = pattern.toString();
                container.appendChild(div);
            });
        };
    }

    /**
     * Evaluate current line or selection
     */
    evaluateCurrentLine() {
        const cursor = this.editor.getCursor();
        let code;

        // Check if there's a selection
        if (this.editor.somethingSelected()) {
            code = this.editor.getSelection();
        } else {
            // Get current line
            code = this.editor.getLine(cursor.line);
        }

        if (!code.trim()) return;

        this.log(`> ${code}`, 'info');
        const result = window.codeEvaluator.evaluate(code);

        if (result.success) {
            this.log(result.message, 'success');

            // Auto-start if not playing
            if (!window.scheduler.isPlaying) {
                this.start();
            }
        } else {
            this.log(result.message, 'error');
        }
    }

    /**
     * Evaluate all code
     */
    evaluateAll() {
        const code = this.editor.getValue();
        const lines = code.split('\n');

        this.log('Evaluating all code...', 'info');

        let successCount = 0;
        let errorCount = 0;

        lines.forEach((line, index) => {
            if (line.trim() && !line.trim().startsWith('//')) {
                const result = window.codeEvaluator.evaluate(line);
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                    this.log(`Line ${index + 1}: ${result.message}`, 'error');
                }
            }
        });

        this.log(`✓ ${successCount} patterns, ✗ ${errorCount} errors`, successCount > errorCount ? 'success' : 'warning');

        // Auto-start if not playing
        if (!window.scheduler.isPlaying && successCount > 0) {
            this.start();
        }
    }

    /**
     * Evaluate only selected lines
     */
    evaluateSelection() {
        let lines = [];
        let isSelection = false;

        // Check if there's a selection
        if (this.editor.somethingSelected()) {
            const selection = this.editor.getSelection();
            lines = selection.split('\n').filter(line => line.trim().length > 0);
            isSelection = true;
            this.log(`Evaluating ${lines.length} selected line(s)...`, 'info');
        } else {
            // If no selection, use all code (like evaluateAll)
            const code = this.editor.getValue();
            lines = code.split('\n').filter(line => line.trim().length > 0);
            this.log('No selection - evaluating all code...', 'info');
        }

        let successCount = 0;
        let errorCount = 0;

        lines.forEach((line) => {
            // Skip comments
            if (line.trim().startsWith('//')) {
                return;
            }

            const result = window.codeEvaluator.evaluate(line);
            if (result.success) {
                successCount++;
                this.log(`✓ ${line.trim().substring(0, 60)}`, 'success');
            } else {
                errorCount++;
                this.log(`✗ ${result.message}`, 'error');
            }
        });

        const suffix = isSelection ? ' (selected)' : ' (all)';
        this.log(`✓ ${successCount} patterns, ✗ ${errorCount} errors${suffix}`, successCount > errorCount ? 'success' : 'warning');

        // Auto-start if not playing
        if (!window.scheduler.isPlaying && successCount > 0) {
            this.start();
        }
    }

    /**
     * Stop only the current slot (extracted from line)
     */
    stopCurrentSlot() {
        let lines = [];

        // Check if there's a selection
        if (this.editor.somethingSelected()) {
            const selection = this.editor.getSelection();
            lines = selection.split('\n');
        } else {
            // Get current line
            const cursor = this.editor.getCursor();
            const code = this.editor.getLine(cursor.line);
            lines = [code];
        }

        let stoppedSlots = [];
        let errorCount = 0;

        lines.forEach((line) => {
            if (!line.trim() || line.trim().startsWith('//')) {
                return; // Skip empty lines and comments
            }

            // Extract slot number (d1, d2, etc.)
            const slotMatch = line.match(/d(\d)/);
            
            if (!slotMatch) {
                errorCount++;
                return;
            }

            const slotNumber = parseInt(slotMatch[1]);
            const slotId = `d${slotNumber}`;
            
            // Avoid stopping the same slot multiple times
            if (stoppedSlots.includes(slotId)) {
                return;
            }

            // Silence the specific slot
            const result = window.codeEvaluator.evaluate(`${slotId}(silence())`);
            
            if (result.success) {
                stoppedSlots.push(slotId);
            } else {
                errorCount++;
            }
        });

        if (stoppedSlots.length > 0) {
            this.log(`⏹ Stopped slots: ${stoppedSlots.join(', ')}`, 'info');
        } else {
            this.log('❌ No slots found to stop', 'warning');
        }
    }

    /**
     * Start playback
     */
    async start() {
        await window.scheduler.start();

        document.getElementById('statusText').textContent = 'playing';
        document.querySelector('.status').classList.add('running');

        this.log('▶ Playback started', 'success');
    }

    /**
     * Stop playback
     */
    stop() {
        window.scheduler.stop();
        window.scheduler.clearPatterns();

        document.getElementById('statusText').textContent = 'stopped';
        document.getElementById('cycleCount').textContent = 'cycle: 0';
        document.querySelector('.status').classList.remove('running');

        // Update active patterns
        if (window.updateActivePatterns) {
            window.updateActivePatterns(new Map());
        }

        this.log('■ Playback stopped', 'info');
    }

    /**
     * Log message to console
     */
    log(message, type = 'info') {
        const consoleOutput = document.getElementById('consoleOutput');
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = message;

        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;

        // Keep console at reasonable size
        while (consoleOutput.children.length > 100) {
            consoleOutput.removeChild(consoleOutput.firstChild);
        }
    }

    /**
     * Clear console
     */
    clearConsole() {
        const consoleOutput = document.getElementById('consoleOutput');
        consoleOutput.innerHTML = '';
        this.log('Console cleared', 'info');
    }

    /**
     * Save code to localStorage
     */
    saveCode() {
        try {
            const code = this.editor.getValue();
            localStorage.setItem(this.STORAGE_KEY, code);
        } catch (error) {
            console.error('Failed to save code:', error);
        }
    }

    /**
     * Load code from localStorage or return default
     */
    loadCode() {
        try {
            const savedCode = localStorage.getItem(this.STORAGE_KEY);
            return savedCode !== null ? savedCode : this.DEFAULT_CODE;
        } catch (error) {
            console.error('Failed to load code:', error);
            return this.DEFAULT_CODE;
        }
    }

    /**
     * Reset code to default
     */
    resetCode() {
        if (confirm('Reset code to default? This will overwrite your current code.')) {
            this.editor.setValue(this.DEFAULT_CODE);
            this.saveCode();
            this.log('Code reset to default', 'info');
        }
    }

    /**
     * Show help modal
     */
    showHelp() {
        const modal = document.getElementById('helpModal');
        modal.classList.add('show');
        this.log('Help opened', 'info');
    }

    /**
     * Hide help modal
     */
    hideHelp() {
        const modal = document.getElementById('helpModal');
        modal.classList.remove('show');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new AlgoRaveApp();
        window.app.init();
    });
} else {
    window.app = new AlgoRaveApp();
    window.app.init();
}
