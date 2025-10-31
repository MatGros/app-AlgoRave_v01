/**
 * AlgoSignalSound - Sample Management
 * Loads custom audio samples and provides fallback to synthesized drums
 */

class SampleLibrary {
    constructor() {
        this.samples = {}; // Map of sample name -> Tone.Buffer
        this.playerPool = []; // Pool of reusable players
        this.poolIndex = 0; // Round-robin index for pool
        this.loaded = false;
        this.loadedCount = 0;
        this.failedCount = 0;

        // Configuration: which samples to try loading
        this.sampleConfig = {
            // Drum samples with numbered variations - folders reflect current repo layout
            drums: {
                'bd': { folder: 'kicks', count: 5, aliases: ['kick'] },
                'sd': { folder: 'snares', count: 3, aliases: ['sd'] },
                'hh': { folder: 'hats', count: 3, aliases: ['hh', 'hat'] },
                'cp': { folder: 'claps', count: 3, aliases: ['cp'] },
                'perc': { folder: 'perc', count: 3, aliases: ['perc'] },
                'fx': { folder: 'fx', count: 3, aliases: ['fx'] },
                'bass': { folder: 'bass', count: 5, aliases: ['bass'] }
            },
            // Custom samples (add your own here!)
            custom: [
                // Examples: 'lead', 'vocal', 'fx'
            ]
        };

        // Synth fallback mapping (for when samples don't exist)
        this.synthFallback = {
            'bd': 'kick',
            'sd': 'snare',
            'hh': 'hihat',
            'cp': 'clap',
            'oh': 'openhh',
            'kick': 'kick',
            'snare': 'snare',
            'hihat': 'hihat',
            'clap': 'clap',
            'openhh': 'openhh'
        };

        // Sample mode: when true, events with no sample will NOT use synth fallback
        // To explicitly use synth, prefix sound name with "synth:" (e.g. "synth:clap")
        this.SAMPLE_ONLY = true;
    }

    /**
     * Generate a short synthetic clap rendered to an AudioBuffer using Offline rendering.
     * This creates a sample-like buffer so that shorthands like 'cp' can use the player path
     * and get consistent timing with other samples.
     */
    async generateSyntheticClap() {
        try {
            // Duration in seconds
            const DURATION = 0.25;

            // Use Tone.Offline to render a short noise-based clap
            const rendered = await Tone.Offline(() => {
                // Noise burst
                const noise = new Tone.Noise('white').start();

                // Short envelope
                const env = new Tone.AmplitudeEnvelope({
                    attack: 0.002,
                    decay: 0.06,
                    sustain: 0,
                    release: 0.01
                }).toDestination();

                // Bandpass to shape the clap
                const bp = new Tone.Filter(1400, 'bandpass');
                noise.connect(bp);
                bp.connect(env);

                // Trigger
                env.triggerAttackRelease(0.06, 0);
                // stop noise slightly after
                noise.stop(0.06 + 0.02);
            }, DURATION);

            // Wrap into Tone.Buffer and store
            const buffer = new Tone.Buffer(rendered);
            this.samples['clap1'] = buffer;
            this.loadedCount++;
            console.log('✓ Generated synthetic clap sample: clap1');
        } catch (e) {
            console.warn('Error generating synthetic clap sample:', e);
            throw e;
        }
    }

    /**
     * Map base drum names (bd, sd, hh, etc.) to the first available loaded user sample
     * Example: if kick1 is loaded, map 'bd' -> kick1 so s('bd') uses the sample instead of synth fallback
     */
    mapDrumAliases() {
        for (const [drumName, config] of Object.entries(this.sampleConfig.drums)) {
            // If base name already has a loaded buffer, skip
            if (this.samples[drumName]) continue;

            // Search aliases (kick, snare, hat...) for first loaded variation
            let found = null;
            for (const alias of config.aliases) {
                for (let i = 1; i <= config.count; i++) {
                    const candidate = `${alias}${i}`.toLowerCase();
                    if (this.samples[candidate]) {
                        found = candidate;
                        break;
                    }
                }
                if (found) break;
            }

            if (found) {
                // Map base drum name to the first found alias buffer
                this.samples[drumName] = this.samples[found];
                console.log(`Mapped drum shorthand '${drumName}' -> '${found}'`);
            }
        }

        // Also map synthFallback keys (e.g., 'cp' -> find 'clap1' or 'cp1')
        for (const [shortName, longName] of Object.entries(this.synthFallback)) {
            // If already mapped or loaded, skip
            if (this.samples[shortName]) continue;

            // Search for a loaded sample that matches either the shortName or the longName
            let candidate = null;
            // Exact matches first
            if (this.samples[shortName]) candidate = shortName;
            if (!candidate && this.samples[longName]) candidate = longName;

            // Then try numbered variations (e.g., clap1, cp1, longName1)
            if (!candidate) {
                for (const name of Object.keys(this.samples)) {
                    const lower = name.toLowerCase();
                    if (lower.startsWith(shortName) || lower.startsWith(longName)) {
                        candidate = name;
                        break;
                    }
                }
            }

            if (candidate) {
                this.samples[shortName] = this.samples[candidate];
                console.log(`Mapped fallback shorthand '${shortName}' -> '${candidate}'`);
            }
        }

        // If some common percussion shorthands still aren't mapped (no user sample available),
        // map them to a best-effort existing sample to preserve timing consistency.
        const bestEffortMap = {
            'cp': ['sd', 'snare1', 'snare'], // clap -> try snare
            'oh': ['hh', 'hat1', 'hh1'],      // open hat -> try hi-hat
            'clap': ['sd', 'snare1'],
            'openhh': ['hh', 'hat1']
        };

        for (const [shortName, candidates] of Object.entries(bestEffortMap)) {
            if (this.samples[shortName]) continue; // already mapped
            for (const c of candidates) {
                if (this.samples[c]) {
                    this.samples[shortName] = this.samples[c];
                    console.log(`Best-effort mapped '${shortName}' -> '${c}'`);
                    break;
                }
            }
        }
    }

    /**
     * Initialize sample library - loads all configured samples
     */
    async init() {
        // Prevent double initialization
        if (this.loaded) {
            console.log('Sample library already loaded');
            return;
        }

        console.log('🎵 Loading custom samples...');

        // Ensure Tone context is ready
        if (!Tone.context || Tone.context.state === 'offline') {
            console.log('  Waiting for Tone context to be ready...');
            await Tone.start();
        }

        // Initialize player pool for polyphonic playback
        this.initPlayerPool();

        // Try loading numbered drum samples
        await this.loadDrumSamples();

        // Try loading custom samples
        await this.loadCustomSamples();

        // Wait a bit for Tone.js to process all loaded samples
        await new Promise(resolve => setTimeout(resolve, 500));
        // If no user clap sample exists, generate a synthetic clap sample so 'cp' can use a sample-player path
        if (!this.samples['clap1'] && !this.samples['cp'] && !this.samples['clap']) {
            try {
                await this.generateSyntheticClap();
            } catch (e) {
                console.warn('Could not generate synthetic clap sample:', e);
            }
        }

        // Map base drum names (bd, sd, hh) to the first available user sample
        // This makes shorthand names like 'bd' use user samples when available
        this.mapDrumAliases();

    this.loaded = true;
        console.log(`✓ Sample library ready: ${this.loadedCount} loaded, ${this.failedCount} total attempts`);

        // Log loaded samples for user reference
        if (this.loadedCount > 0) {
            console.log('📂 Available samples:', Object.keys(this.samples).join(', '));
        }
    }

    /**
     * Initialize player pool (32 players for robust polyphony)
     * NOTE: Players are NOT connected to any destination here
     * They will be connected to per-event effect chains when played
     *
     * Pool size: 32 allows:
     * - 8 simultaneous samples per slot (drums, bass, etc.)
     * - Good safety margin for busy patterns
     * - No memory bloat (Tone.js Player is lightweight)
     */
    initPlayerPool() {
        try {
            const POOL_SIZE = 32; // Increased from 10 for better polyphony

            for (let i = 0; i < POOL_SIZE; i++) {
                const player = new Tone.Player();
                // Don't connect to anything - will be routed through effect chains
                this.playerPool.push(player);
            }
            console.log(`✓ Player pool initialized: ${this.playerPool.length} reusable players`);
        } catch (e) {
            console.warn('Error initializing player pool:', e.message);
            // Non-fatal - will still work
        }
    }

    /**
     * Get next player from pool (round-robin)
     */
    getPoolPlayer() {
        const player = this.playerPool[this.poolIndex % this.playerPool.length];
        this.poolIndex++;
        return player;
    }

    /**
     * Load numbered drum samples (bd1-bd9, sd1-sd9, etc.)
     * NOTE: Sample files use 1-based indexing (kick1.wav, kick2.wav, etc.)
     */
    async loadDrumSamples() {
        console.log('  Loading drum samples from folders...');
        const promises = [];

        for (const [drumName, config] of Object.entries(this.sampleConfig.drums)) {
            console.log(`  Scanning: ${config.folder}/ for ${drumName} variations...`);

            // Try loading numbered variations (kick1, kick2, etc. - 1-based indexing)
            for (let i = 1; i <= config.count; i++) {
                // Try with aliases first (kick1, snare1, etc.) - these are more likely to exist
                for (const alias of config.aliases) {
                    const aliasName = `${alias}${i}`;
                    // Only try .wav files (that's what actually exists)
                    const path = `samples/${config.folder}/${aliasName}.wav`;
                    promises.push(this.tryLoadSample(aliasName, path));
                }
            }
        }

        // Wait for all load attempts to complete
        await Promise.all(promises);
        console.log(`  Drum loading complete: ${this.loadedCount} loaded`);
    }

    /**
     * Load custom samples from config
     */
    async loadCustomSamples() {
        const promises = [];
        const extensions = ['wav', 'mp3', 'ogg'];

        for (const sampleName of this.sampleConfig.custom) {
            for (const ext of extensions) {
                const path = `samples/custom/${sampleName}.${ext}`;
                promises.push(this.tryLoadSample(sampleName, path));
            }
        }

        await Promise.all(promises);
    }

    /**
     * Try to load a single sample file
     * Stores decoded audio buffer for playback
     * @param {string} name - Sample name (for reference)
     * @param {string} path - Path to audio file
     */
    tryLoadSample(name, path) {
        // Skip if already loaded
        if (this.samples[name]) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            let resolved = false;
            
            try {
                // Timeout fallback - ensure promise resolves after 5 seconds
                const timeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        // Silent timeout for expected missing variations
                        this.failedCount++;
                        resolve();
                    }
                }, 5000);

                // Load the sample using Tone.Buffer which automatically decodes
                const buffer = new Tone.Buffer({
                    url: path,
                    onload: () => {
                        if (resolved) return;
                        resolved = true;
                        clearTimeout(timeout);
                        
                        // Successfully loaded
                        this.loadedCount++;
                        const durationMs = (buffer.duration * 1000).toFixed(0);
                        console.log(`  ✓ Loaded: ${name} (${durationMs}ms, ${buffer.numberOfChannels} ch)`);
                        // Store the decoded buffer
                        this.samples[name] = buffer;
                        resolve();
                    },
                    onerror: (err) => {
                        if (resolved) return;
                        resolved = true;
                        clearTimeout(timeout);
                        
                        // Failed to load - silent fail (expected for some numbered variations)
                        // console.log(`  ✗ Skipped: ${name}`);
                        this.failedCount++;
                        resolve();
                    }
                });
            } catch (error) {
                if (!resolved) {
                    resolved = true;
                    // Silent fail for expected missing variations
                    // console.log(`  ✗ Exception loading ${name}: ${error.message}`);
                    this.failedCount++;
                    resolve();
                }
            }
        });
    }

    /**
     * Play a sample using pooled player with per-event effect chain
     * @param {string} name - Sample name
     * @param {number} time - When to play (Tone.js time)
     * @param {Object|number} effects - Effect settings OR gain value for backward compatibility
     *        {gain: 1.0, room: 0, delay: 0, lpf: null, hpf: null, pan: 0.5}
     */
    play(name, time = '+0', effects = {gain: 1.0}) {
        if (!this.loaded) {
            console.warn('SampleLibrary not loaded yet');
            return;
        }

        // Backward compatibility: if effects is a number, treat it as gain
        if (typeof effects === 'number') {
            effects = { gain: effects };
        }

        // Ensure effects object has defaults
        if (!effects) effects = {};
        effects.gain = effects.gain !== undefined ? effects.gain : 1.0;

        const lowerName = name.toLowerCase();

    // Check explicit synth prefix: if user wants synth, allow fallback even in SAMPLE_ONLY mode
    const SYNTH_PREFIX = 'synth:';
    const wantsSynth = lowerName.startsWith(SYNTH_PREFIX);
    const requestedName = wantsSynth ? lowerName.slice(SYNTH_PREFIX.length) : lowerName;

    // Check if we have a loaded buffer
    if (this.samples[requestedName]) {
            try {
        const buffer = this.samples[requestedName];
                const player = this.getPoolPlayer();

                // Stop the player first in case it's still playing from pool reuse
                // This prevents "Start time must be strictly greater than previous start time" error
                try {
                    player.stop();
                } catch (e) {
                    // Ignore stop errors - player may not be playing
                }

                // Disconnect player from any previous connections
                if (player.connected) {
                    try {
                        player.disconnect();
                    } catch (e) {
                        // Ignore disconnect errors
                    }
                }

                // Set buffer
                player.buffer = buffer;

                // Create per-event effect chain
                const effectChain = window.effectsEngine.createEffectChain(effects, player);

                // Connect effect chain to master bus
                if (window.masterBus && typeof window.masterBus.getInput === 'function') {
                    effectChain.connect(window.masterBus.getInput());
                } else {
                    effectChain.toDestination();
                }

                // Schedule and start playback
                player.start(time);

                // Cleanup after playback using player's onstop callback
                // This is more reliable than setTimeout and doesn't block the audio thread
                const originalOnStop = player.onstop;
                player.onstop = () => {
                    // Call original if it existed
                    if (originalOnStop) originalOnStop.call(player);

                    // Cleanup effect chain - NOW DISPOSES ALL NODES PROPERLY
                    try {
                        effectChain.dispose();  // This now disposes ALL effect nodes, not just disconnects
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                };

                return;
            } catch (e) {
                console.warn(`Error playing sample ${name}: ${e.message}`);
            }
        }

        // No sample found. If SAMPLE_ONLY is enabled and the user did not explicitly request synth,
        // do NOT fall back to synth automatically. Otherwise, fall back as before.
        if (this.SAMPLE_ONLY && !wantsSynth) {
            console.log(`[SampleOnly] No sample for '${name}' - event skipped (SAMPLE_ONLY mode)`);
            return;
        }

        // Fallback to synthesized drums (pass duration for proper timing)
        const duration = effects._duration || 0.1; // Default fallback
        const fallbackName = wantsSynth ? requestedName : lowerName;
        this.fallbackToSynth(fallbackName, time, effects, duration);
    }

    /**
     * Fallback to synthesized drum when sample not found or not loaded
     * @param {string} lowerName - Sample name (e.g., "hh", "bd", "kick1")
     * @param {number} time - When to play (Tone.js time)
     * @param {Object} effects - Effect settings including gain, room, delay, etc.
     * @param {number} duration - Duration for this event (in seconds) - controls timing
     */
    fallbackToSynth(lowerName, time, effects, duration) {
        const drumType = this.synthFallback[lowerName];
        if (drumType) {
            // DEBUG: Log when falling back to synth
            console.log(`[Fallback] ${lowerName} -> synth ${drumType} with effects:`, effects);
            window.synthEngine.playDrum(drumType, time, effects, duration);
        } else {
            // Try to extract base drum name (e.g., kick0 -> kick)
            const baseName = lowerName.replace(/\d+$/, '');
            const baseDrumType = this.synthFallback[baseName];

            if (baseDrumType) {
                console.log(`[Fallback] ${lowerName} -> synth ${baseDrumType} (from base name)`);
                window.synthEngine.playDrum(baseDrumType, time, effects, duration);
            } else {
                console.warn(`Sample not found and no synth fallback: ${lowerName}`);
            }
        }
    }

    /**
     * Check if a sample exists (either loaded or has synth fallback)
     */
    has(name) {
        const lowerName = name.toLowerCase();

        // Check loaded samples
        if (this.samples[lowerName]) {
            return true;
        }

        // Check synth fallback
        if (this.synthFallback[lowerName]) {
            return true;
        }

        // Check if it's a numbered drum with fallback
        const baseName = lowerName.replace(/\d+$/, '');
        if (this.synthFallback[baseName]) {
            return true;
        }

        return false;
    }

    /**
     * Add a custom sample to the configuration
     * This allows users to dynamically add samples
     * @param {string} name - Sample name
     * @param {string} path - Path to audio file
     */
    async addCustomSample(name, path) {
        console.log(`Adding custom sample: ${name} from ${path}`);
        await this.tryLoadSample(name, path);
    }

    /**
     * Get info about loaded samples
     */
    getInfo() {
        return {
            loaded: this.loadedCount,
            failed: this.failedCount,
            total: this.loadedCount + this.failedCount,
            samples: Object.keys(this.samples)
        };
    }
}

// Create global instance
window.sampleLibrary = new SampleLibrary();
