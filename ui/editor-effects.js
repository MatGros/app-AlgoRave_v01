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
        
        // Cache for line elements to improve performance
        this.lineElementCache = new Map();

        // Use shared slot colors from slot-colors.js
        this.slotColors = window.SLOT_COLORS || {
            1: '#FF6B6B',  // Red
            2: '#4ECDC4',  // Teal
            3: '#4A90E2',  // Bright Blue
            4: '#F5A623',  // Orange
            5: '#50E3C2',  // Aqua Green
            6: '#F7DC6F',  // Yellow
            7: '#BB8FCE',  // Purple
            8: '#85C1E2',  // Light Blue
            9: '#F8B88B'   // Peach
        };

        this.editor.on('change', this.handleEditorChange.bind(this));
        this.editor.on('renderLine', this.handleRenderLine.bind(this));
    }

    /**
     * Start the visual effects
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // Initialize analysers for active slots
        if (window.scheduler && window.scheduler.patterns) {
            for (const [slotId] of window.scheduler.patterns) {
                this.createSlotAnalyser(slotId);
            }
        }

        this.animate();
    }

    /**
     * Create analyser for a slot (setup audio monitoring)
     */
    createSlotAnalyser(slotId) {
        if (!window.slotAnalyser) return;

        try {
            // Create analyser for this slot
            const analyser = window.slotAnalyser.createAnalyserForSlot(slotId);
            if (!analyser) return;

            // TODO: Connect analyser to the slot's gain node
            // For now, the global analyser in visualizer captures all output
            // and we estimate slot volume based on patterns
        } catch (e) {
            console.warn(`Could not setup analyser for ${slotId}:`, e);
        }
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

        // Update slot volumes for dynamic highlighting
        if (window.slotAnalyser) {
            window.slotAnalyser.updateAll();
        }

        // DISABLED: Audio-reactive background to debug highlighting issues
        // if (this.audioReactive && this.visualizer && this.visualizer.analyser) {
        //     this.updateAudioReactiveBackground();
        // }

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
     * Uses CodeMirror's lineInfo and DOM traversal for maximum reliability
     */
    findLineBackgroundElement(lineNumber) {
        // Check cache first
        if (this.lineElementCache.has(lineNumber)) {
            return this.lineElementCache.get(lineNumber);
        }

        try {
            // Get line info from CodeMirror - this is more reliable
            const lineInfo = this.editor.lineInfo(lineNumber);
            if (!lineInfo || !lineInfo.handle) {
                return null;
            }

            // Method 1: Try to get the line element directly from CodeMirror's internals
            if (this.editor.display && this.editor.display.lines) {
                const lineView = this.editor.display.lineView(this.editor.getLineHandle(lineNumber));
                if (lineView && lineView.node) {
                    this.lineElementCache.set(lineNumber, lineView.node);
                    return lineView.node;
                }
            }

            // Method 2: Find the line by searching the pre-rendered lines
            const wrapper = this.editor.getWrapperElement();
            const lineElements = wrapper.querySelectorAll('.CodeMirror-line');

            // Get the expected position from CodeMirror
            const coords = this.editor.charCoords({ line: lineNumber, ch: 0 }, 'page');
            const wrapperRect = wrapper.getBoundingClientRect();

            // Find the line element that matches the vertical position
            for (let lineEl of lineElements) {
                const rect = lineEl.getBoundingClientRect();
                // Check if the element's top position matches our target line's top position
                if (Math.abs(rect.top - coords.top) < 2) {
                    this.lineElementCache.set(lineNumber, lineEl);
                    return lineEl;
                }
            }

            // Method 3: Last resort - iterate through pre elements
            const pres = wrapper.querySelectorAll('pre');
            for (let pre of pres) {
                const rect = pre.getBoundingClientRect();
                if (Math.abs(rect.top - coords.top) < 2) {
                    this.lineElementCache.set(lineNumber, pre);
                    return pre;
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
        try {
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
                lineElement.style.opacity = '';
            }

            // Also try to clean up all visible lines with this style (backup method)
            const wrapper = this.editor.getWrapperElement();
            const allLines = wrapper.querySelectorAll('.CodeMirror-line');
            for (let el of allLines) {
                if (el.style.borderLeft && el.style.borderLeft.includes('solid')) {
                    // Check if this element corresponds to our line by checking its position
                    const rect = el.getBoundingClientRect();
                    const expectedCoords = this.editor.charCoords({ line: lineNumber, ch: 0 }, 'local');
                    const wrapperRect = wrapper.getBoundingClientRect();
                    const expectedTop = wrapperRect.top + expectedCoords.top;

                    if (Math.abs(rect.top - expectedTop) < 2) {
                        el.style.backgroundColor = '';
                        el.style.borderLeft = '';
                        el.style.boxShadow = '';
                        el.style.position = '';
                        el.style.zIndex = '';
                        el.style.opacity = '';
                    }
                }
            }
        } catch (e) {
            // Silently fail if line doesn't exist anymore
        }
    }

    /**
     * Update active line highlights (persistent, no timeout)
     * The highlight stays until a new line is executed
     * Intensity varies with slot volume
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

                // Get slot volume (0-1) to vary intensity
                let volumeIntensity = 1;
                if (window.slotAnalyser && data.slotNumber) {
                    const slotId = `d${data.slotNumber}`;
                    const slotVolume = window.slotAnalyser.getVolume(slotId);
                    // Map volume to intensity: minimum 0.3 at silence, maximum 1 at peak
                    volumeIntensity = 0.5 + slotVolume * 0.5;
                }

                // Base opacity values
                const bgOpacity = 0.4 * volumeIntensity;
                const shadowOpacity = 0.5 * volumeIntensity;

                // Apply dynamic highlights based on volume
                lineElement.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`;
                lineElement.style.borderLeft = `3px solid rgba(${r}, ${g}, ${b}, ${volumeIntensity})`;
                lineElement.style.boxShadow = `inset 0 0 20px rgba(${r}, ${g}, ${b}, ${shadowOpacity}), 0 0 10px rgba(${r}, ${g}, ${b}, ${volumeIntensity * 0.3})`;
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

    handleEditorChange(instance, change) {
        this.lineElementCache.clear();

        const fromLine = change.from.line;
        const netLinesChanged = change.text.length - change.removed.length;

        if (netLinesChanged !== 0) {
            const newActiveLines = new Map();
            this.activeLines.forEach((data, lineNumber) => {
                if (lineNumber > fromLine) {
                    const newLi = lineNumber + netLinesChanged;
                    if(newLi > 0) newActiveLines.set(newLi, data);
                } else {
                    newActiveLines.set(lineNumber, data);
                }
            });
            this.activeLines = newActiveLines;

            const newSlotHighlights = new Map();
            this.slotHighlights.forEach((data, slotNumber) => {
                if (data.lineNumber > fromLine) {
                    const newLi = data.lineNumber + netLinesChanged;
                    if(newLi > 0) newSlotHighlights.set(slotNumber, { ...data, lineNumber: newLi });
                } else {
                    newSlotHighlights.set(slotNumber, data);
                }
            });
            this.slotHighlights = newSlotHighlights;
        }
    }

    handleRenderLine(instance, line, element) {
        const lineNumber = this.editor.getLineNumber(line);
        if (this.activeLines.has(lineNumber)) {
            const data = this.activeLines.get(lineNumber);
            this.highlightLine(lineNumber, data.color);
        }
    }
}

// Export for use in app.js
window.EditorEffects = EditorEffects;