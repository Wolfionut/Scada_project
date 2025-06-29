// index.js - CORRECTED VERSION with proper WebSocket initialization
require('dotenv').config();
const express = require('express');
const http = require('http');

console.log('✅ Step 1: Basic imports successful');

const app = express();
console.log('✅ Step 2: Express app created');

// Basic middleware first
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('✅ Step 3: Basic middleware added');

// Add CORS manually
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});
console.log('✅ Step 4: CORS middleware added');

// Enhanced logging middleware for tag operations
app.use((req, res, next) => {
    if (req.path.includes('/tags')) {
        console.log('🏷️ TAG REQUEST:', {
            method: req.method,
            path: req.path,
            params: req.params,
            query: req.query,
            body: req.method !== 'GET' ? req.body : undefined,
            timestamp: new Date().toISOString()
        });
    }
    next();
});

// Test routes
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/tags/health', (req, res) => {
    res.json({
        status: 'Tags API healthy',
        timestamp: new Date().toISOString(),
        features: [
            'Basic CRUD operations',
            'Simulation patterns',
            'Engineering units scaling',
            'Tag grouping',
            'Deadband filtering',
            'Read-only protection'
        ],
        endpoints: {
            'GET /api/tags/device/:deviceId': 'List device tags',
            'POST /api/tags/device/:deviceId': 'Create new tag',
            'PUT /api/tags/device/:deviceId/:tagId': 'Update tag',
            'DELETE /api/tags/device/:deviceId/:tagId': 'Delete tag'
        }
    });
});

console.log('✅ Step 5: Test routes added');

// 🚀 CRITICAL FIX: Create HTTP server FIRST (before WebSocket)
const server = http.createServer(app);
console.log('✅ Step 6: HTTP server created');

// 🚀 FIXED: Now initialize services with proper server reference
let wsManager = null;
let dataEngine = null;
let setDataCollectionEngine = null;

// Initialize WebSocket manager WITH the server
try {
    console.log('Loading WebSocket manager...');
    const WebSocketManager = require('./websocket/websocketManager');
    wsManager = new WebSocketManager(server); // 🚀 FIXED: Pass server to constructor
    global.wsManager = wsManager;
    console.log('✅ WebSocket manager loaded successfully');
} catch (error) {
    console.error('❌ WebSocket manager failed to load:', error.message);
    console.log('⚠️ Continuing without WebSocket support...');
}

// Initialize Data Collection Engine
try {
    console.log('Loading Data Collection Engine...');
    const DataCollectionEngine = require('./services/DataCollectionEngine');
    dataEngine = new DataCollectionEngine();
    global.dataEngine = dataEngine;
    console.log('✅ Data Collection Engine loaded');
} catch (error) {
    console.error('❌ Data Collection Engine failed to load:', error.message);
}

console.log('🔍 Loading routes one by one...');

// Auth routes
try {
    console.log('Loading auth routes...');
    const authRoutes = require('./routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded successfully');
} catch (error) {
    console.error('❌ Error in auth routes:', error.message);
    process.exit(1);
}

// Projects routes
try {
    console.log('Loading projects routes...');
    const projectRoutes = require('./routes/projects');
    app.use('/api/projects', projectRoutes);
    console.log('✅ Projects routes loaded successfully');
} catch (error) {
    console.error('❌ Error in projects routes:', error.message);
    process.exit(1);
}

// Devices routes with engine connection
try {
    console.log('Loading devices routes...');
    const { router: deviceRoutes, setDataCollectionEngine: setEngineFunc } = require('./routes/devices');
    setDataCollectionEngine = setEngineFunc;

    app.use('/api/devices', deviceRoutes);
    console.log('✅ Devices routes loaded successfully');

    // Connect the engine to device routes
    if (dataEngine && setDataCollectionEngine) {
        console.log('🔗 Connecting DataCollectionEngine to device routes...');
        setDataCollectionEngine(dataEngine);
        console.log('📊 DataCollectionEngine reference set in device routes');
        console.log('✅ DataCollectionEngine connected to device routes');
    } else {
        console.warn('⚠️ DataCollectionEngine or setDataCollectionEngine function not available');
    }
} catch (error) {
    console.error('❌ Error in devices routes:', error.message);
    console.error('Full error:', error);
    process.exit(1);
}

// Tags routes with enhanced logging
try {
    console.log('Loading tags routes...');
    console.log('🏷️ TagController: Loading independent tags controller...');
    const tagRoutes = require('./routes/tags');
    console.log('✅ TagController: Independent approach loaded successfully');

    console.log('🏷️ Loading independent tags routes...');
    app.use('/api/tags', (req, res, next) => {
        console.log(`🏷️ Tags route: ${req.method} ${req.path}`);
        if (req.body && Object.keys(req.body).length > 0) {
            console.log('🏷️ Request body:', JSON.stringify(req.body, null, 2));
        }
        next();
    }, tagRoutes);

    console.log('✅ Independent tags routes loaded successfully');
    console.log('✅ Tags routes loaded successfully');
} catch (error) {
    console.error('❌ Error in tags routes:', error.message);
    console.error('Full error:', error);
    process.exit(1);
}

// Measurements routes
try {
    console.log('Loading measurements routes...');
    console.log('📊 MeasurementController: Loading enhanced SCADA version...');
    const measurementRoutes = require('./routes/measurements');
    console.log('✅ MeasurementController: Enhanced SCADA version loaded successfully');
    console.log('📊 Measurements Routes: Loading enhanced SCADA router...');
    app.use('/api/measurements', measurementRoutes);
    console.log('✅ Measurements Routes: Enhanced SCADA router loaded successfully');
    console.log('✅ Measurements routes loaded successfully');
} catch (error) {
    console.error('❌ Error in measurements routes:', error.message);
    process.exit(1);
}

// Alarms routes
try {
    console.log('Loading alarms routes...');
    console.log('🚨 AlarmController: Loading FUXA/Ignition style alarm system...');
    const alarmRoutes = require('./routes/alarms');
    console.log('✅ AlarmController: FUXA/Ignition style system loaded successfully');
    console.log('🚨 Loading FUXA/Ignition style alarm routes...');
    app.use('/api/alarms', alarmRoutes);
    console.log('✅ FUXA/Ignition style alarm routes loaded successfully');
    console.log('✅ Alarms routes loaded successfully');
} catch (error) {
    console.error('❌ Error in alarms routes:', error.message);
    process.exit(1);
}

// Logs routes
try {
    console.log('Loading logs routes...');
    const logRoutes = require('./routes/logs');
    app.use('/api/logs', logRoutes);
    console.log('✅ Logs routes loaded successfully');
} catch (error) {
    console.error('❌ Error in logs routes:', error.message);
    process.exit(1);
}

// Diagrams routes
try {
    console.log('Loading diagrams routes...');
    const diagramRoutes = require('./routes/diagrams');
    app.use('/api/diagrams', diagramRoutes);
    console.log('✅ Diagrams routes loaded successfully');
} catch (error) {
    console.error('❌ Error in diagrams routes:', error.message);
    process.exit(1);
}

// Roles routes
try {
    console.log('Loading roles routes...');
    const roleRoutes = require('./routes/roles');
    app.use('/api/roles', roleRoutes);
    console.log('✅ Roles routes loaded successfully');
} catch (error) {
    console.error('❌ Error in roles routes:', error.message);
    process.exit(1);
}

// Engine routes
try {
    console.log('Loading engine routes...');
    console.log('🏭 Engine routes: Loading...');
    const engineRoutes = require('./routes/engine');
    app.use('/api/engine', engineRoutes);
    console.log('✅ Engine routes loaded');
    console.log('✅ Engine routes loaded successfully');
} catch (error) {
    console.error('❌ Error in engine routes:', error.message);
    console.log('⚠️ Engine control will not be available via API');
}

console.log('✅ Step 6: All routes loaded successfully');

// Enhanced health endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            websocket: wsManager ? 'available' : 'unavailable',
            data_engine: dataEngine ? (dataEngine.isRunning ? 'running' : 'stopped') : 'unavailable',
            engine_connected_to_routes: setDataCollectionEngine ? 'yes' : 'no'
        },
        websocket: wsManager ? {
            connected_clients: wsManager.clients ? wsManager.clients.size : 0,
            project_subscriptions: wsManager.projectSubscriptions ? wsManager.projectSubscriptions.size : 0
        } : null,
        data_collection: dataEngine ? dataEngine.getStatistics() : null,
        endpoints: {
            devices: '/api/devices/project/:projectId',
            device_start: '/api/devices/project/:projectId/:deviceId/start',
            device_stop: '/api/devices/project/:projectId/:deviceId/stop',
            tags: '/api/tags/device/:deviceId',
            measurements: '/api/measurements',
            engine_status: '/api/engine/status'
        }
    });
});

// Debug endpoints
app.get('/api/debug/tag-routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach((layer) => {
        if (layer.regexp.toString().includes('tags')) {
            routes.push({
                path: layer.regexp.toString(),
                methods: layer.route ? Object.keys(layer.route.methods) : 'middleware'
            });
        }
    });

    res.json({
        message: 'Tag routes debug information',
        timestamp: new Date().toISOString(),
        tagRoutesFound: routes.length > 0,
        routes: routes,
        testEndpoints: [
            'GET /api/tags/health',
            'GET /api/tags/device/1 (replace 1 with your device ID)',
            'POST /api/tags/device/1 (with JSON body)'
        ]
    });
});

app.get('/api/debug/device-control', (req, res) => {
    res.json({
        message: 'Device control debug information',
        timestamp: new Date().toISOString(),
        engine_available: !!dataEngine,
        engine_running: dataEngine ? dataEngine.isRunning : false,
        engine_connected_to_routes: !!setDataCollectionEngine,
        websocket_available: !!wsManager,
        websocket_healthy: wsManager ? wsManager.isHealthy() : null,
        test_endpoints: [
            'POST /api/devices/project/1/123/start (replace with your project/device IDs)',
            'POST /api/devices/project/1/123/stop',
            'GET /api/devices/project/1/123/status',
            'GET /api/health (overall system health)'
        ],
        engine_statistics: dataEngine ? dataEngine.getStatistics() : null
    });
});

console.log('✅ Step 7: HTTP server created');
console.log('✅ Step 8: WebSocket setup complete');
console.log('✅ Step 9: Data Collection Engine setup complete');

const PORT = process.env.PORT || 4000;

// Start server (only ONE server.listen call)
server.listen(PORT, async () => {
    console.log('================================================================================');
    console.log('🏭 SCADA SYSTEM SERVER RUNNING');
    console.log('================================================================================');
    console.log(`📡 HTTP Server: http://localhost:${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}`);
    console.log(`🏷️ Tags API: http://localhost:${PORT}/api/tags/health`);
    console.log(`🔧 System Health: http://localhost:${PORT}/api/health`);
    console.log(`🐛 Device Debug: http://localhost:${PORT}/api/debug/device-control`);
    console.log(`🐛 Tag Debug: http://localhost:${PORT}/api/debug/tag-routes`);
    console.log('================================================================================');

    // Show service status
    console.log('📊 Service Status:');
    console.log(`   🌐 WebSocket Manager: ${wsManager ? '✅ Available' : '❌ Not Available'}`);
    console.log(`   🏭 Data Collection Engine: ${dataEngine ? '✅ Available' : '❌ Not Available'}`);
    console.log(`   🔗 Engine-Routes Connection: ${setDataCollectionEngine ? '✅ Connected' : '❌ Not Connected'}`);
    console.log('================================================================================');

    // Auto-start Data Collection Engine
    if (dataEngine) {
        console.log('\n🔄 Auto-starting SCADA Data Collection Engine...');
        setTimeout(async () => {
            try {
                console.log('🚀 Starting SCADA Data Collection Engine...');
                await dataEngine.scanAndStartCollectors();
                console.log('✅ 🏭 Data Collection Engine started successfully!');
                const stats = dataEngine.getStatistics();
                console.log(`📊 Monitoring ${stats.running_devices || 0} devices with ${stats.total_tags || 0} tags`);
                console.log(`🎯 Engine Control: http://localhost:${PORT}/api/engine/status`);
                console.log('========================================');
                console.log('🎯 READY FOR DEVICE CONTROL!');
                console.log('   - Frontend can now start/stop devices');
                console.log('   - Real data collection is active');
                console.log('   - WebSocket broadcasts are working');
                console.log('========================================');
            } catch (error) {
                console.error('❌ Error starting Data Collection Engine:', error.message);
            }
        }, 2000);
    }

    // Verify system readiness
    setTimeout(() => {
        console.log('\n🔍 Verifying system readiness...');
        try {
            const tagRoutesExist = app._router.stack.some(layer =>
                layer.regexp.toString().includes('tags')
            );
            console.log(`✅ Tag routes registered: ${tagRoutesExist ? 'YES' : 'NO'}`);

            if (tagRoutesExist) {
                console.log('🎯 System Ready! Available operations:');
                console.log(`   📋 List tags: GET http://localhost:${PORT}/api/tags/device/1`);
                console.log(`   ➕ Create tag: POST http://localhost:${PORT}/api/tags/device/1`);
                console.log(`   🚀 Start device: POST http://localhost:${PORT}/api/devices/project/1/123/start`);
                console.log(`   🛑 Stop device: POST http://localhost:${PORT}/api/devices/project/1/123/stop`);
                console.log(`   🏭 Engine status: GET http://localhost:${PORT}/api/health`);
            }
        } catch (error) {
            console.log('⚠️ Could not verify system readiness:', error.message);
        }
    }, 1000);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down SCADA server...');

    if (dataEngine && dataEngine.isRunning) {
        console.log('🏭 Stopping Data Collection Engine...');
        try {
            await dataEngine.stop();
            console.log('✅ Data Collection Engine stopped');
        } catch (error) {
            console.error('❌ Error stopping Data Collection Engine:', error.message);
        }
    }

    if (wsManager) {
        console.log('🌐 Shutting down WebSocket manager...');
        try {
            await wsManager.shutdown();
            console.log('✅ WebSocket manager stopped');
        } catch (error) {
            console.error('❌ Error stopping WebSocket manager:', error.message);
        }
    }

    server.close(() => {
        console.log('✅ Server shutdown complete');
        process.exit(0);
    });

    setTimeout(() => {
        console.log('⚠️ Force exit after timeout');
        process.exit(1);
    }, 10000);
});

process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    process.emit('SIGINT');
});

module.exports = { server, dataEngine, wsManager };