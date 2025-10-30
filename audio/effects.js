/**
 * ALGORAVE - Audio Effects
 * Manages audio effects using Tone.js
 */

/**
 * EffectChain - Represents a chain of audio effect nodes
 * Tracks all created nodes so they can be properly disposed
 */
class EffectChain {
    constructor(outputNode, nodes = []) {
        this.outputNode = outputNode;  // The last node in the chain (connect to this)
        this.nodes = nodes;             // All nodes created for this chain (for cleanup)
    }

    /**
     * Connect this chain to a destination
     */
    connect(destination) {
        this.outputNode.connect(destination);
        return this;
    }

    /**
     * Connect to Tone.Destination (fallback routing)
     */
    toDestination() {
        this.outputNode.toDestination();
        return this;
    }

    /**
     * Disconnect from all connections
     */
    disconnect() {
        if (this.outputNode) {
            this.outputNode.disconnect();
        }
        return this;
    }

    /**
     * Dispose ALL nodes in this chain
     * This is the critical fix - disposes every node, not just the output
     */
    dispose() {
        try {
            // Disconnect first
            if (this.outputNode) {
                this.outputNode.disconnect();
            }

            // Then dispose all nodes in reverse order (cleanup any internal connections)
            for (let i = this.nodes.length - 1; i >= 0; i--) {
                try {
                    this.nodes[i].dispose();
                } catch (e) {
                    // Ignore individual node disposal errors
                }
            }

            // Clear references
            this.outputNode = null;
            this.nodes = [];
        } catch (e) {
            console.warn('Error disposing effect chain:', e.message);
        }
    }
}

class EffectsEngine {
    constructor() {
        this.effects = {};
        this.initialized = false;
    }

    /**
     * Initialize effects
     */
    init() {
        if (this.initialized) return;

        // Note: These effects are for individual patterns
        // Master effects are in masterBus

        // Create effect instances
        this.effects.reverb = new Tone.Reverb({
            decay: 2.5,
            wet: 0
        }).connect(window.masterBus.getInput());

        this.effects.delay = new Tone.FeedbackDelay({
            delayTime: '8n',
            feedback: 0.3,
            wet: 0
        }).connect(window.masterBus.getInput());

        this.effects.lpf = new Tone.Filter({
            type: 'lowpass',
            frequency: 20000,
            rolloff: -24
        }).connect(window.masterBus.getInput());

        this.effects.hpf = new Tone.Filter({
            type: 'highpass',
            frequency: 20,
            rolloff: -24
        }).connect(window.masterBus.getInput());

        this.effects.panner = new Tone.Panner(0).connect(window.masterBus.getInput());

        this.initialized = true;
    }

    /**
     * Create a dynamic effect chain for a single audio event
     * Each event gets its own effect instances to avoid conflicts between simultaneous patterns
     * CRITICAL FIX: Returns EffectChain object that tracks all nodes for proper disposal
     *
     * @param {Object} effects - Effect settings {gain, room, delay, lpf, hpf, pan}
     * @param {Tone.AudioNode} source - Audio source
     * @returns {EffectChain} Effect chain object with proper disposal capabilities
     */
    createEffectChain(effects, source) {
        if (!this.initialized) {
            // Return a dummy chain that wraps the source
            return new EffectChain(source, []);
        }

        // Track all created nodes for disposal
        const createdNodes = [];

        // Start with the source
        let chain = source;

        // Create a gain node for the event (always present for volume control)
        const gainValue = effects.gain !== undefined ? effects.gain : 1.0;
        const gainNode = new Tone.Gain(gainValue);
        createdNodes.push(gainNode);  // TRACK THIS NODE
        chain.connect(gainNode);
        chain = gainNode;

        // Apply high-pass filter (if set)
        if (effects.hpf && effects.hpf > 20) {
            const hpf = new Tone.Filter({
                type: 'highpass',
                frequency: effects.hpf,
                rolloff: -24
            });
            createdNodes.push(hpf);  // TRACK THIS NODE
            chain.connect(hpf);
            chain = hpf;
        }

        // Apply low-pass filter (if set)
        if (effects.lpf && effects.lpf < 20000) {
            const lpf = new Tone.Filter({
                type: 'lowpass',
                frequency: effects.lpf,
                rolloff: -24
            });
            createdNodes.push(lpf);  // TRACK THIS NODE
            chain.connect(lpf);
            chain = lpf;
        }

        // Apply reverb/room effect (if set)
        if (effects.room && effects.room > 0) {
            const reverb = new Tone.Reverb({
                decay: 2.5,
                wet: effects.room
            });
            createdNodes.push(reverb);  // TRACK THIS NODE
            chain.connect(reverb);
            chain = reverb;
        }

        // Apply delay effect (if set)
        if (effects.delay && effects.delay > 0) {
            const delay = new Tone.FeedbackDelay({
                delayTime: '8n',
                feedback: 0.3,
                wet: effects.delay
            });
            createdNodes.push(delay);  // TRACK THIS NODE
            chain.connect(delay);
            chain = delay;
        }

        // Apply panning (if not centered)
        if (effects.pan !== undefined && effects.pan !== 0.5) {
            const panValue = (effects.pan - 0.5) * 2; // Convert 0-1 to -1 to 1
            const panner = new Tone.Panner(panValue);
            createdNodes.push(panner);  // TRACK THIS NODE
            chain.connect(panner);
            chain = panner;
        }

        // Return EffectChain that tracks all nodes
        return new EffectChain(chain, createdNodes);
    }

    /**
     * Apply effects to a pattern (deprecated - kept for compatibility)
     * @param {Pattern} pattern - Pattern with effects settings
     * @param {Tone.Signal} source - Audio source
     */
    applyEffects(pattern, source) {
        if (!this.initialized) return source;
        return this.createEffectChain(pattern.effects, source);
    }

    /**
     * Set global reverb amount
     */
    setReverb(amount) {
        if (this.effects.reverb) {
            this.effects.reverb.wet.value = amount;
        }
    }

    /**
     * Set global delay amount
     */
    setDelay(amount) {
        if (this.effects.delay) {
            this.effects.delay.wet.value = amount;
        }
    }
}

// Create global instance
window.effectsEngine = new EffectsEngine();
