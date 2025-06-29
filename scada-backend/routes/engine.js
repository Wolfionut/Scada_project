const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

console.log('🏭 Engine routes: Loading...');

// All routes protected by authentication
router.use(authenticateToken);

// 📊 GET ENGINE STATUS
router.get('/status', (req, res) => {
    console.log('🏭 Engine status requested by user:', req.user?.username);

    if (!global.dataEngine) {
        return res.status(503).json({
            error: 'Data collection engine not initialized',
            available: false,
            timestamp: new Date().toISOString()
        });
    }

    try {
        const statistics = global.dataEngine.getStatistics();
        const devices = global.dataEngine.getDeviceStatus();

        res.json({
            engine: statistics,
            devices: devices,
            available: true,
            version: '1.0.0',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error getting engine status:', error);
        res.status(500).json({
            error: 'Failed to get engine status',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ▶️ START ENGINE
router.post('/start', async (req, res) => {
    console.log('🏭 Engine start requested by user:', req.user?.username);

    if (!global.dataEngine) {
        return res.status(503).json({ error: 'Data collection engine not initialized' });
    }

    try {
        const result = await global.dataEngine.start();

        console.log(`🏭 Engine start result: ${result.success ? 'SUCCESS' : 'FAILED'}`);

        res.json({
            ...result,
            user: req.user?.username,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error starting engine:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ⏹️ STOP ENGINE
router.post('/stop', async (req, res) => {
    console.log('🏭 Engine stop requested by user:', req.user?.username);

    if (!global.dataEngine) {
        return res.status(503).json({ error: 'Data collection engine not initialized' });
    }

    try {
        const result = await global.dataEngine.stop();

        console.log(`🏭 Engine stop result: ${result.success ? 'SUCCESS' : 'FAILED'}`);

        res.json({
            ...result,
            user: req.user?.username,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error stopping engine:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 🔄 RESTART ENGINE
router.post('/restart', async (req, res) => {
    console.log('🏭 Engine restart requested by user:', req.user?.username);

    if (!global.dataEngine) {
        return res.status(503).json({ error: 'Data collection engine not initialized' });
    }

    try {
        console.log('🔄 Stopping engine...');
        await global.dataEngine.stop();

        console.log('⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('▶️ Starting engine...');
        const result = await global.dataEngine.start();

        console.log(`🏭 Engine restart result: ${result.success ? 'SUCCESS' : 'FAILED'}`);

        res.json({
            ...result,
            action: 'restart',
            user: req.user?.username,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error restarting engine:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            action: 'restart',
            timestamp: new Date().toISOString()
        });
    }
});

// 🔍 FORCE DEVICE SCAN
router.post('/scan', async (req, res) => {
    console.log('🏭 Device scan requested by user:', req.user?.username);

    if (!global.dataEngine) {
        return res.status(503).json({ error: 'Data collection engine not initialized' });
    }

    if (!global.dataEngine.isRunning) {
        return res.status(400).json({
            error: 'Engine must be running to perform scan',
            current_status: 'stopped'
        });
    }

    try {
        console.log('🔍 Forcing device rescan...');
        await global.dataEngine.scanAndStartCollectors();

        const statistics = global.dataEngine.getStatistics();

        res.json({
            success: true,
            message: 'Device scan completed successfully',
            statistics: statistics,
            user: req.user?.username,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error during device scan:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 📈 GET DETAILED STATISTICS
router.get('/statistics', (req, res) => {
    if (!global.dataEngine) {
        return res.status(503).json({ error: 'Data collection engine not initialized' });
    }

    try {
        const statistics = global.dataEngine.getStatistics();
        const devices = global.dataEngine.getDeviceStatus();

        res.json({
            summary: statistics,
            devices: devices,
            system: {
                node_version: process.version,
                uptime: process.uptime(),
                memory_usage: process.memoryUsage(),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Error getting statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

console.log('✅ Engine routes loaded');

module.exports = router;