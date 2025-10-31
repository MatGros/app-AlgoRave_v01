/**
 * AlgoSignalSound - Visualizations
 * Timeline and scope visualizations
 */

class Visualizer {
    constructor() {
        this.timelineCanvas = null;
        this.scopeCanvas = null;
        this.timelineCtx = null;
        this.scopeCtx = null;
        this.animationId = null;
    }

    /**
     * Initialize visualizer
     */
    init() {
        this.timelineCanvas = document.getElementById('timeline');
        this.scopeCanvas = document.getElementById('scope');

        if (this.timelineCanvas) {
            this.timelineCtx = this.timelineCanvas.getContext('2d');
        }

        if (this.scopeCanvas) {
            this.scopeCtx = this.scopeCanvas.getContext('2d');
        }

        this.startAnimation();
    }

    /**
     * Start animation loop
     */
    startAnimation() {
        const animate = () => {
            this.drawTimeline();
            this.drawScope();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * Stop animation
     */
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Draw pattern timeline
     */
    drawTimeline() {
        if (!this.timelineCtx) return;

        const ctx = this.timelineCtx;
        const width = this.timelineCanvas.width;
        const height = this.timelineCanvas.height;

        // Clear
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, width, height);

        if (!window.scheduler || !window.scheduler.isPlaying) {
            ctx.fillStyle = '#808080';
            ctx.font = '12px Consolas';
            ctx.textAlign = 'center';
            ctx.fillText('Not playing', width / 2, height / 2);
            return;
        }

        // Get current cycle progress
        const cycleProgress = (Tone.Transport.seconds % 2) / 2; // 0-1 through cycle

        // Draw cycle progress bar
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(0, height - 10, width * cycleProgress, 10);

        // Draw grid (16 steps)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 16; i++) {
            const x = (i / 16) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height - 10);
            ctx.stroke();
        }

        // Draw beat markers
        ctx.fillStyle = '#00d4ff';
        for (let i = 0; i < 4; i++) {
            const x = (i / 4) * width;
            ctx.fillRect(x - 1, 0, 2, height - 10);
        }

        // Color palette for slots
        const slotColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B'
        ];

        // Draw pattern events with slot labels
        const patterns = window.scheduler.patterns;
        let yOffset = 5;

        patterns.forEach((pattern, id) => {
            // Safety check: ensure pattern is valid and has the method
            if (!pattern || typeof pattern.getEventsForCycle !== 'function') {
                return;
            }

            // Extract slot number from id (d1, d2, etc.)
            const slotMatch = id.match(/d(\d)/);
            const slotNumber = slotMatch ? parseInt(slotMatch[1]) : 0;
            const slotColor = slotColors[(slotNumber - 1) % slotColors.length];

            const events = pattern.getEventsForCycle(window.scheduler.currentCycle);

            // Draw slot background
            ctx.fillStyle = slotColor + '20'; // Semi-transparent
            ctx.fillRect(0, yOffset, width, 10);

            // Draw events
            events.forEach(event => {
                const x = event.time * width;
                const w = event.duration * width;

                ctx.fillStyle = slotColor;
                ctx.fillRect(x, yOffset, Math.max(2, w), 10);

                // Add border
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, yOffset, Math.max(2, w), 10);
            });

            // Draw slot label on left border with background
            // Background rectangle for label
            ctx.fillStyle = slotColor;
            ctx.fillRect(0, yOffset, 30, 12);
            
            // Label text
            ctx.fillStyle = '#000';
            ctx.font = 'bold 11px Consolas';
            ctx.textAlign = 'center';
            ctx.fillText(id, 15, yOffset + 8);

            yOffset += 12;
            if (yOffset > height - 20) yOffset = 5;
        });
    }

    /**
     * Draw waveform scope synchronized to tempo
     */
    drawScope() {
        if (!this.scopeCtx) return;

        const ctx = this.scopeCtx;
        const width = this.scopeCanvas.width;
        const height = this.scopeCanvas.height;

        // Clear
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, width, height);

        // Create analyser if needed
        // Connect directly to Tone.Destination to capture all audio
        if (!this.analyser) {
            this.analyser = new Tone.Analyser('waveform', 512);
            
            try {
                // Connect analyser in parallel to Destination (captures everything being output)
                Tone.Destination.fan(this.analyser);
                console.log('✓ Analyser connected to Tone.Destination');
            } catch (e) {
                console.warn('Could not connect analyser:', e.message);
            }
        }

        if (!this.analyser) {
            ctx.fillStyle = '#808080';
            ctx.font = '12px Consolas';
            ctx.textAlign = 'center';
            ctx.fillText('No audio', width / 2, height / 2);
            return;
        }

        // Get current transport time and BPM for synchronization
        const transportTime = Tone.Transport.seconds;
        const bpm = Tone.Transport.bpm.value;
        const beatDuration = 60 / bpm; // Duration of one beat in seconds
        const cycleDuration = beatDuration * 4; // One cycle = 4 beats
        
        // Synchronize to cycle: get phase within current cycle (0-1)
        const cyclePhase = (transportTime % cycleDuration) / cycleDuration;
        
        // Calculate the time window to capture (one beat worth of audio)
        const timeWindowDuration = beatDuration;
        const startTime = transportTime - (cyclePhase * cycleDuration) + (cyclePhase * timeWindowDuration);
        
        // Get waveform data - higher resolution for better visualization
        const waveform = this.analyser.getValue();

        // Calculate audio level for psychedelic visuals (RMS + Peak detection)
        if (window.psychedelicVisuals && waveform && waveform.length > 0) {
            // Calculate RMS (Root Mean Square) for average level
            let sumSquares = 0;
            let peakLevel = 0;
            for (let i = 0; i < waveform.length; i++) {
                const sample = Math.abs(waveform[i]);
                sumSquares += sample * sample;
                peakLevel = Math.max(peakLevel, sample);
            }
            const rmsLevel = Math.sqrt(sumSquares / waveform.length);
            
            // Use peak for immediate responsiveness, with some RMS for stability
            const audioLevel = Math.max(rmsLevel * 0.7, peakLevel * 0.3);
            
            // Normalize to 0-1 range
            const normalizedLevel = Math.min(1, audioLevel * 2); // Multiply by 2 to amplify reactivity
            
            window.psychedelicVisuals.updateAudioLevel(normalizedLevel);
        }

        // Draw grid lines (beat markers)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const x = (i / 4) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Draw waveform with smooth interpolation
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const sliceWidth = width / waveform.length;
        let x = 0;
        let firstPoint = true;

        for (let i = 0; i < waveform.length; i++) {
            const v = (waveform[i] + 1) / 2; // Normalize -1/1 to 0/1
            const y = v * height;

            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.stroke();

        // Draw center line (zero crossing)
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw cycle synchronization indicator
        ctx.fillStyle = '#ff0088';
        ctx.globalAlpha = 0.3 + (0.7 * cyclePhase); // Pulse with cycle
        ctx.fillRect(0, 0, width * cyclePhase, 3);
        ctx.globalAlpha = 1.0;

        // Draw info text
        ctx.fillStyle = '#00d4ff';
        ctx.font = '10px Consolas';
        ctx.textAlign = 'left';
        ctx.fillText(`BPM: ${Math.round(bpm)}`, 5, 12);
        ctx.fillText(`Cycle: ${(cyclePhase * 100).toFixed(0)}%`, 5, 24);
    }
}

// Create global instance
window.visualizer = new Visualizer();
