// =============================================================================
// 📁 controllers/alarmController.js - FIXED VERSION - Resolves 500 errors
// =============================================================================

const pool = require('../db');

console.log('🚨 AlarmController: Loading FIXED complete SCADA alarm system...');

// =============================================================================
// ALARM RULES MANAGEMENT (Configuration) - FIXED
// =============================================================================

const getAlarmRulesByProject = async (req, res) => {
    console.log('🚨 GET ALARM RULES REQUEST - FIXED');
    const { projectId } = req.params;
    const { enabled, severity, tag_id } = req.query;

    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Check project access
        const projectCheckQuery = `SELECT * FROM projects WHERE id = $1 AND user_id = $2`;
        const projectResult = await pool.query(projectCheckQuery, [projectId, req.user.id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Build dynamic query for alarm rules - FIXED column names
        let whereConditions = ['r.project_id = $1'];
        let queryParams = [projectId];
        let paramIndex = 2;

        if (enabled !== undefined) {
            whereConditions.push(`r.enabled = $${paramIndex}`);
            queryParams.push(enabled === 'true');
            paramIndex++;
        }

        if (severity) {
            whereConditions.push(`r.severity = $${paramIndex}`);
            queryParams.push(severity);
            paramIndex++;
        }

        if (tag_id) {
            whereConditions.push(`r.tag_id = $${paramIndex}`);
            queryParams.push(parseInt(tag_id));
            paramIndex++;
        }

        // 🔧 FIXED: Use correct column names and add rule_id alias
        const rulesQuery = `
            SELECT 
                r.id as rule_id,  -- 🔧 FIXED: alias id as rule_id for frontend compatibility
                r.id,
                r.rule_name,
                r.threshold,
                r.severity,
                r.condition_type,
                r.enabled,
                r.deadband,
                r.delay_seconds,
                r.message,
                r.tag_id,
                r.device_id,
                r.project_id,
                r.user_id,
                r.created_at,
                r.updated_at,
                COALESCE(t.tag_name, 'Unknown Tag') as tag_name,
                COALESCE(t.tag_type, 'unknown') as tag_type,
                COALESCE(t.engineering_unit, '') as engineering_unit,
                COALESCE(d.device_name, 'Unknown Device') as device_name,
                COALESCE(d.device_type, 'unknown') as device_type,
                s.state as current_state,
                s.trigger_value as current_trigger_value,
                s.triggered_at as last_triggered,
                s.acknowledged_at,
                COALESCE(u_ack.username, '') as acknowledged_by_username
            FROM alarm_rules r
            LEFT JOIN tags t ON r.tag_id = t.tag_id
            LEFT JOIN devices d ON r.device_id = d.device_id
            LEFT JOIN alarm_states s ON r.id = s.rule_id  -- 🔧 FIXED: r.id = s.rule_id
            LEFT JOIN users u_ack ON s.acknowledged_by = u_ack.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY r.rule_name
        `;

        const result = await pool.query(rulesQuery, queryParams);

        console.log(`✅ Found ${result.rows.length} alarm rules for project`);
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error fetching alarm rules:', error);
        res.status(500).json({
            error: 'Failed to fetch alarm rules',
            details: error.message
        });
    }
};

const createAlarmRule = async (req, res) => {
    console.log('🚨 CREATE ALARM RULE REQUEST - FIXED');
    const { projectId } = req.params;
    const {
        rule_name,
        tag_id,
        device_id,
        threshold,
        condition_type = 'high',
        severity = 'warning',
        deadband = 0,
        delay_seconds = 0,
        message,
        enabled = true
    } = req.body;

    // Validation
    if (!rule_name || !tag_id || !device_id || threshold === undefined) {
        return res.status(400).json({
            error: 'Missing required fields: rule_name, tag_id, device_id, threshold'
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check project access and validate tag/device belong to project
        const validationQuery = `
            SELECT 
                COALESCE(t.tag_name, 'Unknown Tag') as tag_name, 
                COALESCE(d.device_name, 'Unknown Device') as device_name, 
                p.user_id, 
                p.project_name
            FROM projects p
            LEFT JOIN devices d ON d.project_id = p.id AND d.device_id = $2
            LEFT JOIN tags t ON t.device_id = d.device_id AND t.tag_id = $1
            WHERE p.id = $3 AND p.user_id = $4
        `;
        const validationResult = await client.query(validationQuery, [tag_id, device_id, projectId, req.user.id]);

        if (validationResult.rows.length === 0) {
            throw new Error('Project not found or access denied');
        }

        const validation = validationResult.rows[0];

        // Check for duplicate rule names within project
        const duplicateCheck = await client.query(
            'SELECT id FROM alarm_rules WHERE project_id = $1 AND rule_name = $2',
            [projectId, rule_name]
        );

        if (duplicateCheck.rows.length > 0) {
            throw new Error(`Alarm rule "${rule_name}" already exists in this project`);
        }

        // 🔧 FIXED: Create the alarm rule with correct column names
        const insertQuery = `
            INSERT INTO alarm_rules (
                rule_name, tag_id, device_id, project_id, user_id,
                threshold, condition_type, severity, deadband, delay_seconds,
                message, enabled, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
            RETURNING *
        `;

        const insertParams = [
            rule_name,
            parseInt(tag_id),
            parseInt(device_id),
            parseInt(projectId),
            req.user.id,
            parseFloat(threshold),
            condition_type,
            severity,
            parseFloat(deadband),
            parseInt(delay_seconds),
            message || null,
            enabled
        ];

        const result = await client.query(insertQuery, insertParams);
        const newRule = result.rows[0];

        await client.query('COMMIT');

        console.log('✅ Alarm rule created successfully:', rule_name);

        // Send WebSocket notification
        try {
            if (global.wsManager) {
                global.wsManager.broadcastAlarmEvent(projectId, 'triggered', alarmData);
            }
        } catch (wsError) {
            console.log('⚠️ WebSocket notification failed:', wsError.message);
        }

        res.status(201).json({
            success: true,
            message: `Alarm rule "${rule_name}" created for tag "${validation.tag_name}"`,
            rule: {
                ...newRule,
                rule_id: newRule.id, // 🔧 FIXED: Add rule_id alias
                tag_name: validation.tag_name,
                device_name: validation.device_name,
                project_name: validation.project_name
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating alarm rule:', error);
        res.status(500).json({
            error: 'Failed to create alarm rule',
            details: error.message
        });
    } finally {
        client.release();
    }
};

const updateAlarmRule = async (req, res) => {
    console.log('🚨 UPDATE ALARM RULE REQUEST - FIXED');
    const { projectId, ruleId } = req.params;
    const updateData = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 🔧 FIXED: Check if rule exists and user has project access
        const ruleCheckQuery = `
            SELECT r.*, 
                   COALESCE(t.tag_name, 'Unknown Tag') as tag_name, 
                   COALESCE(d.device_name, 'Unknown Device') as device_name, 
                   p.user_id
            FROM alarm_rules r
            LEFT JOIN tags t ON r.tag_id = t.tag_id
            LEFT JOIN devices d ON r.device_id = d.device_id
            JOIN projects p ON r.project_id = p.id
            WHERE r.id = $1 AND p.id = $2 AND p.user_id = $3
        `;
        const ruleResult = await client.query(ruleCheckQuery, [ruleId, projectId, req.user.id]);

        if (ruleResult.rows.length === 0) {
            throw new Error('Alarm rule not found or access denied');
        }

        const ruleCheck = ruleResult.rows[0];

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];
        let valueIndex = 1;

        const allowedFields = [
            'rule_name', 'threshold', 'condition_type', 'severity',
            'deadband', 'delay_seconds', 'message', 'enabled'
        ];

        allowedFields.forEach(field => {
            if (updateData.hasOwnProperty(field)) {
                updateFields.push(`${field} = $${valueIndex}`);

                if (['threshold', 'deadband'].includes(field)) {
                    updateValues.push(parseFloat(updateData[field]));
                } else if (field === 'delay_seconds') {
                    updateValues.push(parseInt(updateData[field]));
                } else if (field === 'enabled') {
                    updateValues.push(Boolean(updateData[field]));
                } else {
                    updateValues.push(updateData[field]);
                }
                valueIndex++;
            }
        });

        if (updateFields.length === 0) {
            throw new Error('No valid fields to update');
        }

        // Add updated_at timestamp
        updateFields.push(`updated_at = NOW()`);

        // Add rule_id for WHERE clause
        updateValues.push(ruleId);

        const updateQuery = `
            UPDATE alarm_rules
            SET ${updateFields.join(', ')}
            WHERE id = $${valueIndex}
            RETURNING *
        `;

        const result = await client.query(updateQuery, updateValues);
        const updatedRule = result.rows[0];

        // If rule was disabled, clear any active alarms
        if (updateData.enabled === false) {
            await client.query('DELETE FROM alarm_states WHERE rule_id = $1', [ruleId]);

            // Log the disable event
            await client.query(`
                INSERT INTO alarm_events (rule_id, tag_id, device_id, project_id, user_id, event_type, message, created_at)
                VALUES ($1, $2, $3, $4, $5, 'disabled', 'Alarm rule disabled', NOW())
            `, [ruleId, ruleCheck.tag_id, ruleCheck.device_id, projectId, req.user.id]);
        }

        await client.query('COMMIT');

        console.log('✅ Alarm rule updated successfully:', updatedRule.rule_name);

        // Send WebSocket notification
        try {
            if (global.wsManager) {
                global.wsManager.broadcastToProject(projectId, {
                    type: 'alarm_rule_updated',
                    data: {
                        rule: {
                            ...updatedRule,
                            rule_id: updatedRule.id, // 🔧 FIXED: Add rule_id alias
                            tag_name: ruleCheck.tag_name,
                            device_name: ruleCheck.device_name
                        },
                        project_id: projectId
                    }
                });

                // Send updated alarm summary
                global.wsManager.broadcastAlarmSummary(projectId);
            }
        } catch (wsError) {
            console.log('⚠️ WebSocket notification failed:', wsError.message);
        }

        res.json({
            success: true,
            message: `Alarm rule "${updatedRule.rule_name}" updated successfully`,
            rule: {
                ...updatedRule,
                rule_id: updatedRule.id, // 🔧 FIXED: Add rule_id alias
                tag_name: ruleCheck.tag_name,
                device_name: ruleCheck.device_name
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error updating alarm rule:', error);
        res.status(500).json({
            error: 'Failed to update alarm rule',
            details: error.message
        });
    } finally {
        client.release();
    }
};

const deleteAlarmRule = async (req, res) => {
    console.log('🚨 DELETE ALARM RULE REQUEST - FIXED');
    const { projectId, ruleId } = req.params;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 🔧 FIXED: Check if rule exists and user has project access
        const ruleCheckQuery = `
            SELECT r.*, 
                   COALESCE(t.tag_name, 'Unknown Tag') as tag_name, 
                   COALESCE(d.device_name, 'Unknown Device') as device_name, 
                   p.user_id
            FROM alarm_rules r
            LEFT JOIN tags t ON r.tag_id = t.tag_id
            LEFT JOIN devices d ON r.device_id = d.device_id
            JOIN projects p ON r.project_id = p.id
            WHERE r.id = $1 AND p.id = $2 AND p.user_id = $3
        `;
        const ruleResult = await client.query(ruleCheckQuery, [ruleId, projectId, req.user.id]);

        if (ruleResult.rows.length === 0) {
            throw new Error('Alarm rule not found or access denied');
        }

        const ruleCheck = ruleResult.rows[0];

        // Clear any active alarm states
        await client.query('DELETE FROM alarm_states WHERE rule_id = $1', [ruleId]);

        // Delete the alarm rule (alarm_events will be cascade deleted)
        await client.query('DELETE FROM alarm_rules WHERE id = $1', [ruleId]);

        await client.query('COMMIT');

        console.log('✅ Alarm rule deleted successfully:', ruleCheck.rule_name);

        // Send WebSocket notification
        try {
            if (global.wsManager) {
                global.wsManager.broadcastToProject(projectId, {
                    type: 'alarm_rule_deleted',
                    data: {
                        rule_id: ruleId,
                        rule_name: ruleCheck.rule_name,
                        tag_name: ruleCheck.tag_name,
                        device_name: ruleCheck.device_name,
                        project_id: projectId
                    }
                });

                // Send updated alarm summary
                global.wsManager.broadcastAlarmSummary(projectId);
            }
        } catch (wsError) {
            console.log('⚠️ WebSocket notification failed:', wsError.message);
        }

        res.json({
            success: true,
            message: `Alarm rule "${ruleCheck.rule_name}" deleted successfully`
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error deleting alarm rule:', error);
        res.status(500).json({
            error: 'Failed to delete alarm rule',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// =============================================================================
// ACTIVE ALARMS MANAGEMENT (Current State) - FIXED
// =============================================================================

const getActiveAlarms = async (req, res) => {
    console.log('🚨 GET ACTIVE ALARMS REQUEST - FIXED');
    const { projectId } = req.params;
    const { state = 'triggered' } = req.query; // DEFAULT to only triggered (unacknowledged)

    try {
        // Check project access
        const projectCheckQuery = `SELECT * FROM projects WHERE id = $1 AND user_id = $2`;
        const projectResult = await pool.query(projectCheckQuery, [projectId, req.user.id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Build query for active alarms - ONLY show unacknowledged by default
        let whereConditions = ['s.project_id = $1'];
        let queryParams = [projectId];

        // 🔧 FIX: Default to only 'triggered' state (unacknowledged alarms)
        if (state === 'all') {
            // Only show all states if explicitly requested
        } else {
            whereConditions.push('s.state = $2');
            queryParams.push(state);
        }

        // 🔧 FIXED: Use correct column names and add rule_id alias
        const activeAlarmsQuery = `
            SELECT
                s.*,
                r.id as rule_id,  -- 🔧 FIXED: Add rule_id alias
                r.rule_name,
                r.severity,
                r.threshold,
                r.condition_type,
                r.message as rule_message,
                r.enabled,
                COALESCE(t.tag_name, 'Unknown Tag') as tag_name,
                COALESCE(t.engineering_unit, '') as engineering_unit,
                COALESCE(d.device_name, 'Unknown Device') as device_name,
                COALESCE(d.device_type, 'unknown') as device_type,
                COALESCE(u_ack.username, '') as acknowledged_by_username
            FROM alarm_states s
            JOIN alarm_rules r ON s.rule_id = r.id  -- 🔧 FIXED: s.rule_id = r.id
            LEFT JOIN tags t ON s.tag_id = t.tag_id
            LEFT JOIN devices d ON s.device_id = d.device_id
            LEFT JOIN users u_ack ON s.acknowledged_by = u_ack.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY s.triggered_at DESC
        `;

        const result = await pool.query(activeAlarmsQuery, queryParams);

        console.log(`✅ Found ${result.rows.length} active alarms for project (state: ${state})`);
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error fetching active alarms:', error);
        res.status(500).json({
            error: 'Failed to fetch active alarms',
            details: error.message
        });
    }
};

const acknowledgeAlarm = async (req, res) => {
    console.log('🚨 ACKNOWLEDGE ALARM REQUEST - FIXED');
    const { projectId, ruleId } = req.params;
    const { message: ackMessage } = req.body;

    console.log('🔧 Debug Info:');
    console.log('   Project ID:', projectId);
    console.log('   Rule ID:', ruleId);
    console.log('   User ID:', req.user?.id);
    console.log('   Ack Message:', ackMessage);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 🔧 STEP 1: Check if alarm rule exists and user has access (FIXED)
        console.log('🔍 Step 1: Checking alarm rule and project access...');

        const ruleAccessQuery = `
            SELECT r.*, p.user_id as project_owner
            FROM alarm_rules r
            JOIN projects p ON r.project_id = p.id
            WHERE r.id = $1 AND r.project_id = $2
        `;

        const ruleResult = await client.query(ruleAccessQuery, [ruleId, projectId]);

        if (ruleResult.rows.length === 0) {
            throw new Error('Alarm rule not found or project access denied');
        }

        const rule = ruleResult.rows[0];
        console.log('🔍 Rule found:', rule.rule_name);

        // Check if user owns the project
        if (rule.project_owner !== req.user.id) {
            throw new Error('User does not own this project');
        }

        // 🔧 STEP 2: Check current alarm state (or create if missing) - FIXED
        console.log('🔍 Step 2: Checking current alarm state...');

        const currentStateQuery = `
            SELECT s.*, 
                   COALESCE(t.tag_name, 'Unknown Tag') as tag_name, 
                   COALESCE(d.device_name, 'Unknown Device') as device_name
            FROM alarm_states s
            LEFT JOIN tags t ON s.tag_id = t.tag_id
            LEFT JOIN devices d ON s.device_id = d.device_id
            WHERE s.rule_id = $1
        `;

        const currentStateResult = await client.query(currentStateQuery, [ruleId]);

        console.log('🔍 Existing alarm states found:', currentStateResult.rows.length);

        let currentAlarm;

        if (currentStateResult.rows.length === 0) {
            // 🔧 FIX: Create missing alarm state if it doesn't exist
            console.log('⚠️ No alarm state found, creating one...');

            const createStateQuery = `
                INSERT INTO alarm_states (
                    rule_id, tag_id, device_id, project_id,
                    state, trigger_value, triggered_at
                ) VALUES ($1, $2, $3, $4, 'triggered', 0, NOW())
                RETURNING *
            `;

            const createResult = await client.query(createStateQuery, [
                ruleId, rule.tag_id, rule.device_id, projectId
            ]);

            // Get the full details
            const newStateResult = await client.query(currentStateQuery, [ruleId]);
            currentAlarm = newStateResult.rows[0];

            console.log('✅ Created alarm state:', currentAlarm);
        } else {
            currentAlarm = currentStateResult.rows[0];
            console.log('✅ Found existing alarm state:', currentAlarm.state);
        }

        // Check if already acknowledged
        if (currentAlarm.state === 'acknowledged') {
            console.log('⚠️ Alarm already acknowledged');
            return res.status(400).json({
                error: 'Alarm is already acknowledged',
                current_state: currentAlarm.state,
                acknowledged_at: currentAlarm.acknowledged_at
            });
        }

        // 🔧 STEP 3: Update alarm state to acknowledged (FIXED)
        console.log('🔧 Step 3: Updating alarm state to acknowledged...');

        const updateStateQuery = `
            UPDATE alarm_states
            SET state = 'acknowledged',
                acknowledged_at = NOW(),
                acknowledged_by = $1,
                ack_message = $2
            WHERE rule_id = $3
            RETURNING *
        `;

        const updateResult = await client.query(updateStateQuery, [
            req.user.id,
            ackMessage || 'Acknowledged by operator',
            ruleId
        ]);

        console.log('🔧 Update result:', updateResult.rows.length, 'rows affected');

        if (updateResult.rows.length === 0) {
            throw new Error('Failed to update alarm state - no rows affected');
        }

        const updatedAlarm = updateResult.rows[0];
        console.log('✅ Alarm state updated:', updatedAlarm.state);

        // 🔧 STEP 4: Create acknowledgment event (FIXED)
        console.log('🔧 Step 4: Creating acknowledgment event...');

        const eventQuery = `
            INSERT INTO alarm_events (
                rule_id, tag_id, device_id, project_id, user_id,
                event_type, message, acknowledged_at, acknowledged_by, ack_message,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, 'acknowledged', $6, NOW(), $7, $8, NOW())
            RETURNING id, event_type, created_at
        `;

        const eventResult = await client.query(eventQuery, [
            ruleId,
            currentAlarm.tag_id,
            currentAlarm.device_id,
            projectId,
            req.user.id,
            `Alarm acknowledged: ${rule.rule_name}`,
            req.user.id,
            ackMessage || 'Acknowledged by operator'
        ]);

        console.log('✅ Acknowledgment event created:', eventResult.rows[0]);

        await client.query('COMMIT');
        console.log('✅ Transaction committed successfully');

        // Send WebSocket notification
        try {
            if (global.wsManager) {
                console.log('📡 Sending WebSocket notification...');

                await global.wsManager.broadcastToProject(projectId, {
                    type: 'alarm_acknowledged',
                    data: {
                        rule_id: ruleId,
                        id: ruleId, // Add id for compatibility
                        rule_name: rule.rule_name,
                        tag_id: currentAlarm.tag_id,
                        tag_name: currentAlarm.tag_name,
                        device_id: currentAlarm.device_id,
                        device_name: currentAlarm.device_name,
                        acknowledged_by: req.user.username,
                        ack_message: ackMessage,
                        acknowledged_at: new Date().toISOString(),
                        project_id: projectId,
                        timestamp: new Date().toISOString(),
                        state: 'acknowledged',
                        current_state: 'acknowledged'
                    }
                });

                // Send updated alarm summary
                await global.wsManager.broadcastAlarmSummary(projectId);
                console.log('📡 WebSocket notifications sent');
            }
        } catch (wsError) {
            console.log('⚠️ WebSocket notification failed:', wsError.message);
        }

        res.json({
            success: true,
            message: `Alarm "${rule.rule_name}" acknowledged successfully`,
            alarm: {
                rule_id: ruleId,
                rule_name: rule.rule_name,
                state: 'acknowledged',
                acknowledged_at: updatedAlarm.acknowledged_at,
                acknowledged_by: req.user.username,
                ack_message: ackMessage
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error acknowledging alarm:', error);
        console.error('❌ Error stack:', error.stack);

        res.status(500).json({
            error: 'Failed to acknowledge alarm',
            details: error.message,
            debug_info: {
                rule_id: ruleId,
                project_id: projectId,
                user_id: req.user?.id
            }
        });
    } finally {
        client.release();
    }
};

// =============================================================================
// ALARM EVENTS (History) - FIXED
// =============================================================================

const getAlarmEvents = async (req, res) => {
    console.log('🚨 GET ALARM EVENTS REQUEST - FIXED');
    const { projectId } = req.params;
    const { event_type, rule_id, limit = 100, days = 7 } = req.query;

    try {
        // Check project access
        const projectCheckQuery = `SELECT * FROM projects WHERE id = $1 AND user_id = $2`;
        const projectResult = await pool.query(projectCheckQuery, [projectId, req.user.id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Build dynamic query
        let whereConditions = ['e.project_id = $1', `e.created_at >= NOW() - INTERVAL '${parseInt(days)} days'`];
        let queryParams = [projectId];
        let paramIndex = 2;

        if (event_type) {
            whereConditions.push(`e.event_type = $${paramIndex}`);
            queryParams.push(event_type);
            paramIndex++;
        }

        if (rule_id) {
            whereConditions.push(`e.rule_id = $${paramIndex}`);
            queryParams.push(parseInt(rule_id));
            paramIndex++;
        }

        queryParams.push(parseInt(limit));

        // 🔧 FIXED: Use correct column names and add rule_id alias
        const eventsQuery = `
            SELECT
                e.*,
                r.rule_name,
                r.id as rule_id,  -- 🔧 FIXED: Add rule_id alias
                COALESCE(t.tag_name, 'Unknown Tag') as tag_name,
                COALESCE(t.engineering_unit, '') as engineering_unit,
                COALESCE(d.device_name, 'Unknown Device') as device_name,
                COALESCE(d.device_type, 'unknown') as device_type,
                COALESCE(u_ack.username, '') as acknowledged_by_username
            FROM alarm_events e
            JOIN alarm_rules r ON e.rule_id = r.id  -- 🔧 FIXED: e.rule_id = r.id
            LEFT JOIN tags t ON e.tag_id = t.tag_id
            LEFT JOIN devices d ON e.device_id = d.device_id
            LEFT JOIN users u_ack ON e.acknowledged_by = u_ack.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY e.created_at DESC
            LIMIT $${paramIndex}
        `;

        const result = await pool.query(eventsQuery, queryParams);

        console.log(`✅ Found ${result.rows.length} alarm events for project`);
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error fetching alarm events:', error);
        res.status(500).json({
            error: 'Failed to fetch alarm events',
            details: error.message
        });
    }
};

// =============================================================================
// PROJECT STATISTICS - FIXED
// =============================================================================

const getProjectAlarmStats = async (req, res) => {
    console.log('🚨 GET PROJECT ALARM STATS REQUEST - FIXED');
    const { projectId } = req.params;

    try {
        // Check project access
        const projectCheckQuery = `SELECT * FROM projects WHERE id = $1 AND user_id = $2`;
        const projectResult = await pool.query(projectCheckQuery, [projectId, req.user.id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        const project = projectResult.rows[0];

        // Get alarm rule statistics
        const rulesStatsQuery = `
            SELECT
                COUNT(*) as total_rules,
                COUNT(CASE WHEN enabled = true THEN 1 END) as enabled_rules,
                COUNT(CASE WHEN enabled = false THEN 1 END) as disabled_rules,
                COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_rules,
                COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_rules,
                COUNT(CASE WHEN severity = 'info' THEN 1 END) as info_rules
            FROM alarm_rules WHERE project_id = $1
        `;
        const rulesStats = await pool.query(rulesStatsQuery, [projectId]);

        // Get active alarm statistics
        const activeStatsQuery = `
            SELECT
                COUNT(*) as total_active,
                COUNT(CASE WHEN acknowledged_at IS NULL THEN 1 END) as unacknowledged,
                COUNT(CASE WHEN acknowledged_at IS NOT NULL THEN 1 END) as acknowledged
            FROM alarm_states WHERE project_id = $1
        `;
        const activeStats = await pool.query(activeStatsQuery, [projectId]);

        // Get recent events statistics
        const eventsStatsQuery = `
            SELECT
                COUNT(*) as total_events_24h,
                COUNT(CASE WHEN event_type = 'triggered' THEN 1 END) as triggered_24h,
                COUNT(CASE WHEN event_type = 'acknowledged' THEN 1 END) as acknowledged_24h,
                COUNT(CASE WHEN event_type = 'cleared' THEN 1 END) as cleared_24h
            FROM alarm_events
            WHERE project_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
        `;
        const eventsStats = await pool.query(eventsStatsQuery, [projectId]);

        res.json({
            project_id: projectId,
            project_name: project.project_name,
            rules: rulesStats.rows[0],
            ...activeStats.rows[0], // Flatten active alarm stats
            events_24h: eventsStats.rows[0],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting alarm stats:', error);
        res.status(500).json({
            error: 'Failed to get alarm statistics',
            details: error.message
        });
    }
};

// =============================================================================
// EXPORTS - FIXED
// =============================================================================

console.log('✅ AlarmController: FIXED complete SCADA alarm system loaded successfully');

module.exports = {
    // Alarm Rules (Configuration)
    getAlarmRulesByProject,
    createAlarmRule,
    updateAlarmRule,
    deleteAlarmRule,

    // Active Alarms (Current State)
    getActiveAlarms,
    acknowledgeAlarm,

    // Alarm Events (History)
    getAlarmEvents,

    // Statistics
    getProjectAlarmStats,

    // Legacy Compatibility
    getAlarms: getAlarmRulesByProject,  // Alias for backward compatibility
    createAlarm: createAlarmRule        // Alias for backward compatibility
};