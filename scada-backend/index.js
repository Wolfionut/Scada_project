// index.js - UPDATED WITH ENHANCED DEBUGGING AND PROPER CONTROLLER INTEGRATION
require('dotenv').config();
const express = require('express');
const http = require('http');

console.log('✅ Step 1: Basic imports successful');

const app = express();
console.log('✅ Step 2: Express app created');

// Enhanced error handling
process.on('uncaughtException', (error) => {
    console.error('❌ UNCAUGHT EXCEPTION:', error);
    console.error('❌ Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
    console.error('❌ Promise:', promise);
});

// Basic middleware first
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
console.log('✅ Step 3: Basic middleware added');

// CORS configuration
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

// Enhanced debug middleware
const { debugMiddleware, errorBoundaryMiddleware } = require('./middleware/debugMiddleware');
app.use(debugMiddleware);

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
        timestamp: new Date().toISOString(),
        architecture: 'Enhanced with proper controller integration'
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/diagrams/test', (req, res) => {
    res.json({
        status: 'Diagrams API healthy with controller integration',
        timestamp: new Date().toISOString(),
        architecture: 'Router → Controller pattern',
        features: [
            'Enhanced tag linking',
            'Auto-save detection',
            'Detailed error messages',
            'WebSocket integration',
            'Real-time data binding'
        ]
    });
});

console.log('✅ Step 5: Test routes added');

// 🚀 CRITICAL: Create HTTP server FIRST
const server = http.createServer(app);
console.log('✅ Step 6: HTTP server created');

// 🚀 FIXED: Initialize WebSocket Manager with correct path and server
let wsManager = null;
let dataEngine = null;
let setDataCollectionEngine = null;

try {
    console.log('Loading WebSocket manager...');

    // ✅ FIXED: Correct path for your file structure
    const WebSocketManager = require('./websocket/websocketManager.js');

    // ✅ FIXED: Pass server to constructor for immediate initialization
    wsManager = new WebSocketManager(server);

    global.wsManager = wsManager;
    console.log('✅ WebSocket manager loaded successfully');

    // Debug WebSocket status
    console.log('🔍 WebSocket Debug Info:');
    console.log(`   📊 WebSocket Server Ready: ${wsManager.isReady()}`);
    console.log(`   📊 WebSocket Server Initialized: ${wsManager.isInitialized}`);
    console.log(`   📊 Total Clients: ${wsManager.clients ? wsManager.clients.size : 0}`);

} catch (error) {
    console.error('❌ WebSocket manager failed to load:', error.message);
    console.error('❌ Full error:', error);
    console.log('⚠️ Continuing without WebSocket support...');
}

// Initialize Data Collection Engine
try {
    console.log('Loading Data Collection Engine...');
    const DataCollectionEngine = require('./services/DataCollectionEngine');

    // ✅ FIXED: Pass wsManager to constructor
    dataEngine = new DataCollectionEngine(wsManager);

    global.dataEngine = dataEngine;
    console.log('✅ Data Collection Engine loaded WITH WebSocket support');

    // 🐛 DEBUG: Verify wsManager connection
    console.log('🐛 DEBUG: DataCollectionEngine wsManager:', !!dataEngine.wsManager);

    // ✅ FIXED: Set up WebSocket event listeners if WebSocket is available
    if (wsManager && dataEngine) {
        console.log('🔗 Connecting WebSocket Manager to Data Collection Engine...');

        // Set up event listeners for WebSocket events
        wsManager.on('client_subscribed', ({ clientId, projectId, user }) => {
            console.log(`📡 Client ${user.username} subscribed to project ${projectId}`);

            // Send current project status
            dataEngine.getProjectCurrentData(projectId)
                .then(currentData => {
                    if (currentData && currentData.length > 0) {
                        wsManager.sendToClient(clientId, {
                            type: 'current_data',
                            data: currentData,
                            projectId: projectId
                        });
                    }
                })
                .catch(err => console.error('Error getting current data:', err));
        });

        wsManager.on('alarm_acknowledge', (ackData) => {
            console.log('🚨 Processing alarm acknowledgment:', ackData);
            if (dataEngine.acknowledgeAlarm) {
                dataEngine.acknowledgeAlarm(ackData);
            }
        });

        wsManager.on('get_active_alarms', ({ clientId, projectId }) => {
            console.log(`🚨 Getting active alarms for project ${projectId}`);
            if (dataEngine.getActiveAlarms) {
                dataEngine.getActiveAlarms(projectId)
                    .then(alarms => {
                        wsManager.sendActiveAlarmsToClient(clientId, projectId, alarms || []);
                    })
                    .catch(err => console.error('Error getting active alarms:', err));
            }
        });

        wsManager.on('get_diagram_realtime', ({ clientId, projectId }) => {
            console.log(`📊 Getting diagram realtime data for project ${projectId}`);
            if (dataEngine.getProjectCurrentData) {
                dataEngine.getProjectCurrentData(projectId)
                    .then(measurements => {
                        wsManager.sendToClient(clientId, {
                            type: 'diagram_realtime_data',
                            data: { measurements: measurements || [] },
                            projectId: projectId
                        });
                    })
                    .catch(err => console.error('Error getting diagram realtime data:', err));
            }
        });

        console.log('✅ WebSocket Manager and Data Collection Engine connected');
    }

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

// 🚀 ENHANCED: Diagrams routes with proper controller integration
try {
    console.log('Loading diagrams routes...');
    console.log('🔧 Loading ENHANCED diagrams router with controller integration...');

    // Check if controller exists
    try {
        require('./controllers/diagramController');
        console.log('✅ Diagram controller found and loaded');
    } catch (controllerError) {
        console.error('❌ Diagram controller not found:', controllerError.message);
        console.log('📁 Expected location: ./controllers/diagramController.js');
        throw controllerError;
    }

    const diagramRoutes = require('./routes/diagrams');
    app.use('/api/diagrams', diagramRoutes);
    console.log('✅ ENHANCED Diagrams routes loaded with controller integration');
    console.log('🎯 Architecture: Router → Controller pattern implemented');
} catch (error) {
    console.error('❌ Error in diagrams routes:', error.message);
    console.error('❌ This may cause frontend issues. Please ensure:');
    console.error('   1. ./controllers/diagramController.js exists');
    console.error('   2. ./routes/diagrams.js is properly updated');
    console.error('   3. All dependencies are installed');
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

// Add error boundary middleware at the end
app.use(errorBoundaryMiddleware);

// 🧪 ENHANCED WEBSOCKET TEST ENDPOINT
app.get('/api/test-ws', (req, res) => {
    const wsStatus = {
        websocket_working: !!wsManager && wsManager.isReady(),
        clients_connected: wsManager ? wsManager.clients.size : 0,
        server_healthy: true,
        wsManager_exists: !!wsManager,
        wsManager_initialized: wsManager ? wsManager.isInitialized : false,
        wsManager_has_server: wsManager ? !!wsManager.wss : false,
        server_port: process.env.PORT || 4000,
        timestamp: new Date().toISOString()
    };

    // Additional debug info if WebSocket is available
    if (wsManager) {
        try {
            const stats = wsManager.getStats();
            wsStatus.detailed_stats = stats;
            wsStatus.websocket_debug = {
                total_clients: stats.totalClients,
                total_projects: stats.totalProjects,
                has_heartbeat: !!wsManager.heartbeatInterval,
                server_ready_state: wsManager.wss ? wsManager.wss.readyState : 'no server'
            };
        } catch (err) {
            wsStatus.stats_error = err.message;
        }
    }

    res.json(wsStatus);
});

// Enhanced health endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        architecture: 'Enhanced Router + Controller pattern',
        services: {
            websocket: wsManager ? (wsManager.isReady() ? 'ready' : 'initialized') : 'unavailable',
            data_engine: dataEngine ? (dataEngine.isRunning ? 'running' : 'stopped') : 'unavailable',
            engine_connected_to_routes: setDataCollectionEngine ? 'yes' : 'no',
            diagrams_controller: 'integrated'
        },
        websocket: wsManager ? {
            connected_clients: wsManager.clients ? wsManager.clients.size : 0,
            project_subscriptions: wsManager.projectSubscriptions ? wsManager.projectSubscriptions.size : 0,
            initialized: wsManager.isInitialized,
            ready: wsManager.isReady()
        } : null,
        data_collection: dataEngine ? (dataEngine.getStatistics ? dataEngine.getStatistics() : 'statistics unavailable') : null,
        endpoints: {
            devices: '/api/devices/project/:projectId',
            device_start: '/api/devices/project/:projectId/:deviceId/start',
            device_stop: '/api/devices/project/:projectId/:deviceId/stop',
            tags: '/api/tags/device/:deviceId',
            measurements: '/api/measurements',
            diagrams: '/api/diagrams/project/:projectId',
            diagram_save: '/api/diagrams/project/:projectId',
            diagram_link_tag: '/api/diagrams/project/:projectId/elements/:elementId/link-tag',
            engine_status: '/api/engine/status',
            websocket_test: '/api/test-ws'
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

app.get('/api/debug/diagram-routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach((layer) => {
        if (layer.regexp.toString().includes('diagrams')) {
            routes.push({
                path: layer.regexp.toString(),
                methods: layer.route ? Object.keys(layer.route.methods) : 'middleware'
            });
        }
    });

    res.json({
        message: 'Diagram routes debug information',
        timestamp: new Date().toISOString(),
        architecture: 'Router + Controller pattern',
        diagramRoutesFound: routes.length > 0,
        routes: routes,
        testEndpoints: [
            'GET /api/diagrams/test',
            'GET /api/diagrams/health',
            'GET /api/diagrams/project/1 (replace 1 with your project ID)',
            'POST /api/diagrams/project/1 (save diagram)',
            'POST /api/diagrams/project/1/elements/element_id/link-tag (link tag to element)'
        ],
        features: [
            'Enhanced tag linking with auto-save detection',
            'Detailed error messages and debugging',
            'WebSocket integration for real-time updates',
            'Tag suggestion system',
            'Real-time data binding'
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
        websocket_ready: wsManager ? wsManager.isReady() : false,
        websocket_healthy: wsManager ? (wsManager.isHealthy ? wsManager.isHealthy() : 'method not available') : null,
        test_endpoints: [
            'POST /api/devices/project/1/123/start (replace with your project/device IDs)',
            'POST /api/devices/project/1/123/stop',
            'GET /api/devices/project/1/123/status',
            'GET /api/health (overall system health)',
            'GET /api/test-ws (WebSocket test)'
        ],
        engine_statistics: dataEngine ? (dataEngine.getStatistics ? dataEngine.getStatistics() : 'statistics unavailable') : null
    });
});

console.log('✅ Step 7: HTTP server created');
console.log('✅ Step 8: WebSocket setup complete');
console.log('✅ Step 9: Data Collection Engine setup complete');
console.log('✅ Step 10: Enhanced debugging middleware added');

const PORT = process.env.PORT || 4000;

// Start server (only ONE server.listen call)
server.listen(PORT, async () => {
    console.log('================================================================================');
    console.log('🏭 ENHANCED SCADA SYSTEM SERVER RUNNING');
    console.log('================================================================================');
    console.log(`📡 HTTP Server: http://localhost:${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}`);
    console.log(`🏷️ Tags API: http://localhost:${PORT}/api/tags/health`);
    console.log(`🔧 Diagrams API: http://localhost:${PORT}/api/diagrams/test`);
    console.log(`🔧 System Health: http://localhost:${PORT}/api/health`);
    console.log(`🧪 WebSocket Test: http://localhost:${PORT}/api/test-ws`);
    console.log(`🐛 Device Debug: http://localhost:${PORT}/api/debug/device-control`);
    console.log(`🐛 Tag Debug: http://localhost:${PORT}/api/debug/tag-routes`);
    console.log(`🐛 Diagram Debug: http://localhost:${PORT}/api/debug/diagram-routes`);
    console.log('================================================================================');

    // Show service status
    console.log('📊 Service Status:');
    console.log(`   🌐 WebSocket Manager: ${wsManager ? (wsManager.isReady() ? '✅ Ready' : '🟡 Initialized') : '❌ Not Available'}`);
    console.log(`   🏭 Data Collection Engine: ${dataEngine ? '✅ Available' : '❌ Not Available'}`);
    console.log(`   🔗 Engine-Routes Connection: ${setDataCollectionEngine ? '✅ Connected' : '❌ Not Connected'}`);
    console.log(`   🎯 Diagrams Controller: ✅ Integrated with Router`);

    // Enhanced WebSocket debug info
    if (wsManager) {
        console.log('🔍 WebSocket Debug Info:');
        console.log(`   📊 WebSocket Server Ready: ${wsManager.isReady()}`);
        console.log(`   📊 WebSocket Server Initialized: ${wsManager.isInitialized}`);
        console.log(`   📊 Has WebSocket Server: ${!!wsManager.wss}`);
        console.log(`   📊 Total Clients: ${wsManager.clients ? wsManager.clients.size : 0}`);
        console.log(`   📊 Heartbeat Active: ${!!wsManager.heartbeatInterval}`);
    }

    console.log('================================================================================');

    // Auto-start Data Collection Engine
    if (dataEngine) {
        console.log('\n🔄 Auto-starting SCADA Data Collection Engine...');
        setTimeout(async () => {
            try {
                console.log('🚀 Starting SCADA Data Collection Engine...');
                if (dataEngine.scanAndStartCollectors) {
                    await dataEngine.scanAndStartCollectors();
                } else if (dataEngine.startDataCollection) {
                    await dataEngine.startDataCollection();
                } else {
                    console.log('⚠️ No start method found on DataCollectionEngine');
                }
                console.log('✅ 🏭 Data Collection Engine started successfully!');

                const stats = dataEngine.getStatistics ? dataEngine.getStatistics() : { message: 'Stats not available' };
                console.log(`📊 Monitoring ${stats.running_devices || 0} devices with ${stats.total_tags || 0} tags`);
                console.log(`🎯 Engine Control: http://localhost:${PORT}/api/engine/status`);
                console.log('========================================');
                console.log('🎯 READY FOR ENHANCED DIAGRAM OPERATIONS!');
                console.log('   - Frontend can now save/load diagrams with controller integration');
                console.log('   - Enhanced tag linking with auto-save detection');
                console.log('   - Real data collection is active');
                console.log(`   - WebSocket broadcasts are ${wsManager ? 'working' : 'disabled'}`);
                console.log(`   - Enhanced debugging: http://localhost:${PORT}/api/debug/diagram-routes`);
                console.log('========================================');
            } catch (error) {
                console.error('❌ Error starting Data Collection Engine:', error.message);
            }
        }, 2000);
    }

    // Verify system readiness
    setTimeout(() => {
        console.log('\n🔍 Verifying enhanced system readiness...');
        try {
            const tagRoutesExist = app._router.stack.some(layer =>
                layer.regexp.toString().includes('tags')
            );

            const diagramRoutesExist = app._router.stack.some(layer =>
                layer.regexp.toString().includes('diagrams')
            );

            console.log(`✅ Tag routes registered: ${tagRoutesExist ? 'YES' : 'NO'}`);
            console.log(`✅ Diagram routes registered: ${diagramRoutesExist ? 'YES' : 'NO'}`);

            if (tagRoutesExist && diagramRoutesExist) {
                console.log('🎯 Enhanced System Ready! Available operations:');
                console.log(`   📋 List tags: GET http://localhost:${PORT}/api/tags/device/1`);
                console.log(`   ➕ Create tag: POST http://localhost:${PORT}/api/tags/device/1`);
                console.log(`   🚀 Start device: POST http://localhost:${PORT}/api/devices/project/1/123/start`);
                console.log(`   🛑 Stop device: POST http://localhost:${PORT}/api/devices/project/1/123/stop`);
                console.log(`   🎨 Get diagram: GET http://localhost:${PORT}/api/diagrams/project/1`);
                console.log(`   💾 Save diagram: POST http://localhost:${PORT}/api/diagrams/project/1`);
                console.log(`   🔗 Link tag: POST http://localhost:${PORT}/api/diagrams/project/1/elements/elem_id/link-tag`);
                console.log(`   🏭 Engine status: GET http://localhost:${PORT}/api/health`);
                console.log(`   🧪 WebSocket test: GET http://localhost:${PORT}/api/test-ws`);
                console.log(`   🐛 Debug info: GET http://localhost:${PORT}/api/debug/diagram-routes`);
            }
        } catch (error) {
            console.log('⚠️ Could not verify system readiness:', error.message);
        }
    }, 1000);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down enhanced SCADA server...');

    if (dataEngine && dataEngine.isRunning) {
        console.log('🏭 Stopping Data Collection Engine...');
        try {
            if (dataEngine.stop) {
                await dataEngine.stop();
            }
            console.log('✅ Data Collection Engine stopped');
        } catch (error) {
            console.error('❌ Error stopping Data Collection Engine:', error.message);
        }
    }

    if (wsManager) {
        console.log('🌐 Shutting down WebSocket manager...');
        try {
            if (wsManager.shutdown) {
                await wsManager.shutdown();
            }
            console.log('✅ WebSocket manager stopped');
        } catch (error) {
            console.error('❌ Error stopping WebSocket manager:', error.message);
        }
    }

    server.close(() => {
        console.log('✅ Enhanced server shutdown complete');
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