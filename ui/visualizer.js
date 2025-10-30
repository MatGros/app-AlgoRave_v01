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
