/**
 * ALGORAVE - Psychedelic Visuals
 * 2D/3D animated visuals that react to music
 */

class PsychedelicVisuals {
    constructor(canvasId) {
        this.setCanvas(canvasId);
        this.isValid = !!this.canvas;
        
        // Animation state
        this.time = 0;
        this.rotation = 0;
        this.scale = 1;
        this.animationFrame = null;
        this.isRunning = false;

        // Audio-reactive state (MUST be initialized before animation)
        this.audioLevel = 0; // 0-1, updated from audio analyzer
        this.beatPulse = 0;  // 0-1, triggered on beat

        // Color palette (psychedelic) - MUST be before initParticles
        this.colors = [
            '#00FF88', // Green (accent)
            '#FF0088', // Magenta
            '#00FFFF', // Cyan
            '#FF8800', // Orange
            '#8800FF', // Purple
            '#FFFF00', // Yellow
        ];

        // Visual parameters
        this.spiralCount = 8;
        this.particleCount = 50;
        this.particles = [];

        // Initialize particles
        this.initParticles();
    }

    /**
     * Set the canvas to draw on
     */
    setCanvas(canvasId) {
        let canvas;
        if (typeof canvasId === 'string') {
            canvas = document.getElementById(canvasId);
        } else {
            canvas = canvasId; // Assume it's already a canvas element
        }

        if (!canvas) {
            console.warn('❌ Psychedelic canvas not found:', canvasId);
            this.canvas = null;
            this.ctx = null;
            this.isValid = false;
            return;
        }

        const canvasName = typeof canvasId === 'string' ? canvasId : canvas.id;
        console.log('✓ Psychedelic canvas set:', canvasName);
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.isValid = true;
    }

    /**
     * Switch to a different canvas (for popup mode)
     */
    switchToCanvas(canvasOrId) {
        this.setCanvas(canvasOrId);
    }

    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                angle: (i / this.particleCount) * Math.PI * 2,
                radius: Math.random() * 100 + 50,
                speed: Math.random() * 0.02 + 0.01,
                size: Math.random() * 3 + 1,
                colorIndex: Math.floor(Math.random() * this.colors.length)
            });
        }
    }

    /**
     * Update audio level from analyzer
     */
    updateAudioLevel(level) {
        // level is 0-1
        this.audioLevel = level;
    }

    /**
     * Called on each beat for pulse effect
     */
    onBeat() {
        this.beatPulse = 1.0;
    }

    /**
     * Start animation loop
     */
    start() {
        if (!this.isValid) {
            console.warn('❌ Cannot start psychedelic visuals - canvas not valid');
            return;
        }
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('▶ Psychedelic visuals started');
        this.animate();
    }

    /**
     * Stop animation loop
     */
    stop() {
        if (!this.isValid) return;
        this.isRunning = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        console.log('⏹ Psychedelic visuals stopped');
    }

    /**
     * Main animation loop
     */
    animate() {
        if (!this.isRunning) {
            console.log('Animation stopped, exiting loop');
            return;
        }

        // Clear with fade effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Update time
        this.time += 0.02;
        this.rotation += 0.01;
        
        // Decay beat pulse
        this.beatPulse *= 0.95;

        // Center point
        const cx = this.width / 2;
        const cy = this.height / 2;

        // Draw rotating spirals
        this.drawSpirals(cx, cy);

        // Draw particles
        this.drawParticles(cx, cy);

        // Draw center circle that pulses with beat
        this.drawCenterPulse(cx, cy);

        // Continue animation
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    /**
     * Draw rotating spirals
     */
    drawSpirals(cx, cy) {
        // Make spirals much more responsive to audio
        const audioAmplitude = this.audioLevel * 100; // Scale up for bigger effect
        const baseRadius = 40 + audioAmplitude + this.beatPulse * 40;
        const pulseScale = 1 + this.beatPulse * 0.5 + this.audioLevel * 0.3;

        for (let i = 0; i < this.spiralCount; i++) {
            const angle = (i / this.spiralCount) * Math.PI * 2 + this.rotation;
            const color = this.colors[i % this.colors.length];
            
            // Line width varies with audio
            this.ctx.lineWidth = 1 + this.audioLevel * 3;
            this.ctx.strokeStyle = color;
            this.ctx.globalAlpha = 0.5 + this.audioLevel * 0.5;
            
            this.ctx.beginPath();
            
            // Draw spiral arm - more responsive to audio
            for (let t = 0; t < Math.PI * 4; t += 0.1) {
                const r = baseRadius + t * 8 * pulseScale + Math.sin(this.time + t) * audioAmplitude;
                const a = angle + t;
                const x = cx + Math.cos(a) * r;
                const y = cy + Math.sin(a) * r;
                
                if (t === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Draw animated particles
     */
    drawParticles(cx, cy) {
        this.particles.forEach((p, i) => {
            // Update particle position
            p.angle += p.speed;
            
            // Calculate position
            const radius = p.radius + Math.sin(this.time + i) * 20;
            const x = cx + Math.cos(p.angle) * radius;
            const y = cy + Math.sin(p.angle) * radius;
            
            // Draw particle
            const color = this.colors[p.colorIndex];
            this.ctx.fillStyle = color;
            this.ctx.globalAlpha = 0.8;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, p.size * (1 + this.audioLevel * 0.5), 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw trail
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 0.3;
            
            const trailLength = 20;
            for (let j = 1; j < trailLength; j++) {
                const trailAngle = p.angle - p.speed * j;
                const trailRadius = p.radius + Math.sin(this.time - j * 0.1 + i) * 20;
                const tx = cx + Math.cos(trailAngle) * trailRadius;
                const ty = cy + Math.sin(trailAngle) * trailRadius;
                
                if (j === 1) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                }
                this.ctx.lineTo(tx, ty);
            }
            this.ctx.stroke();
        });
        
        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Draw center circle that pulses with beat and audio
     */
    drawCenterPulse(cx, cy) {
        // Validate inputs
        if (!isFinite(cx) || !isFinite(cy)) {
            console.warn('Invalid center coordinates:', cx, cy);
            return;
        }

        // React to both beat and audio level
        const audioRadius = this.audioLevel * 50;
        const beatRadius = this.beatPulse * 25;
        const radius = Math.max(5, 15 + beatRadius + audioRadius);
        
        if (!isFinite(radius)) {
            console.warn('Invalid radius:', radius);
            return;
        }
        
        try {
            // Outer glow (audio-reactive)
            const glowSize = radius * 2 + this.audioLevel * 30;
            const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
            
            // Color varies with intensity
            const hue = Math.floor(this.audioLevel * 360);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.8)`);
            gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, 0.3)`);
            gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Inner circle (bright when audio is loud)
            const brightness = 100 + this.audioLevel * 155; // 100-255
            this.ctx.fillStyle = `rgb(0, ${Math.floor(brightness)}, 136)`;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Rotating ring (spins faster with audio)
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 2 + this.audioLevel * 2;
            this.ctx.globalAlpha = 0.5 + this.audioLevel * 0.5;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        } catch (e) {
            console.warn('Error drawing center pulse:', e.message);
        }
    }
}

// Create global instance
window.psychedelicVisuals = new PsychedelicVisuals('psychedelicCanvas');
