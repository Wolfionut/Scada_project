// routes/alarms.js - FUXA/Ignition Style Professional SCADA Alarm Routes
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const alarmController = require('../controllers/alarmController');

console.log('🚨 Loading FUXA/Ignition style alarm routes...');

// All routes are protected
router.use(authenticateToken);

// =============================================================================
// PRIMARY FUXA/IGNITION STYLE ROUTES (Project-level)
// =============================================================================

// ===== ALARM RULES (Configuration) =====
// GET /alarms/project/:projectId/rules - List alarm rules (configuration)
router.get('/project/:projectId/rules', alarmController.getAlarmRulesByProject);

// POST /alarms/project/:projectId/rules - Create alarm rule
router.post('/project/:projectId/rules', alarmController.createAlarmRule);

// PUT /alarms/project/:projectId/rules/:ruleId - Update alarm rule
router.put('/project/:projectId/rules/:ruleId', alarmController.updateAlarmRule);

// DELETE /alarms/project/:projectId/rules/:ruleId - Delete alarm rule
router.delete('/project/:projectId/rules/:ruleId', alarmController.deleteAlarmRule);

// ===== ACTIVE ALARMS (Current State) =====
// GET /alarms/project/:projectId/active - List currently active alarms
router.get('/project/:projectId/active', alarmController.getActiveAlarms);

// PUT /alarms/project/:projectId/active/:ruleId/ack - Acknowledge active alarm
router.put('/project/:projectId/active/:ruleId/ack', alarmController.acknowledgeAlarm);

// ===== ALARM EVENTS (History) =====
// GET /alarms/project/:projectId/events - Get alarm history/events
router.get('/project/:projectId/events', alarmController.getAlarmEvents);

// ===== PROJECT STATISTICS =====
// GET /alarms/project/:projectId/stats - Get comprehensive alarm statistics
router.get('/project/:projectId/stats', alarmController.getProjectAlarmStats);

// =============================================================================
// LEGACY COMPATIBILITY ROUTES (Maps to alarm rules for backward compatibility)
// =============================================================================

// Legacy: GET /alarms/project/:projectId - Maps to alarm rules
router.get('/project/:projectId', alarmController.getAlarmRulesByProject);

// Legacy: POST /alarms/project/:projectId - Maps to create alarm rule
router.post('/project/:projectId', alarmController.createAlarmRule);

// Legacy: PUT /alarms/project/:projectId/:ruleId/ack - Maps to acknowledge
router.put('/project/:projectId/:ruleId/ack', alarmController.acknowledgeAlarm);

// Legacy: DELETE /alarms/project/:projectId/:ruleId - Maps to delete rule
router.delete('/project/:projectId/:ruleId', alarmController.deleteAlarmRule);

// =============================================================================
// GLOBAL USER ROUTES (Cross-project)
// =============================================================================

// GET /alarms - Get all user's alarms across projects (legacy)
router.get('/', alarmController.getAlarms);

// POST /alarms - Create alarm (legacy)
router.post('/', alarmController.createAlarm);

// =============================================================================
// UTILITY AND DEBUG ENDPOINTS
// =============================================================================

// Test endpoint for debugging FUXA/Ignition alarm routes
router.get('/test/project/:projectId', async (req, res) => {
    console.log('🔧 FUXA/Ignition alarm route test endpoint hit');
    console.log('Project ID:', req.params.projectId);
    console.log('User:', req.user.id);

    res.json({
        status: 'success',
        message: 'FUXA/Ignition style alarm routes are working',
        approach: 'fuxa-ignition-style',
        projectId: req.params.projectId,
        userId: req.user.id,
        available_endpoints: {
            rules: [
                'GET /alarms/project/:projectId/rules',
                'POST /alarms/project/:projectId/rules',
                'PUT /alarms/project/:projectId/rules/:ruleId',
                'DELETE /alarms/project/:projectId/rules/:ruleId'
            ],
            active: [
                'GET /alarms/project/:projectId/active',
                'PUT /alarms/project/:projectId/active/:ruleId/ack'
            ],
            events: [
                'GET /alarms/project/:projectId/events'
            ],
            stats: [
                'GET /alarms/project/:projectId/stats'
            ]
        },
        timestamp: new Date().toISOString()
    });
});

// Enhanced health check endpoint with FUXA/Ignition details
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'fuxa-ignition-alarms-api',
        approach: 'professional-scada-alarm-system',
        timestamp: new Date().toISOString(),

        alarm_rules_endpoints: {
            'GET /alarms/project/:projectId/rules': 'List alarm rules (configuration)',
            'POST /alarms/project/:projectId/rules': 'Create new alarm rule',
            'PUT /alarms/project/:projectId/rules/:ruleId': 'Update alarm rule',
            'DELETE /alarms/project/:projectId/rules/:ruleId': 'Delete alarm rule'
        },

        active_alarms_endpoints: {
            'GET /alarms/project/:projectId/active': 'List currently active alarms',
            'PUT /alarms/project/:projectId/active/:ruleId/ack': 'Acknowledge active alarm'
        },

        alarm_events_endpoints: {
            'GET /alarms/project/:projectId/events': 'Get alarm history/events log'
        },

        statistics_endpoints: {
            'GET /alarms/project/:projectId/stats': 'Comprehensive alarm statistics'
        },

        legacy_endpoints: {
            'GET /alarms/project/:projectId': 'Legacy: List alarms (maps to rules)',
            'POST /alarms/project/:projectId': 'Legacy: Create alarm (maps to rule)',
            'PUT /alarms/project/:projectId/:ruleId/ack': 'Legacy: Acknowledge alarm',
            'DELETE /alarms/project/:projectId/:ruleId': 'Legacy: Delete alarm',
            'GET /alarms': 'Legacy: All user alarms',
            'POST /alarms': 'Legacy: Create alarm'
        },

        query_parameters: {
            rules: {
                'enabled': 'true|false - Filter by enabled status',
                'severity': 'critical|warning|info - Filter by severity',
                'tag_id': 'number - Filter by specific tag'
            },
            active: {
                'state': 'triggered|acknowledged - Filter by alarm state'
            },
            events: {
                'event_type': 'triggered|acknowledged|cleared|disabled - Filter by event type',
                'rule_id': 'number - Filter by specific rule',
                'limit': 'number - Limit results (default: 100)',
                'days': 'number - Days back to search (default: 7)'
            }
        },

        alarm_system_features: [
            'Real-time alarm rule evaluation',
            'Professional SCADA alarm states (normal/triggered/acknowledged)',
            'Complete alarm event history and audit trail',
            'WebSocket real-time notifications',
            'FUXA/Ignition style alarm management',
            'Alarm rule configuration with thresholds and conditions',
            'Deadband and delay support for industrial applications',
            'Severity levels (info/warning/critical)',
            'Automatic alarm state management',
            'Project-level alarm isolation and security'
        ],

        database_tables: {
            'alarm_rules': 'Alarm configuration (like FUXA/Ignition alarm tags)',
            'alarm_events': 'Historical alarm events log',
            'alarm_states': 'Current active alarm states',
            'active_alarms': 'View for currently active alarms with full details',
            'alarm_rule_summary': 'View for alarm rules with current status'
        }
    });
});

// Route documentation endpoint
router.get('/docs', (req, res) => {
    res.json({
        title: 'FUXA/Ignition Style SCADA Alarm System API Documentation',
        version: '1.0.0',
        description: 'Professional industrial alarm management system similar to FUXA and Ignition SCADA platforms',

        concepts: {
            alarm_rules: {
                description: 'Configuration that defines WHAT to monitor and WHEN to trigger alarms',
                fields: {
                    rule_name: 'Human-readable name for the alarm',
                    tag_id: 'Tag to monitor for alarm conditions',
                    threshold: 'Value that triggers the alarm',
                    condition_type: 'high|low|change - Type of condition to check',
                    severity: 'critical|warning|info - Alarm severity level',
                    deadband: 'Prevents alarm chattering',
                    delay_seconds: 'Delay before alarm triggers',
                    enabled: 'Whether rule is active'
                },
                example: {
                    rule_name: 'High Temperature Alert',
                    tag_id: 123,
                    threshold: 80.0,
                    condition_type: 'high',
                    severity: 'warning',
                    deadband: 2.0,
                    delay_seconds: 5,
                    enabled: true
                }
            },

            alarm_events: {
                description: 'Historical log of all alarm activity (audit trail)',
                event_types: [
                    'triggered - Alarm condition became true',
                    'acknowledged - Operator acknowledged the alarm',
                    'cleared - Alarm condition returned to normal',
                    'disabled - Alarm rule was disabled'
                ]
            },

            alarm_states: {
                description: 'Current state of active alarms',
                states: [
                    'normal - No alarm condition',
                    'triggered - Alarm active, needs acknowledgment',
                    'acknowledged - Alarm acknowledged by operator'
                ]
            }
        },

        workflow: {
            '1_configuration': 'Create alarm rules defining monitoring conditions',
            '2_real_time_evaluation': 'System continuously evaluates tag values against rules',
            '3_alarm_triggering': 'When conditions met, alarm events are created and states updated',
            '4_operator_response': 'Operators acknowledge alarms through UI',
            '5_alarm_clearing': 'When conditions return to normal, alarms are automatically cleared',
            '6_historical_tracking': 'All events are logged for compliance and analysis'
        },

        integration: {
            websocket: 'Real-time alarm notifications via WebSocket',
            real_time_data: 'Alarm evaluation triggered by live tag measurements',
            user_management: 'Alarm acknowledgments tied to user accounts',
            project_isolation: 'Alarms scoped to specific projects for security'
        }
    });
});

// Add this RIGHT AFTER router.use(authenticateToken); in routes/alarms.js

// Simple debug test route
router.get('/debug/simple/:projectId', async (req, res) => {
    console.log('🔧 ===== SIMPLE DEBUG TEST =====');
    console.log('🔧 Project ID:', req.params.projectId);
    console.log('🔧 User exists:', !!req.user);
    console.log('🔧 User ID:', req.user?.id);

    try {
        // Test 1: Basic pool connection
        console.log('🔧 Test 1: Basic pool query...');
        const poolTest = await pool.query('SELECT NOW() as current_time');
        console.log('🔧 Pool test result:', poolTest.rows[0]);

        // Test 2: Check if alarm_rules table exists
        console.log('🔧 Test 2: Check alarm_rules table...');
        const tableTest = await pool.query('SELECT COUNT(*) as count FROM alarm_rules');
        console.log('🔧 Table test result:', tableTest.rows[0]);

        // Test 3: Simple project check
        console.log('🔧 Test 3: Check project...');
        const projectTest = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.projectId]);
        console.log('🔧 Project test result:', projectTest.rows.length, 'projects found');

        // Test 4: Simple alarm rules query
        console.log('🔧 Test 4: Simple alarm rules query...');
        const rulesTest = await pool.query('SELECT * FROM alarm_rules WHERE project_id = $1', [req.params.projectId]);
        console.log('🔧 Rules test result:', rulesTest.rows.length, 'rules found');

        res.json({
            status: 'success',
            tests: {
                pool_connection: 'OK',
                alarm_rules_table: 'OK',
                project_exists: projectTest.rows.length > 0,
                rules_count: rulesTest.rows.length
            },
            debug_info: {
                project_id: req.params.projectId,
                user_id: req.user?.id,
                current_time: poolTest.rows[0].current_time
            }
        });

    } catch (error) {
        console.error('🔧 DEBUG TEST ERROR:', error);
        res.status(500).json({
            error: 'Debug test failed',
            details: error.message,
            error_code: error.code
        });
    }
});

console.log('✅ FUXA/Ignition style alarm routes loaded successfully');

module.exports = router;