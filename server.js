/**
 * AlgoSignalSound - Server
 * Handles code persistence and preset management
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
let PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname)); // Serve static files

// Ensure required directories exist
const ensureDirectories = () => {
    const dirs = ['presets', 'user_data'];
    dirs.forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`✓ Created directory: ${dir}`);
        }
    });
};

// Initialize directories on startup
ensureDirectories();

/**
 * POST /api/save-code
 * Auto-save user code to user_code.txt
 */
app.post('/api/save-code', (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, error: 'No code provided' });
        }

        const filePath = path.join(__dirname, 'user_data', 'user_code.txt');
        fs.writeFileSync(filePath, code, 'utf-8');

        console.log(`✓ Code saved: ${code.length} characters to user_data/user_code.txt`);
        res.json({ success: true, message: 'Code saved', size: code.length });
    } catch (error) {
        console.error('❌ Save error:', error);
        res.status(500).json({ success: false, error: 'Failed to save code', details: error.message });
    }
});

/**
 * GET /api/load-code
 * Load user code from user_code.txt
 */
app.get('/api/load-code', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'user_data', 'user_code.txt');

        if (!fs.existsSync(filePath)) {
            console.log('No saved code file found, returning null');
            return res.json({ code: null, success: true, message: 'No saved code found' });
        }

        const code = fs.readFileSync(filePath, 'utf-8');
        console.log(`✓ Loaded code: ${code.length} characters`);
        res.json({ code, success: true, size: code.length });
    } catch (error) {
        console.error('❌ Load error:', error);
        res.status(500).json({ success: false, error: 'Failed to load code', details: error.message });
    }
});

/**
 * GET /api/presets
 * List all available presets
 */
app.get('/api/presets', (req, res) => {
    try {
        const presetsDir = path.join(__dirname, 'presets');

        if (!fs.existsSync(presetsDir)) {
            return res.json({ presets: [] });
        }

        const files = fs.readdirSync(presetsDir);
        const presets = files
            .filter(file => file.endsWith('.txt'))
            .map(file => ({
                name: file.replace('.txt', ''),
                file: file
            }));

        res.json({ presets, success: true });
    } catch (error) {
        console.error('Presets list error:', error);
        res.status(500).json({ error: 'Failed to list presets', details: error.message });
    }
});

/**
 * GET /api/preset/:name
 * Load a specific preset by name
 */
app.get('/api/preset/:name', (req, res) => {
    try {
        const { name } = req.params;
        // Sanitize filename (prevent directory traversal)
        const safeName = name.replace(/[^a-z0-9_-]/gi, '');
        const filePath = path.join(__dirname, 'presets', `${safeName}.txt`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: `Preset "${name}" not found` });
        }

        const code = fs.readFileSync(filePath, 'utf-8');
        res.json({ code, name: safeName, success: true });
    } catch (error) {
        console.error('Load preset error:', error);
        res.status(500).json({ error: 'Failed to load preset', details: error.message });
    }
});

/**
 * POST /api/preset/:name
 * Save code to a preset file
 * IMPORTANT: This overwrites the preset file with user's code
 */
app.post('/api/preset/:name', (req, res) => {
    try {
        const { name } = req.params;
        const { code } = req.body;

        console.log(`[POST /api/preset/${name}] Attempting to save...`);

        if (!code) {
            console.warn(`[POST /api/preset/${name}] No code provided`);
            return res.status(400).json({ success: false, error: 'No code provided' });
        }

        // Sanitize filename (prevent directory traversal)
        const safeName = name.replace(/[^a-z0-9_-]/gi, '');
        const filePath = path.join(__dirname, 'presets', `${safeName}.txt`);

        // Write code to preset file
        fs.writeFileSync(filePath, code, 'utf-8');

        console.log(`✓ Preset saved: ${code.length} characters to presets/${safeName}.txt`);
        res.json({ success: true, message: `Preset "${safeName}" saved`, name: safeName, size: code.length });
    } catch (error) {
        console.error('❌ Save preset error:', error);
        res.status(500).json({ success: false, error: 'Failed to save preset', details: error.message });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'AlgoSignalSound server running' });
});

// Start server with port finding logic
const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log('\n========================================');
    console.log('  ▶ AlgoSignalSound SERVER');
        console.log('========================================');
        console.log(`✓ Server running on http://localhost:${port}`);
        console.log('✓ Press Ctrl+C to stop');
        console.log('========================================\n');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠ Port ${port} is already in use, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            throw err;
        }
    });
};

startServer(PORT);
