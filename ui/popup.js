/**
 * ALGORAVE - Psychedelic Popup Manager
 * Handles dragging, resizing, and canvas management for fullscreen visuals
 */

class PsychedelicPopupManager {
    constructor() {
        this.popup = document.getElementById('psychedelicPopup');
        this.openBtn = document.getElementById('psychedelicPopupBtn');
        this.closeBtn = document.getElementById('psychedelicCloseBtn');
        this.canvasPopup = document.getElementById('psychedelicCanvasPopup');
        
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        this.isResizing = false;
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.resizeStartWidth = 0;
        this.resizeStartHeight = 0;
        
        if (this.popup && this.openBtn && this.closeBtn) {
            this.setupEventListeners();
            console.log('✓ Psychedelic Popup Manager initialized');
        } else {
            console.warn('❌ Popup elements not found');
        }
    }

    setupEventListeners() {
        // Open button
        this.openBtn.addEventListener('click', () => this.open());
        
        // Close button
        this.closeBtn.addEventListener('click', () => this.close());
        
        // Dragging
        const header = this.popup.querySelector('.psychedelic-popup-header');
        if (header) {
            header.addEventListener('mousedown', (e) => this.startDrag(e));
        }
        
        // Resizing (bottom-right corner)
        this.popup.addEventListener('mousedown', (e) => {
            if (this.isResizeHandle(e)) {
                this.startResize(e);
            }
        });
        
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', () => this.stopDragResize());
    }

    isResizeHandle(e) {
        const rect = this.popup.getBoundingClientRect();
        const threshold = 10; // pixels
        return (
            e.clientX > rect.right - threshold &&
            e.clientY > rect.bottom - threshold
        );
    }

    startDrag(e) {
        // Only drag from header
        if (e.target.closest('button')) return;
        
        this.isDragging = true;
        const rect = this.popup.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;
        this.popup.classList.add('dragging');
    }

    startResize(e) {
        this.isResizing = true;
        this.resizeStartX = e.clientX;
        this.resizeStartY = e.clientY;
        this.resizeStartWidth = this.popup.offsetWidth;
        this.resizeStartHeight = this.popup.offsetHeight;
        this.popup.style.cursor = 'nwse-resize';
    }

    stopDragResize() {
        this.isDragging = false;
        this.isResizing = false;
        this.popup.classList.remove('dragging');
        this.popup.style.cursor = 'grab';
    }

    onMouseMove(e) {
        if (this.isDragging) {
            // Calculate new position
            const newLeft = e.clientX - this.dragOffsetX;
            const newTop = e.clientY - this.dragOffsetY;
            
            // Remove transform when dragging, use direct positioning
            this.popup.style.transform = 'none';
            this.popup.style.left = newLeft + 'px';
            this.popup.style.top = newTop + 'px';
        }
        
        if (this.isResizing) {
            const deltaX = e.clientX - this.resizeStartX;
            const deltaY = e.clientY - this.resizeStartY;
            
            const newWidth = Math.max(500, this.resizeStartWidth + deltaX);
            const newHeight = Math.max(400, this.resizeStartHeight + deltaY);
            
            this.popup.style.width = newWidth + 'px';
            this.popup.style.height = newHeight + 'px';
            
            // Resize canvas to match
            this.canvasPopup.width = newWidth;
            this.canvasPopup.height = newHeight - 40; // Account for header
        }
    }

    open() {
        this.popup.style.display = 'flex';
        // Reset to centered position
        this.popup.style.transform = 'translate(-50%, -50%)';
        this.popup.style.top = '50%';
        this.popup.style.left = '50%';
        console.log('✓ Psychedelic popup opened');
        
        // Switch to popup canvas
        if (window.psychedelicVisuals) {
            window.psychedelicVisuals.switchToCanvas(this.canvasPopup);
        }
    }

    close() {
        this.popup.style.display = 'none';
        console.log('⏹ Psychedelic popup closed');
        
        // Switch back to original canvas
        if (window.psychedelicVisuals) {
            window.psychedelicVisuals.switchToCanvas(
                document.getElementById('psychedelicCanvas')
            );
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.psychedelicPopupManager = new PsychedelicPopupManager();
    });
} else {
    window.psychedelicPopupManager = new PsychedelicPopupManager();
}
