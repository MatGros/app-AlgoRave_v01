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
                'hh': { folder: 'hats', count: 3, aliases: ['hat', 'hihat'] },
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
     * Initialize player pool (10 players per sample for polyphony)
     */
    initPlayerPool() {
        try {
            for (let i = 0; i < 10; i++) {
                const player = new Tone.Player();
                
                // Route through master bus or destination
                // Wrap in try/catch in case context isn't ready yet
                try {
                    if (window.masterBus && typeof window.masterBus.getInput === 'function') {
                        player.connect(window.masterBus.getInput());
                    } else {
                        player.toDestination();
                    }
                } catch (e) {
                    console.warn('Could not connect player to destination (context may not be ready yet):', e.message);
                    // Player will be connected later when context is ready
                }
                
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
     * Load numbered drum samples (bd0-bd9, sd0-sd9, etc.)
     */
    async loadDrumSamples() {
        console.log('  Loading drum samples from folders...');
        const promises = [];

        for (const [drumName, config] of Object.entries(this.sampleConfig.drums)) {
            console.log(`  Scanning: ${config.folder}/ for ${drumName} variations...`);
            
            // Try loading numbered variations (kick0, kick1, etc.)
            for (let i = 0; i < config.count; i++) {
                // Try with aliases first (kick0, snare0, etc.) - these are more likely to exist
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
     * Play a sample using pooled player
     * @param {string} name - Sample name
     * @param {number} time - When to play (Tone.js time)
     * @param {number} gain - Volume (0-2, default 1.0)
     */
    play(name, time = '+0', gain = 1.0) {
        if (!this.loaded) {
            console.warn('SampleLibrary not loaded yet');
            return;
        }

        const lowerName = name.toLowerCase();

        // Check if we have a loaded buffer
        if (this.samples[lowerName]) {
            try {
                const buffer = this.samples[lowerName];
                const player = this.getPoolPlayer();
                
                // Ensure player is connected (may not be if context wasn't ready at init)
                try {
                    if (!player.destination || player.destination.type === undefined) {
                        // Player not connected, connect now
                        if (window.masterBus && typeof window.masterBus.getInput === 'function') {
                            player.connect(window.masterBus.getInput());
                        } else {
                            player.toDestination();
                        }
                    }
                } catch (e) {
                    // Silently handle connection errors
                }
                
                // Set buffer and gain
                player.buffer = buffer;
                player.volume.value = Tone.gainToDb(gain);
                
                // Schedule and start playback
                player.start(time);

                return;
            } catch (e) {
                console.warn(`Error playing sample ${name}: ${e.message}`);
            }
        }

        // Fallback to synthesized drums
        this.fallbackToSynth(lowerName, time, gain);
    }

    /**
     * Fallback to synthesized drum when sample not found or not loaded
     */
    fallbackToSynth(lowerName, time, gain) {
        const drumType = this.synthFallback[lowerName];
        if (drumType) {
            window.synthEngine.playDrum(drumType, time, gain);
        } else {
            // Try to extract base drum name (e.g., kick0 -> kick)
            const baseName = lowerName.replace(/\d+$/, '');
            const baseDrumType = this.synthFallback[baseName];

            if (baseDrumType) {
                window.synthEngine.playDrum(baseDrumType, time, gain);
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
