/**
 * Slot Colors - Shared color palette for all UI components
 * Ensures consistent colors across timeline, editor highlights, and UI elements
 */

const SLOT_COLORS = {
    1: '#FF6B6B',  // Red
    2: '#4ECDC4',  // Teal/Cyan
    3: '#45B7D1',  // Blue
    4: '#FFA07A',  // Light Salmon
    5: '#98D8C8',  // Mint
    6: '#F7DC6F',  // Yellow
    7: '#BB8FCE',  // Purple
    8: '#85C1E2',  // Light Blue
    9: '#F8B88B'   // Peach
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
