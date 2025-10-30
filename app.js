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
            autofocus: true
        });

        // Set up keyboard shortcuts
        this.editor.setOption('extraKeys', {
            'Ctrl-Enter': () => this.evaluateCurrentLine(),
            'Cmd-Enter': () => this.evaluateCurrentLine(),
            'Ctrl-Shift-Enter': () => this.evaluateAll(),
            'Cmd-Shift-Enter': () => this.evaluateAll(),
            'Ctrl-.': () => this.stop(),
            'Cmd-.': () => this.stop()
        });

        // Auto-save code on changes
        this.editor.on('change', () => {
            this.saveCode();
        });

        console.log('CodeMirror initialized');
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
