/**
 * ALGORAVE - Visualizations
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

        // Draw pattern events
        const patterns = window.scheduler.patterns;
        let yOffset = 5;

        patterns.forEach((pattern, id) => {
            // Safety check: ensure pattern is valid and has the method
            if (!pattern || typeof pattern.getEventsForCycle !== 'function') {
                return;
            }

            const events = pattern.getEventsForCycle(window.scheduler.currentCycle);

            events.forEach(event => {
                const x = event.time * width;
                const w = event.duration * width;

                ctx.fillStyle = pattern.type === 'sound' ? '#00ff88' : '#ff0088';
                ctx.fillRect(x, yOffset, Math.max(2, w), 8);
            });

            yOffset += 12;
            if (yOffset > height - 20) yOffset = 5;
        });
    }

    /**
     * Draw waveform scope
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
        if (!this.analyser && window.synthEngine && window.synthEngine.masterGain) {
            this.analyser = new Tone.Analyser('waveform', 256);
            window.synthEngine.masterGain.connect(this.analyser);
        }

        if (!this.analyser) {
            ctx.fillStyle = '#808080';
            ctx.font = '12px Consolas';
            ctx.textAlign = 'center';
            ctx.fillText('No audio', width / 2, height / 2);
            return;
        }

        // Get waveform data
        const waveform = this.analyser.getValue();

        // Draw waveform
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const sliceWidth = width / waveform.length;
        let x = 0;

        for (let i = 0; i < waveform.length; i++) {
            const v = (waveform[i] + 1) / 2; // Normalize -1/1 to 0/1
            const y = v * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.stroke();

        // Draw center line
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
    }
}

// Create global instance
window.visualizer = new Visualizer();
