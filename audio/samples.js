/**
 * ALGORAVE - Sample Management
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
            // Drum samples with numbered variations
            drums: {
                'bd': { folder: 'kicks', count: 5, aliases: ['kick'] },
                'sd': { folder: 'snares', count: 3, aliases: ['snare'] },
                'hh': { folder: 'hats', count: 3, aliases: ['hat'] },
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
                        console.log(`  ✗ Timeout loading: ${name} from ${path}`);
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
                        
                        // Failed to load
                        console.log(`  ✗ Failed: ${name} - ${err}`);
                        this.failedCount++;
                        resolve();
                    }
                });
            } catch (error) {
                if (!resolved) {
                    resolved = true;
                    console.log(`  ✗ Exception loading ${name}: ${error.message}`);
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

        // Check if we have a loaded buffer
        if (this.samples[lowerName]) {
            try {
                const buffer = this.samples[lowerName];
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

        // Fallback to synthesized drums (pass duration for proper timing)
        const duration = effects._duration || 0.1; // Default fallback
        this.fallbackToSynth(lowerName, time, effects, duration);
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
