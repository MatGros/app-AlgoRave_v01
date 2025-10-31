/**
 * AlgoSignalSound - Editor Visual Effects
 * Audio-reactive background and active line highlighting
 */

class EditorEffects {
    constructor(editor, visualizer) {
        this.editor = editor;
        this.visualizer = visualizer;
        this.animationId = null;
        this.isRunning = false;
        
        // Audio-reactive background settings
        this.audioReactive = true;
        this.baseHue = 200; // Base color (blue)
        this.lastVolume = 0;
        this.volumeSmooth = 0;
        
        // Active line tracking - multi-slot system
        this.activeLines = new Map(); // Map of line number -> { timestamp, slotNumber, color }
        this.slotHighlights = new Map(); // Map of slot number -> { lineNumber, color }
        this.highlightDuration = Infinity; // Never auto-remove (persistent until new line)
        
        // Slot colors (matching pattern colors)
        this.slotColors = {
            1: '#00ff88',  // Green (d1)
            2: '#00d4ff',  // Cyan (d2)
            3: '#ff0088',  // Pink (d3)
            4: '#ffaa00',  // Orange (d4)
            5: '#aa00ff',  // Purple (d5)
            6: '#ff8800',  // Dark Orange (d6)
            7: '#88ff00',  // Lime (d7)
            8: '#ff0044',  // Red (d8)
        };
    }

    /**
     * Start the visual effects
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    /**
     * Stop the visual effects
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // Reset to default background
        this.setEditorBackground('rgba(39, 40, 34, 1)'); // Monokai default
    }

    /**
     * Animation loop for audio-reactive effects
     */
    animate() {
        if (!this.isRunning) return;

        if (this.audioReactive && this.visualizer && this.visualizer.analyser) {
            this.updateAudioReactiveBackground();
        }

        this.updateActiveLineHighlights();

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    /**
     * Update editor background based on audio volume
     */
    updateAudioReactiveBackground() {
        try {
            // Get audio waveform data
            const waveform = this.visualizer.analyser.getValue();
            
            // Calculate RMS (volume)
            let sum = 0;
            for (let i = 0; i < waveform.length; i++) {
                sum += waveform[i] * waveform[i];
            }
            const rms = Math.sqrt(sum / waveform.length);
            const volume = Math.abs(rms); // Normalize to 0-1 range
            
            // Smooth the volume for less jarring transitions
            this.volumeSmooth = this.volumeSmooth * 0.85 + volume * 0.15;
            
            // Map volume to color intensity
            const intensity = Math.min(this.volumeSmooth * 100, 50); // Max 50 for readability
            const saturation = 20 + intensity; // 20-70%
            const lightness = 12 + intensity * 0.3; // 12-27% (keep it dark)
            
            // Vary hue slightly with audio
            const hueVariation = Math.sin(Date.now() / 1000) * 20;
            const hue = this.baseHue + hueVariation;
            
            // Apply to editor background
            const color = `hsla(${hue}, ${saturation}%, ${lightness}%, 1)`;
            this.setEditorBackground(color);
            
        } catch (e) {
            // Silently fail if analyser not ready
        }
    }

    /**
     * Set the editor background color
     */
    setEditorBackground(color) {
        const editorElement = this.editor.getWrapperElement();
        if (editorElement) {
            editorElement.style.backgroundColor = color;
            // Also update the gutters for consistency
            const gutters = editorElement.querySelector('.CodeMirror-gutters');
            if (gutters) {
                gutters.style.backgroundColor = color;
            }
        }
    }

    /**
     * Mark a line as active (just executed)
     * Highlight persists per slot: each slot keeps its last highlighted line
     * until a new line from the same slot is executed
     */
    markLineActive(lineNumber, slotNumber = null) {
        if (lineNumber == null) return;

        const color = slotNumber && this.slotColors[slotNumber] ? this.slotColors[slotNumber] : '#00ff88';

        // If this slot had a previous highlight, clear it
        if (this.slotHighlights.has(slotNumber)) {
            const prevData = this.slotHighlights.get(slotNumber);
            this.clearLineHighlight(prevData.lineNumber);
            this.activeLines.delete(prevData.lineNumber);
        }

        const now = Date.now();

        // Store the active line for this slot
        this.activeLines.set(lineNumber, { timestamp: now, slotNumber, color });
        this.slotHighlights.set(slotNumber, { lineNumber, color });

        // Apply immediate highlight with slot color
        this.highlightLine(lineNumber, color);
    }

    /**
     * Highlight a specific line with a color
     */
    highlightLine(lineNumber, color) {
        // Add a CSS class for the highlight
        this.editor.addLineClass(lineNumber, 'background', 'line-executed');
        this.editor.addLineClass(lineNumber, 'wrap', 'line-executed-wrap');
        
        // Apply the color directly using a marker/overlay for persistence
        // We'll use inline styles on the line background div
        setTimeout(() => {
            const lineElement = this.findLineBackgroundElement(lineNumber);
            if (lineElement) {
                // Convert hex to rgba for initial bright flash
                const r = parseInt(color.substr(1,2), 16);
                const g = parseInt(color.substr(3,2), 16);
                const b = parseInt(color.substr(5,2), 16);
                
                lineElement.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
                lineElement.style.borderLeft = `3px solid ${color}`;
                lineElement.style.boxShadow = `inset 0 0 20px rgba(${r}, ${g}, ${b}, 0.4)`;
                lineElement.style.position = 'relative';
                lineElement.style.zIndex = '10';
            }
        }, 10);
    }
    
    /**
     * Find the background div element for a specific line number
     * Uses CodeMirror's internal API to get the correct line position
     */
    findLineBackgroundElement(lineNumber) {
        try {
            // Get the line handle from CodeMirror
            const lineHandle = this.editor.getLineHandle(lineNumber);
            if (!lineHandle) return null;

            // Get the line's DOM element from the gutter (more reliable)
            const gutterMarker = this.editor.getWrapperElement().querySelector(
                `.CodeMirror-linenumber[data-line-number="${lineNumber}"]`
            );

            if (gutterMarker) {
                // Get the parent line container
                const lineElement = gutterMarker.closest('.CodeMirror-gutter-elt')?.nextElementSibling;
                if (lineElement) return lineElement;
            }

            // Fallback: Find by line content position
            const cm = this.editor;
            const coords = cm.charCoords({ line: lineNumber, ch: 0 }, 'local');
            const wrapper = cm.getWrapperElement();

            // Find the line element closest to these coordinates
            const allLines = wrapper.querySelectorAll('.CodeMirror-line');
            for (let i = 0; i < allLines.length; i++) {
                const rect = allLines[i].getBoundingClientRect();
                const wrapperRect = wrapper.getBoundingClientRect();
                if (Math.abs(rect.top - (wrapperRect.top + coords.top)) < 5) {
                    return allLines[i];
                }
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Clear highlight from a line
     */
    clearLineHighlight(lineNumber) {
        this.editor.removeLineClass(lineNumber, 'background', 'line-executed');
        this.editor.removeLineClass(lineNumber, 'wrap', 'line-executed-wrap');
        
        // Clean up inline styles
        const lineElement = this.findLineBackgroundElement(lineNumber);
        if (lineElement) {
            lineElement.style.backgroundColor = '';
            lineElement.style.borderLeft = '';
            lineElement.style.boxShadow = '';
            lineElement.style.position = '';
            lineElement.style.zIndex = '';
        }
    }

    /**
     * Update active line highlights (persistent, no timeout)
     * The highlight stays until a new line is executed
     */
    updateActiveLineHighlights() {
        for (const [lineNumber, data] of this.activeLines) {
            // Keep the highlight persistent - no fade out
            const lineElement = this.findLineBackgroundElement(lineNumber);
            if (lineElement) {
                const color = data.color || '#00ff88';
                const r = parseInt(color.substr(1,2), 16);
                const g = parseInt(color.substr(3,2), 16);
                const b = parseInt(color.substr(5,2), 16);

                // Maintain full opacity - persistent highlight
                lineElement.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
                lineElement.style.borderLeft = `3px solid ${color}`;
                lineElement.style.boxShadow = `inset 0 0 20px rgba(${r}, ${g}, ${b}, 0.4)`;
            }
        }
    }

    /**
     * Clear all highlights (used by hush/silence)
     */
    clearAllHighlights() {
        for (const [lineNumber] of this.activeLines) {
            this.clearLineHighlight(lineNumber);
        }
        this.activeLines.clear();
        this.slotHighlights.clear();
    }

    /**
     * Clear highlights for a specific slot (used by silence())
     */
    clearSlotHighlight(slotNumber) {
        if (this.slotHighlights.has(slotNumber)) {
            const data = this.slotHighlights.get(slotNumber);
            this.clearLineHighlight(data.lineNumber);
            this.activeLines.delete(data.lineNumber);
            this.slotHighlights.delete(slotNumber);
        }
    }

    /**
     * Toggle audio-reactive background
     */
    toggleAudioReactive() {
        this.audioReactive = !this.audioReactive;
        if (!this.audioReactive) {
            this.setEditorBackground('rgba(39, 40, 34, 1)'); // Reset to default
        }
        return this.audioReactive;
    }

    /**
     * Set base hue for audio-reactive colors
     */
    setBaseHue(hue) {
        this.baseHue = hue;
    }

    /**
     * Get current line number from cursor position
     */
    getCurrentLineNumber() {
        const cursor = this.editor.getCursor();
        return cursor.line;
    }
}

// Export for use in app.js
window.EditorEffects = EditorEffects;
