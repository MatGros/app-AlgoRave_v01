/**
 * ALGORAVE - Main Application
 * Live coding music for fun and learning
 */

/**
 * Note: Console warning filters are applied in index.html before Tone.js loads
 * to suppress benign AudioContext and event listener browser policy warnings.
 */

class AlgoRaveApp {
    constructor() {
        this.editor = null;
        this.isInitialized = false;
        this.saveTimeout = null; // Debounce timer for auto-save
        this.currentPreset = null; // Track which preset is currently loaded
        this.AUTO_LOAD_PRESET = 'techno'; // preset to auto-load on refresh (set to null to disable)
    this.LAST_PRESET_KEY = 'algorave_last_preset';
    this.STORAGE_KEY = 'algorave_code';
        this.savedCodeHash = null; // Track if code has been modified since save
        this.isSaved = false; // Track if we just showed "Saved!" state
        this.DEFAULT_CODE = `// PSYTRANCE SET - 140 BPM 🎵
// 1. Click START first!
// 2. Press Ctrl+Enter on each line to build the track
// 3. Modify and re-evaluate to change patterns live!

// ====== BASIC PSYTRANCE PATTERN ======

// Slot 1: Powerful kick 4-on-the-floor (foundation)
d1(s("bd*4").gain(0.9))

// Slot 2: Aggressive rolling bassline (16th notes)
d2(note("c1 c1 d1 eb1 c1 d1 f1 eb1 c1 d1 eb1 f1 g1 f1 eb1 d1").s("sawtooth").lpf(650).gain(0.7))

// Slot 3: Fast hi-hats (psytrance signature)
d3(s("hh*16").gain(0.35).pan(0.6))

// Slot 4: Off-beat claps and open hats
d4(s("~ cp ~ oh ~ cp ~ oh").gain(0.55))

// ====== ADVANCED PATTERNS ======

// Heavy acid bassline (more aggressive)
d2(note("c1 c1 d1 eb1 c1 d1 f1 eb1 c1 d1 eb1 f1 g1 f1 eb1 d1").s("square").lpf(700).gain(0.75).room(0.1))

// Psychedelic lead with punch
d5(note("c4 eb4 g4 bb4 c5 bb4 g4 eb4").s("sawtooth").gain(0.5).room(0.5).delay(0.25).pan(0.3))

// Add powerful snare on 2 and 4
d6(s("~ ~ sd ~ ~ ~ sd ~").gain(0.7))

// Trippy hi-hat variations
d3(s("hh*16").gain(0.35).every(4, fast(2)).pan(0.65))

// ====== BREAKDOWN PATTERNS ======

// Minimal (just kick + deep bass)
d1(s("bd*4").gain(0.85))
d2(note("c1 ~ ~ ~ eb1 ~ ~ ~").s("sine").lpf(400).gain(0.6))
d3(silence())
d4(silence())
d5(silence())
d6(silence())

// Build up tension
d3(s("hh*8").gain(0.3).fast(2))
d5(note("c3 eb3 g3 bb3").s("triangle").gain(0.4).room(0.7).slow(2))

// ====== FULL POWER ======

// Stack everything with PUNCH!
d1(s("bd*4").gain(0.95))
d2(note("c1 c1 d1 eb1 c1 d1 f1 eb1 c1 d1 eb1 f1 g1 f1 eb1 d1").s("square").lpf(700).gain(0.8).room(0.1))
d3(s("hh*16").gain(0.35).pan(0.65))
d4(s("~ cp ~ oh ~ cp ~ oh").gain(0.6))
d5(note("c4 eb4 g4 bb4 c5 bb4 g4 eb4").s("sawtooth").gain(0.5).room(0.5).delay(0.25).pan(0.3))
d6(s("~ ~ sd ~ ~ ~ sd ~").gain(0.75).room(0.3))

// ====== VARIATIONS ======

// Reverse bassline every 4 cycles (trippy!)
d2(note("c1 c1 d1 eb1 f1 g1 f1 eb1").s("square").every(4, rev()).lpf(650).gain(0.8))

// Alternate kick pattern (more energy)
d1(s("<bd*4 bd*8>").gain(0.95))

// Crazy hi-hats with variations
d3(s("hh*16").sometimes(fast(2)).gain(0.35).pan(0.6))

// ====== MASTER EFFECTS - LIVE TRANSITIONS ======

// Filter sweep (psytrance classic!)
masterLPF(800)   // Darker sound
masterLPF(500)   // Even darker
masterLPF(20000) // DROP! Full spectrum

// Build with master volume
masterVolume(0.5)  // Quieter
masterVolume(0.8)  // Normal
masterVolume(1.0)  // FULL POWER!

// ====== STOP CONTROLS ======

// Stop all
hush()

// Stop specific slots
d5(silence())
d6(silence())

// Reset master effects
masterReset()`;
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.isInitialized) return;

        // Initialize CodeMirror editor
        await this.initEditor();

        // Setup event listeners
        this.setupEventListeners();

        // Setup preset selector
        await this.setupPresetSelector();

        // Initialize visualizer
        window.visualizer.init();

        // Initialize psychedelic visuals (wait for canvas to be ready)
        if (window.psychedelicVisuals) {
            console.log('✓ Psychedelic visuals object exists');
        } else {
            console.warn('❌ Psychedelic visuals object not found');
        }

        // Initialize editor effects (audio-reactive background and line highlighting)
        if (window.EditorEffects) {
            this.editorEffects = new window.EditorEffects(this.editor, window.visualizer);
            console.log('✓ Editor effects initialized');
        }

        // Setup UI update functions
        this.setupUIUpdates();

        // Setup audio info display
        this.setupAudioInfo();

        // Initialize sample library (async - loads custom samples)
        if (window.sampleLibrary) {
            await window.sampleLibrary.init();
        }

        this.isInitialized = true;
            this.log('AlgoSignalSound initialized', 'success');
        this.log('Press Ctrl+Enter to evaluate code', 'info');
    }

    /**
     * Initialize CodeMirror editor
     */
    async initEditor() {
        const textarea = document.getElementById('codeEditor');

        // Load saved code or use default
        const savedCode = await this.loadCode();
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
                // Smart: evaluate selection if exists, otherwise current line
                this.evaluateSmartly();
                return true;
            },
            'Cmd-Enter': (cm) => {
                this.evaluateSmartly();
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
            if ((e.ctrlKey || e.metaKey) && e.key === '.') {
                e.preventDefault();
                this.stopCurrentSlot();
            }
        });

        // Auto-save code on changes
        this.editor.on('change', () => {
            // If we were showing "Saved!", reset it when user types
            if (this.isSaved) {
                this.resetSaveButton();
            }
            this.saveCode();
        });

        // Initialize saved code hash (code is already saved at load time)
        this.savedCodeHash = this.hashCode(savedCode);

        // Initialize save button to "Saved!" state (code is fresh from server)
        this.showSavedState();

        console.log('CodeMirror initialized');
    }

    /**
     * Simple hash function for code comparison
     */
    hashCode(code) {
        let hash = 0;
        if (code.length === 0) return hash;
        for (let i = 0; i < code.length; i++) {
            const char = code.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    /**
     * Check if code has been modified since last save
     */
    isCodeModified() {
        if (!this.savedCodeHash) return false;
        const currentCode = this.editor.getValue();
        return this.hashCode(currentCode) !== this.savedCodeHash;
    }

    /**
     * Reset save button to "✓ Saved!" state
     */
    showSavedState() {
        const btn = document.getElementById('saveCodeBtn');
        if (!btn) return;

        btn.classList.remove('saving');
        btn.classList.add('saved');
        btn.textContent = '✓ Saved!';
        this.isSaved = true;
    }

    /**
     * Reset save button to "Save" state
     */
    resetSaveButton() {
        const btn = document.getElementById('saveCodeBtn');
        if (!btn) return;

        btn.classList.remove('saving');
        btn.classList.remove('saved');
        btn.textContent = 'Save';
        this.isSaved = false;
    }

    /**
     * Setup autocomplete hints
     */
    setupAutocomplete() {
        // Define all available commands and functions
        this.autocompleteHints = {
            // Pattern creation (auto-detects samples vs notes!)
            's': { text: 's("bd")', displayText: 's() - Auto-detect pattern (samples or notes)', hint: 's' },
            'note': { text: 'note("c3")', displayText: 'note() - Alias for s() (auto-detects)', hint: 'note' },
            'stack': { text: 'stack(\n  s("bd*4"),\n  s("c2")\n)', displayText: 'stack() - Stack multiple patterns', hint: 'stack' },

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
            'cp': { text: 's("cp")', displayText: '"cp"/"clap" - Clap', hint: 'cp' },

            // Master effects
            'masterLPF': { text: 'masterLPF(800)', displayText: 'masterLPF(hz) - Master low-pass filter', hint: 'masterLPF' },
            'masterHPF': { text: 'masterHPF(100)', displayText: 'masterHPF(hz) - Master high-pass filter (cut kicks)', hint: 'masterHPF' },
            'masterReverb': { text: 'masterReverb(0.5)', displayText: 'masterReverb(0-1) - Master reverb', hint: 'masterReverb' },
            'masterDelay': { text: 'masterDelay(0.3)', displayText: 'masterDelay(0-1) - Master delay', hint: 'masterDelay' },
            'masterVolume': { text: 'masterVolume(0.8)', displayText: 'masterVolume(0-2) - Master volume', hint: 'masterVolume' },
            'masterCompressor': { text: 'masterCompressor(-20, 4)', displayText: 'masterCompressor(threshold, ratio) - Master compressor', hint: 'masterCompressor' },
            'masterReset': { text: 'masterReset()', displayText: 'masterReset() - Reset all master effects', hint: 'masterReset' },

            // Sample library
            'samples': { text: 'samples()', displayText: 'samples() - Show loaded samples info', hint: 'samples' }
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
     * Setup preset selector dropdown
     */
    async setupPresetSelector() {
        const select = document.getElementById('presetSelect');
        if (!select) return;

        try {
            const presets = await this.loadPresets();

            // Clear existing options (keep the placeholder)
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Add preset options
            presets.forEach(preset => {
                const option = document.createElement('option');
                option.value = preset.name;
                // Format the name nicely (capitalize first letter)
                option.textContent = preset.name.charAt(0).toUpperCase() + preset.name.slice(1);
                select.appendChild(option);
            });

            // Handle selection
            select.addEventListener('change', async (e) => {
                if (e.target.value) {
                    await this.loadPreset(e.target.value);
                    // Dropdown now stays with the selected preset (for Save to Preset)
                }
            });

            this.log('✓ Presets loaded', 'success');

            // Auto-load a preset on refresh if configured
            try {
                // Prefer the last known preset saved in localStorage
                let presetToLoad = null;
                try {
                    const last = localStorage.getItem(this.LAST_PRESET_KEY);
                    if (last) presetToLoad = last;
                } catch (e) {
                    // ignore localStorage errors
                }

                // Fallback to configured AUTO_LOAD_PRESET if no last preset
                if (!presetToLoad && this.AUTO_LOAD_PRESET) {
                    presetToLoad = this.AUTO_LOAD_PRESET;
                }

                if (presetToLoad) {
                    const wanted = presetToLoad.toLowerCase();
                    const found = presets.find(p => p.name.toLowerCase() === wanted);
                    if (found) {
                        await this.loadPreset(found.name);
                        console.log(`Auto-loaded preset: ${found.name}`);
                    }
                }
            } catch (e) {
                console.warn('Auto-load preset failed:', e);
            }
            // After loading presets, run a compatibility check to warn about patterns
            // that will be silent under SAMPLE_ONLY mode.
            try {
                if (window.sampleLibrary && window.parser) {
                    this.validateAllPresets();
                }
            } catch (e) {
                console.warn('Preset validation failed:', e);
            }
        } catch (error) {
            console.warn('Could not load presets:', error);
        }
    }

    /**
     * Extracts mini-notation pattern strings from preset code.
     * Looks for s("..."), note("..."), and bare pattern strings inside dN(...) calls.
     */
    extractPatternsFromCode(code) {
        const patterns = [];
        if (!code) return patterns;

        // Match s("...") and s('...')
        const reS = /s\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
        let m;
        while ((m = reS.exec(code)) !== null) {
            patterns.push(m[1]);
        }

        // Match note("...")
        const reNote = /note\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
        while ((m = reNote.exec(code)) !== null) {
            patterns.push(m[1]);
        }

        // Match generic string literals used as patterns: e.g. d1(s("bd sd")) handled above.
        // Also try to catch direct calls like d1("bd sd")
        const reDirect = /d\d+\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
        while ((m = reDirect.exec(code)) !== null) {
            patterns.push(m[1]);
        }

        return patterns;
    }

    /**
     * Validate a single preset by fetching its code and checking which sounds
     * would be silent under SAMPLE_ONLY mode.
     */
    async validatePreset(presetName) {
        try {
            const resp = await fetch(`/api/preset/${presetName}`);
            const data = await resp.json();
            if (!data || !data.code) return [];
            const code = data.code;
            const patterns = this.extractPatternsFromCode(code);
            const issues = [];

            for (const pat of patterns) {
                // Parse the pattern into events (parser expects mini-notation)
                const events = window.parser.parse(pat, 16);
                for (const ev of events) {
                    const sound = (ev.sound || '').toString();
                    if (!sound) continue;

                    // allow explicit synth usage like synth:clap
                    if (sound.startsWith('synth:')) continue;

                    // If sampleLibrary.has returns false, warn
                    if (!(window.sampleLibrary && window.sampleLibrary.has(sound))) {
                        issues.push({ preset: presetName, pattern: pat, sound });
                    }
                }
            }

            return issues;
        } catch (e) {
            console.warn('validatePreset error', presetName, e);
            return [];
        }
    }

    /**
     * Validate all presets and print a concise compatibility report to console.
     */
    async validateAllPresets() {
        try {
            const presets = await this.loadPresets();
            const allIssues = [];
            for (const p of presets) {
                const issues = await this.validatePreset(p.name);
                allIssues.push(...issues);
            }

            if (allIssues.length === 0) {
                console.log('✓ Preset compatibility: all presets look OK for sample-only mode');
                return;
            }

            console.log('ℹ️ Preset compatibility info (some presets use synths in SAMPLE_ONLY mode):');
            // Group by preset
            const byPreset = {};
            for (const it of allIssues) {
                byPreset[it.preset] = byPreset[it.preset] || new Set();
                byPreset[it.preset].add(it.sound);
            }
            for (const [preset, sounds] of Object.entries(byPreset)) {
                console.log(`  - ${preset}: uses synths -> ${Array.from(sounds).join(', ')}`);
            }
        } catch (e) {
            console.log('validateAllPresets skipped', e.message);
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

        // Master Effects Controls
        this.setupMasterControls();

        // Audio Info Display
        this.setupAudioInfo();

        // Clear console
        document.getElementById('clearConsole').addEventListener('click', () => {
            this.clearConsole();
        });

        // Save to preset button
        document.getElementById('savePresetBtn').addEventListener('click', () => {
            this.saveToPreset();
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

        // Examples button
        document.getElementById('examplesBtn').addEventListener('click', () => {
            this.showExamples();
        });

        // Close examples modal
        document.getElementById('closeExamplesBtn').addEventListener('click', () => {
            this.hideExamples();
        });

        // Toggle audio-reactive background button
        document.getElementById('toggleAudioReactiveBtn').addEventListener('click', () => {
            if (this.editorEffects) {
                const isActive = this.editorEffects.toggleAudioReactive();
                const btn = document.getElementById('toggleAudioReactiveBtn');
                btn.textContent = isActive ? '🎨 BG FX ON' : '🎨 BG FX OFF';
                btn.classList.toggle('active', isActive);
                this.log(isActive ? 'Audio-reactive background enabled' : 'Audio-reactive background disabled', 'info');
            }
        });

        // Close examples modal when clicking outside
        document.getElementById('examplesModal').addEventListener('click', (e) => {
            if (e.target.id === 'examplesModal') {
                this.hideExamples();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideHelp();
                this.hideExamples();
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
     * Evaluate smartly: selection if exists, otherwise current line
     */
    evaluateSmartly() {
        // If there's a selection, evaluate selected lines
        if (this.editor.somethingSelected()) {
            this.evaluateSelection();
        } else {
            // Otherwise evaluate current line
            this.evaluateCurrentLine();
        }
    }

    /**
     * Evaluate current line
     */
    evaluateCurrentLine() {
        const cursor = this.editor.getCursor();
        const lineNumber = cursor.line;
        const code = this.editor.getLine(lineNumber);

        if (!code.trim()) return;

        this.log(`> ${code}`, 'info');
        const result = window.codeEvaluator.evaluate(code);

        if (result.success) {
            this.log(result.message, 'success');

            // Highlight the executed line with slot color
            if (this.editorEffects) {
                // Extract slot number from code (d1, d2, etc.)
                const slotMatch = code.match(/d(\d+)/);
                const slotNumber = slotMatch ? parseInt(slotMatch[1]) : null;
                this.editorEffects.markLineActive(lineNumber, slotNumber);
            }

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
        let lineNumbers = [];
        let isSelection = false;

        // Check if there's a selection
        if (this.editor.somethingSelected()) {
            const anchor = this.editor.getCursor('anchor');
            const head = this.editor.getCursor('head');
            const startLine = Math.min(anchor.line, head.line);
            const endLine = Math.max(anchor.line, head.line);

            // Collect all selected lines with their line numbers
            for (let i = startLine; i <= endLine; i++) {
                const line = this.editor.getLine(i);
                if (line.trim().length > 0 && !line.trim().startsWith('//')) {
                    lines.push(line);
                    lineNumbers.push(i);
                }
            }
            isSelection = true;
            this.log(`Evaluating ${lines.length} selected line(s)...`, 'info');
        } else {
            // If no selection, use all code (like evaluateAll)
            const code = this.editor.getValue();
            const allLines = code.split('\n');
            allLines.forEach((line, index) => {
                if (line.trim().length > 0 && !line.trim().startsWith('//')) {
                    lines.push(line);
                    lineNumbers.push(index);
                }
            });
            this.log('No selection - evaluating all code...', 'info');
        }

        // Group lines by slot to keep only the last one per slot
        const slotMap = new Map();
        lines.forEach((line, index) => {
            const slotMatch = line.match(/d(\d+)/);
            const slotNumber = slotMatch ? parseInt(slotMatch[1]) : null;

            // Keep only the last line for each slot
            slotMap.set(slotNumber, { line, lineNumber: lineNumbers[index], index });
        });

        let successCount = 0;
        let errorCount = 0;

        // Evaluate only the last line of each slot
        for (const data of slotMap.values()) {
            const line = data.line;
            const lineNumber = data.lineNumber;

            const result = window.codeEvaluator.evaluate(line);
            if (result.success) {
                successCount++;
                this.log(`✓ ${line.trim().substring(0, 60)}`, 'success');

                // Highlight the executed line with slot color
                if (this.editorEffects) {
                    const slotMatch = line.match(/d(\d+)/);
                    const slotNum = slotMatch ? parseInt(slotMatch[1]) : null;
                    this.editorEffects.markLineActive(lineNumber, slotNum);
                }
            } else {
                errorCount++;
                this.log(`✗ ${result.message}`, 'error');
            }
        }

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
            const slotMatch = line.match(/d(\d+)/);

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

                // Also directly clear the highlight for this slot
                if (this.editorEffects) {
                    this.editorEffects.clearSlotHighlight(slotNumber);
                }
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

        // Update BPM display after start
        const tempoSpan = document.getElementById('metronomeTempo');
        if (tempoSpan && window.scheduler) {
            tempoSpan.textContent = `${window.scheduler.bpm} BPM`;
        }

        // Start psychedelic visuals
        if (window.psychedelicVisuals) {
            window.psychedelicVisuals.start();
        }

        // Start editor effects (audio-reactive background)
        if (this.editorEffects) {
            this.editorEffects.start();
        }

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

        // Stop psychedelic visuals
        if (window.psychedelicVisuals) {
            window.psychedelicVisuals.stop();
        }

        // Stop editor effects
        if (this.editorEffects) {
            this.editorEffects.stop();
        }

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
     * Save code to server (auto-save with debounce)
     * Debounce prevents too many requests during rapid typing
     */
    saveCode() {
        // Clear existing timeout to debounce
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Schedule save after 1 second of inactivity
        this.saveTimeout = setTimeout(() => {
            try {
                const code = this.editor.getValue();
                fetch('/api/save-code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code })
                })
                .then(async response => {
                    if (!response.ok) {
                        const data = await response.json();
                        console.warn(`Auto-save failed: HTTP ${response.status}`, data);
                        return;
                    }
                    const data = await response.json();
                    if (data.success) {
                        console.log('[Auto-save] Code saved at', new Date().toLocaleTimeString());
                        // Update hash after successful auto-save
                        this.savedCodeHash = this.hashCode(code);
                        // Show saved state
                        this.showSavedState();
                    }
                })
                .catch(error => {
                    console.warn('Auto-save error:', error.message);
                });

                this.saveTimeout = null;
            } catch (error) {
                console.error('Failed to prepare save:', error);
                this.saveTimeout = null;
            }
        }, 1000); // 1 second debounce
    }

    /**
     * Load code from server or return default
     */
    async loadCode() {
        try {
            const response = await fetch('/api/load-code');
            const data = await response.json();

            if (data.code) {
                return data.code;
            }
            return this.DEFAULT_CODE;
        } catch (error) {
            console.error('Failed to load code from server:', error);
            return this.DEFAULT_CODE;
        }
    }

    /**
     * Load available presets
     */
    async loadPresets() {
        try {
            const response = await fetch('/api/presets');
            const data = await response.json();
            return data.presets || [];
        } catch (error) {
            console.error('Failed to load presets:', error);
            return [];
        }
    }

    /**
     * Load a specific preset by name
     * IMPORTANT: Presets are TEMPORARY and are NOT saved to user_code.txt
     * User must click "Save" to persist their own code
     */
    async loadPreset(presetName) {
        try {
            const response = await fetch(`/api/preset/${presetName}`);
            const data = await response.json();

            if (data.code) {
                this.editor.setValue(data.code);

                // Track which preset is currently loaded
                this.currentPreset = presetName;

                // Persist last loaded preset in localStorage for auto-load on refresh
                try {
                    localStorage.setItem(this.LAST_PRESET_KEY, presetName);
                } catch (e) {
                    // Ignore if localStorage unavailable
                }

                // Update the dropdown to show current preset
                const select = document.getElementById('presetSelect');
                if (select) {
                    select.value = presetName;
                }

                // DO NOT SAVE TO USER CODE! Presets are temporary
                // User must explicitly click Save button to persist their own code
                this.log(`✓ Loaded preset: ${presetName}`, 'success');
                return true;
            } else {
                this.log(`✗ Preset not found: ${presetName}`, 'error');
                return false;
            }
        } catch (error) {
            console.error('Failed to load preset:', error);
            this.log(`✗ Error loading preset: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Save code immediately (no debounce)
     * Used for preset loads and explicit resets
     */
    async saveCodeImmediate() {
        try {
            const code = this.editor.getValue();
            const response = await fetch('/api/save-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Server returned error');
            }

            console.log('✓ Code saved successfully to server');
            return true;
        } catch (error) {
            console.error('Save failed:', error.message);
            throw error; // Re-throw so manualSave can catch it
        }
    }

    /**
     * Manual save with visual feedback
     * Called when user clicks Save button
     */
    async manualSave() {
        const btn = document.getElementById('saveCodeBtn');
        if (!btn) return;

        try {
            // Show "saving" state
            btn.classList.add('saving');
            btn.textContent = '⏳ Saving...';

            // DEBUG: Log what we're trying to save
            const code = this.editor.getValue();
            console.log(`[Save] Sending ${code.length} characters to server...`);

            // Save the code
            const result = await this.saveCodeImmediate();

            // Show "saved" state and update hash
            this.showSavedState();
            this.savedCodeHash = this.hashCode(code);
            this.log(`Code saved to server (${code.length} chars)`, 'success');
            console.log('[Save] SUCCESS: Code was saved');
        } catch (error) {
            console.error('[Save] FAILED:', error);
            btn.classList.remove('saving');
            btn.textContent = '❌ Error';
            this.log(`Failed to save code: ${error.message}`, 'error');

            // Reset button after 2 seconds
            setTimeout(() => {
                btn.textContent = 'Save';
            }, 2000);
        }
    }

    /**
     * Save code to the currently loaded preset
     * Uses this.currentPreset - no dialog needed!
     */
    async saveToPreset() {
        const btn = document.getElementById('savePresetBtn');
        if (!btn) return;

        try {
            // Check if a preset is currently loaded
            if (!this.currentPreset) {
                this.log('⚠️ Load a preset first, then Save to Preset', 'error');
                return;
            }

            // Show "saving" state
            btn.classList.add('saving');
            btn.textContent = '⏳ Saving...';

            // Get current code
            const code = this.editor.getValue();
            console.log(`[Save Preset] Saving ${code.length} characters to preset "${this.currentPreset}"...`);

            // Send to server
            const response = await fetch(`/api/preset/${this.currentPreset}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Server returned error');
            }

            // Show "saved" state
            btn.classList.remove('saving');
            btn.classList.add('saved');
            btn.textContent = '✓ Saved!';
            this.log(`✓ Code saved to preset: ${this.currentPreset}`, 'success');
            console.log('[Save Preset] SUCCESS: Preset was saved');

            // Reset button after 2 seconds
            setTimeout(() => {
                btn.classList.remove('saved');
                btn.textContent = 'Save';
            }, 2000);

        } catch (error) {
            console.error('[Save Preset] FAILED:', error);
            btn.classList.remove('saving');
            btn.textContent = '❌ Error';
            this.log(`Failed to save preset: ${error.message}`, 'error');

            // Reset button after 2 seconds
            setTimeout(() => {
                btn.textContent = 'Save';
            }, 2000);
        }
    }

    /**
     * Reset code - load a preset or default code
     * IMPORTANT: This loads code TEMPORARILY. Click Save to persist!
     */
    async resetCode() {
        const presets = await this.loadPresets();

        if (presets.length === 0) {
            // Fallback to hardcoded default if no presets available
            if (confirm('Load default code? (Click Save to persist)\n\nThis will overwrite your editor.')) {
                this.editor.setValue(this.DEFAULT_CODE);
                this.currentPreset = null;
                const select = document.getElementById('presetSelect');
                if (select) select.value = '';
                this.log('✓ Default code loaded (not saved - click Save to keep it)', 'info');
            }
            return;
        }

        // Show preset selection dialog
        const presetNames = presets.map(p => p.name).sort();
        const presetList = presetNames.join('\n');
        const selected = prompt(
            `Select a preset to load:\n\n${presetList}\n\nOr cancel to use default code\n\n(Click Save to persist)`,
            presetNames[0]
        );

        if (selected) {
            await this.loadPreset(selected);
        } else if (selected === '') {
            // User clicked OK but left it empty - load default
            if (confirm('Load default code? (Click Save to persist)')) {
                this.editor.setValue(this.DEFAULT_CODE);
                this.currentPreset = null;
                const select = document.getElementById('presetSelect');
                if (select) select.value = '';
                this.log('✓ Default code loaded (not saved - click Save to keep it)', 'info');
            }
        }
        // If cancel (null), do nothing
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

    /**
     * Show examples modal
     */
    showExamples() {
        const modal = document.getElementById('examplesModal');
        modal.classList.add('show');
        this.log('Examples opened', 'info');
    }

    /**
     * Hide examples modal
     */
    hideExamples() {
        const modal = document.getElementById('examplesModal');
        modal.classList.remove('show');
    }

    /**
     * Setup master effects controls
     */
    setupMasterControls() {
        // Store slider references
        const lpfSlider = document.getElementById('masterLPF');
        const lpfValue = document.getElementById('masterLPFValue');
        const hpfSlider = document.getElementById('masterHPF');
        const hpfValue = document.getElementById('masterHPFValue');
        const reverbSlider = document.getElementById('masterReverb');
        const reverbValue = document.getElementById('masterReverbValue');
        const delaySlider = document.getElementById('masterDelay');
        const delayValue = document.getElementById('masterDelayValue');
        const volumeSlider = document.getElementById('masterVolume');
        const volumeValue = document.getElementById('masterVolumeValue');

        // Flag to prevent feedback loops
        let isUpdatingFromCode = false;

        // Register UI update callback with masterBus (safe check)
        if (window.masterBus && typeof window.masterBus.setUIUpdateCallback === 'function') {
            window.masterBus.setUIUpdateCallback((param, value) => {
                isUpdatingFromCode = true;

                try {
                    switch(param) {
                        case 'lpf':
                            lpfSlider.value = value;
                            lpfValue.textContent = value >= 1000 ? `${(value / 1000).toFixed(1)}kHz` : `${value}Hz`;
                            break;
                        case 'hpf':
                            hpfSlider.value = value;
                            hpfValue.textContent = `${value}Hz`;
                            break;
                        case 'reverb':
                            reverbSlider.value = Math.round(value * 100);
                            reverbValue.textContent = `${Math.round(value * 100)}%`;
                            break;
                        case 'delay':
                            delaySlider.value = Math.round(value * 100);
                            delayValue.textContent = `${Math.round(value * 100)}%`;
                            break;
                        case 'volume':
                            volumeSlider.value = Math.round(value * 100);
                            volumeValue.textContent = `${Math.round(value * 100)}%`;
                            break;
                    }
                } catch (e) {
                    console.error('Error updating UI:', e);
                }

                setTimeout(() => { isUpdatingFromCode = false; }, 50);
            });
        }

        // LPF slider
        lpfSlider.addEventListener('input', (e) => {
            if (isUpdatingFromCode) return;
            const freq = parseInt(e.target.value);
            window.masterBus.setLPF(freq);
            lpfValue.textContent = freq >= 1000 ? `${(freq / 1000).toFixed(1)}kHz` : `${freq}Hz`;
        });

        // HPF slider
        hpfSlider.addEventListener('input', (e) => {
            if (isUpdatingFromCode) return;
            const freq = parseInt(e.target.value);
            window.masterBus.setHPF(freq);
            hpfValue.textContent = `${freq}Hz`;
        });

        // Reverb slider
        reverbSlider.addEventListener('input', (e) => {
            if (isUpdatingFromCode) return;
            const amount = parseInt(e.target.value) / 100;
            window.masterBus.setReverb(amount);
            reverbValue.textContent = `${e.target.value}%`;
        });

        // Delay slider
        delaySlider.addEventListener('input', (e) => {
            if (isUpdatingFromCode) return;
            const amount = parseInt(e.target.value) / 100;
            window.masterBus.setDelay(amount);
            delayValue.textContent = `${e.target.value}%`;
        });

        // Volume slider
        volumeSlider.addEventListener('input', (e) => {
            if (isUpdatingFromCode) return;
            const volume = parseInt(e.target.value) / 100;
            window.masterBus.setVolume(volume);
            volumeValue.textContent = `${e.target.value}%`;
        });

        // Reset button
        document.getElementById('masterResetBtn').addEventListener('click', () => {
            window.masterBus.reset();

            // Reset UI sliders (will trigger UI update via callback)
            this.log('Master effects reset', 'info');
        });
    }

    /**
     * Setup audio info display
     */
    setupAudioInfo() {
        // Function to update BPM display
        const updateTempoDisplay = () => {
            const tempoSpan = document.getElementById('metronomeTempo');
            if (tempoSpan && window.scheduler && window.scheduler.bpm) {
                tempoSpan.textContent = `${window.scheduler.bpm} BPM`;
            }
        };

        // Update immediately if scheduler ready
        if (window.scheduler && window.scheduler.bpm) {
            updateTempoDisplay();
        }
        
        // Also try after a short delay (in case scheduler initializes late)
        setTimeout(() => {
            updateTempoDisplay();
        }, 100);

        // Update audio info when audio starts
        const updateAudioInfo = () => {
            try {
                const stateSpan = document.getElementById('audioContextState');
                const sampleRateSpan = document.getElementById('audioSampleRate');
                const latencySpan = document.getElementById('audioLatency');

                if (Tone.context) {
                    stateSpan.textContent = Tone.context.state;
                    sampleRateSpan.textContent = `${Tone.context.sampleRate}Hz`;

                    // Calculate real latency: baseLatency + output buffer
                    const baseLatency = Tone.context.baseLatency || 0;
                    const bufferSize = Tone.context.bufferSize || 256;
                    const sampleRate = Tone.context.sampleRate || 48000;
                    const bufferLatency = (bufferSize / sampleRate) * 1000; // Convert to ms
                    const totalLatency = (baseLatency * 1000) + bufferLatency;
                    
                    latencySpan.textContent = totalLatency.toFixed(1);
                }

                // Update tempo display
                updateTempoDisplay();
            } catch (e) {
                console.warn('Could not update audio info:', e);
            }
        };

        // Update on start
        const originalStart = this.start.bind(this);
        this.start = async function() {
            await originalStart();
            setTimeout(updateAudioInfo, 100);
        };

        // Update tempo display when BPM changes
        const bpmInput = document.getElementById('bpmInput');
        if (bpmInput) {
            bpmInput.addEventListener('change', (e) => {
                const newBPM = parseInt(e.target.value);
                if (window.scheduler) {
                    window.scheduler.setBPM(newBPM);
                    updateTempoDisplay();
                }
            });
        }
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
