/**
 * Slot Colors - Shared color palette for all UI components
 * Ensures consistent colors across timeline, editor highlights, and UI elements
 */

const SLOT_COLORS = {
    1: '#E57373', // Lighter Red
    2: '#64B5F6', // Lighter Blue
    3: '#4DB6AC', // Teal
    4: '#FFB74D', // Lighter Orange
    5: '#CDDC39', // Lime Green
    6: '#FFF176', // Lighter Yellow
    7: '#BA68C8', // Lighter Purple
    8: '#4DD0E1', // Cyan
    9: '#F06292'  // Lighter Pink
};

/**
 * Get color for a slot number
 * @param {number} slotNumber - Slot number (1-9 or higher)
 * @returns {string} Hex color code
 */
function getSlotColor(slotNumber) {
    if (!slotNumber) return SLOT_COLORS[1];
    const colorKey = ((slotNumber - 1) % 9) + 1;
    return SLOT_COLORS[colorKey];
}

/**
 * Get all slot colors as array
 * @returns {array} Array of hex color codes
 */
function getSlotColorsArray() {
    return [
        SLOT_COLORS[1], SLOT_COLORS[2], SLOT_COLORS[3],
        SLOT_COLORS[4], SLOT_COLORS[5], SLOT_COLORS[6],
        SLOT_COLORS[7], SLOT_COLORS[8], SLOT_COLORS[9]
    ];
}

// Export for use in modules
if (typeof window !== 'undefined') {
    window.SLOT_COLORS = SLOT_COLORS;
    window.getSlotColor = getSlotColor;
    window.getSlotColorsArray = getSlotColorsArray;
}
