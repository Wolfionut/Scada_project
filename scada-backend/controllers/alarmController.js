// controllers/alarmController.js - Complete Fixed Version with WebSocket Integration
const pool = require('../db');

console.log('🚨 AlarmController: Loading complete SCADA alarm system...');

// =============================================================================
// ALARM RULES MANAGEMENT (Configuration)
// =============================================================================

// GET ALL ALARM RULES FOR PROJECT
exports.getAlarmRulesByProject = async (req, res) => {
    console.log('🚨 GET ALARM RULES REQUEST');
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

        // Build dynamic query for alarm rules
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

        const rulesQuery = `
            SELECT 
                r.id as rule_id,
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
                r.created_at,
                r.updated_at,
                t.tag_name,
                t.tag_type,
                t.engineering_unit,
                d.device_name,
                d.device_type,
                s.state as current_state,
                s.trigger_value as current_trigger_value,
                s.triggered_at as last_triggered,
                s.acknowledged_at,
                u_ack.username as acknowledged_by_username
            FROM alarm_rules r
            JOIN tags t ON r.tag_id = t.tag_id
            JOIN devices d ON r.device_id = d.device_id
            LEFT JOIN alarm_states s ON r.id = s.rule_id
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

// CREATE ALARM RULE
exports.createAlarmRule = async (req, res) => {
    console.log('🚨 CREATE ALARM RULE REQUEST');
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
            SELECT t.tag_name, d.device_name, p.user_id, p.project_name
            FROM tags t
            JOIN devices d ON t.device_id = d.device_id
            JOIN projects p ON d.project_id = p.id
            WHERE t.tag_id = $1 AND d.device_id = $2 AND p.id = $3 AND p.user_id = $4
        `;
        const validationResult = await client.query(validationQuery, [tag_id, device_id, projectId, req.user.id]);

        if (validationResult.rows.length === 0) {
            throw new Error('Invalid tag/device for this project or access denied');
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

        // Create the alarm rule
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
                global.wsManager.broadcastToProject(projectId, {
                    type: 'alarm_rule_created',
                    data: {
                        rule: {
                            ...newRule,
                            tag_name: validation.tag_name,
                            device_name: validation.device_name
                        },
                        project_id: projectId
                    }
                });
            }
        } catch (wsError) {
            console.log('⚠️ WebSocket notification failed:', wsError.message);
        }

        res.status(201).json({
            success: true,
            message: `Alarm rule "${rule_name}" created for tag "${validation.tag_name}"`,
            rule: {
                ...newRule,
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

// UPDATE ALARM RULE
exports.updateAlarmRule = async (req, res) => {
    console.log('🚨 UPDATE ALARM RULE REQUEST');
    const { projectId, ruleId } = req.params;
    const updateData = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if rule exists and user has project access
        const ruleCheckQuery = `
            SELECT r.*, t.tag_name, d.device_name, p.user_id
            FROM alarm_rules r
                     JOIN tags t ON r.tag_id = t.tag_id
                     JOIN devices d ON r.device_id = d.device_id
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
                INSERT INTO alarm_events (rule_id, tag_id, device_id, project_id, user_id, event_type, message)
                VALUES ($1, $2, $3, $4, $5, 'disabled', 'Alarm rule disabled')
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

// DELETE ALARM RULE
exports.deleteAlarmRule = async (req, res) => {
    console.log('🚨 DELETE ALARM RULE REQUEST');
    const { projectId, ruleId } = req.params;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if rule exists and user has project access
        const ruleCheckQuery = `
            SELECT r.*, t.tag_name, d.device_name, p.user_id
            FROM alarm_rules r
                     JOIN tags t ON r.tag_id = t.tag_id
                     JOIN devices d ON r.device_id = d.device_id
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
// ACTIVE ALARMS MANAGEMENT (Current State)
// =============================================================================

// GET ACTIVE ALARMS FOR PROJECT - FIXED
exports.getActiveAlarms = async (req, res) => {
    console.log('🚨 GET ACTIVE ALARMS REQUEST');
    const { projectId } = req.params;
    const { state } = req.query;

    try {
        // Check project access
        const projectCheckQuery = `SELECT * FROM projects WHERE id = $1 AND user_id = $2`;
        const projectResult = await pool.query(projectCheckQuery, [projectId, req.user.id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Build query for active alarms with full details
        let whereConditions = ['s.project_id = $1'];
        let queryParams = [projectId];

        if (state) {
            whereConditions.push('s.state = $2');
            queryParams.push(state);
        }

        const activeAlarmsQuery = `
            SELECT
                s.*,
                r.rule_name,
                r.severity,
                r.threshold,
                r.condition_type,
                r.message as rule_message,
                t.tag_name,
                t.engineering_unit,
                d.device_name,
                d.device_type,
                u_ack.username as acknowledged_by_username
            FROM alarm_states s
                     JOIN alarm_rules r ON s.rule_id = r.id
                     JOIN tags t ON s.tag_id = t.tag_id
                     JOIN devices d ON s.device_id = d.device_id
                     LEFT JOIN users u_ack ON s.acknowledged_by = u_ack.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY s.triggered_at DESC
        `;

        const result = await pool.query(activeAlarmsQuery, queryParams);

        console.log(`✅ Found ${result.rows.length} active alarms for project`);
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error fetching active alarms:', error);
        res.status(500).json({
            error: 'Failed to fetch active alarms',
            details: error.message
        });
    }
};

// ACKNOWLEDGE ALARM - FIXED
exports.acknowledgeAlarm = async (req, res) => {
    console.log('🚨 ACKNOWLEDGE ALARM REQUEST');
    const { projectId, ruleId } = req.params;
    const { message: ackMessage } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if alarm state exists and user has access
        const alarmCheckQuery = `
            SELECT s.*, r.rule_name, t.tag_name, d.device_name
            FROM alarm_states s
                     JOIN alarm_rules r ON s.rule_id = r.id
                     JOIN tags t ON s.tag_id = t.tag_id
                     JOIN devices d ON s.device_id = d.device_id
                     JOIN projects p ON s.project_id = p.id
            WHERE s.rule_id = $1 AND p.id = $2 AND p.user_id = $3 AND s.state = 'triggered'
        `;
        const alarmResult = await client.query(alarmCheckQuery, [ruleId, projectId, req.user.id]);

        if (alarmResult.rows.length === 0) {
            throw new Error('Active alarm not found or access denied');
        }

        const alarmCheck = alarmResult.rows[0];

        // Update alarm state to acknowledged
        await client.query(`
            UPDATE alarm_states
            SET state = 'acknowledged',
                acknowledged_at = NOW(),
                acknowledged_by = $1,
                ack_message = $2
            WHERE rule_id = $3
        `, [req.user.id, ackMessage, ruleId]);

        // Create acknowledgment event
        await client.query(`
            INSERT INTO alarm_events (
                rule_id, tag_id, device_id, project_id, user_id,
                event_type, message, acknowledged_at, acknowledged_by, ack_message
            ) VALUES ($1, $2, $3, $4, $5, 'acknowledged', $6, NOW(), $7, $8)
        `, [
            ruleId, alarmCheck.tag_id, alarmCheck.device_id, projectId, req.user.id,
            `Alarm acknowledged: ${alarmCheck.rule_name}`, req.user.id, ackMessage
        ]);

        await client.query('COMMIT');

        console.log('✅ Alarm acknowledged successfully:', alarmCheck.rule_name);

        // Send WebSocket notification
        try {
            if (global.wsManager) {
                global.wsManager.broadcastToProject(projectId, {
                    type: 'alarm_acknowledged',
                    data: {
                        rule_id: ruleId,
                        rule_name: alarmCheck.rule_name,
                        tag_name: alarmCheck.tag_name,
                        device_name: alarmCheck.device_name,
                        acknowledged_by: req.user.username,
                        ack_message: ackMessage,
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
            message: `Alarm "${alarmCheck.rule_name}" acknowledged successfully`
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error acknowledging alarm:', error);
        res.status(500).json({
            error: 'Failed to acknowledge alarm',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// =============================================================================
// ALARM EVENTS (History)
// =============================================================================

// GET ALARM EVENTS (History) FOR PROJECT
exports.getAlarmEvents = async (req, res) => {
    console.log('🚨 GET ALARM EVENTS REQUEST');
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

        const eventsQuery = `
            SELECT
                e.*,
                r.rule_name,
                t.tag_name,
                t.engineering_unit,
                d.device_name,
                d.device_type,
                u_ack.username as acknowledged_by_username
            FROM alarm_events e
                     JOIN alarm_rules r ON e.rule_id = r.id
                     JOIN tags t ON e.tag_id = t.tag_id
                     JOIN devices d ON e.device_id = d.device_id
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
// REAL-TIME ALARM EVALUATION - COMPLETE FIXED VERSION
// =============================================================================

// EVALUATE ALARM CONDITIONS (Real-time) - COMPLETE FIXED
exports.evaluateAlarmConditions = async (measurements) => {
    console.log('🔄 Evaluating alarm conditions for', Object.keys(measurements).length, 'measurements');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get all enabled alarm rules
        const rulesQuery = `
            SELECT r.*, t.tag_name, d.device_name
            FROM alarm_rules r
                     JOIN tags t ON r.tag_id = t.tag_id
                     JOIN devices d ON r.device_id = d.device_id
            WHERE r.enabled = true
        `;
        const rulesResult = await client.query(rulesQuery);
        const rules = rulesResult.rows;

        const alarmEvents = [];

        for (const rule of rules) {
            const measurement = measurements[rule.tag_id];
            if (!measurement || measurement.value === null || measurement.value === undefined) {
                continue;
            }

            const currentValue = parseFloat(measurement.value);
            const threshold = parseFloat(rule.threshold);

            // Simple condition evaluation
            let conditionMet = false;
            switch (rule.condition_type) {
                case 'high':
                    conditionMet = currentValue > threshold;
                    break;
                case 'low':
                    conditionMet = currentValue < threshold;
                    break;
                case 'change':
                    // Simple change detection
                    conditionMet = Math.abs(currentValue - threshold) > (rule.deadband || 0);
                    break;
            }

            // Check current alarm state
            const stateQuery = `SELECT * FROM alarm_states WHERE rule_id = $1`;
            const stateResult = await client.query(stateQuery, [rule.id]);
            const currentState = stateResult.rows[0];

            if (conditionMet && !currentState) {
                // NEW ALARM TRIGGERED

                // Create alarm state
                await client.query(`
                    INSERT INTO alarm_states (
                        rule_id, tag_id, device_id, project_id,
                        state, trigger_value, triggered_at
                    ) VALUES ($1, $2, $3, $4, 'triggered', $5, NOW())
                `, [rule.id, rule.tag_id, rule.device_id, rule.project_id, currentValue]);

                // Create alarm event
                const eventResult = await client.query(`
                    INSERT INTO alarm_events (
                        rule_id, tag_id, device_id, project_id, user_id,
                        event_type, trigger_value, threshold_value, condition_type,
                        severity, message
                    ) VALUES ($1, $2, $3, $4, $5, 'triggered', $6, $7, $8, $9, $10)
                    RETURNING *
                `, [
                    rule.id, rule.tag_id, rule.device_id, rule.project_id, rule.user_id,
                    currentValue, threshold, rule.condition_type, rule.severity,
                    rule.message || `${rule.rule_name}: ${currentValue} ${rule.condition_type} ${threshold}`
                ]);

                alarmEvents.push({
                    type: 'triggered',
                    event: eventResult.rows[0],
                    rule: rule,
                    measurement: measurement
                });

                console.log(`🚨 Alarm triggered: ${rule.rule_name} (${currentValue} ${rule.condition_type} ${threshold})`);

                // Send WebSocket notification immediately
                try {
                    if (global.wsManager) {
                        global.wsManager.broadcastAlarmEvent(rule.project_id, 'triggered', {
                            rule: rule,
                            measurement: measurement,
                            trigger_value: currentValue,
                            threshold: threshold,
                            condition: rule.condition_type
                        });
                    }
                } catch (wsError) {
                    console.log('⚠️ WebSocket alarm notification failed:', wsError.message);
                }

            } else if (!conditionMet && currentState && currentState.state === 'triggered') {
                // ALARM CLEARED

                // Remove alarm state
                await client.query(`DELETE FROM alarm_states WHERE rule_id = $1`, [rule.id]);

                // Create cleared event
                await client.query(`
                    INSERT INTO alarm_events (
                        rule_id, tag_id, device_id, project_id, user_id,
                        event_type, trigger_value, threshold_value, condition_type,
                        severity, message, cleared_at
                    ) VALUES ($1, $2, $3, $4, $5, 'cleared', $6, $7, $8, $9, $10, NOW())
                `, [
                    rule.id, rule.tag_id, rule.device_id, rule.project_id, rule.user_id,
                    currentValue, threshold, rule.condition_type, rule.severity,
                    `${rule.rule_name}: CLEARED - ${currentValue}`
                ]);

                alarmEvents.push({
                    type: 'cleared',
                    rule: rule,
                    measurement: measurement
                });

                console.log(`✅ Alarm cleared: ${rule.rule_name} (${currentValue})`);

                // Send WebSocket notification
                try {
                    if (global.wsManager) {
                        global.wsManager.broadcastAlarmEvent(rule.project_id, 'cleared', {
                            rule: rule,
                            measurement: measurement,
                            clear_value: currentValue
                        });
                    }
                } catch (wsError) {
                    console.log('⚠️ WebSocket alarm notification failed:', wsError.message);
                }
            }
        }

        await client.query('COMMIT');

        // Send alarm summary updates for affected projects
        if (alarmEvents.length > 0 && global.wsManager) {
            const projectIds = [...new Set(alarmEvents.map(e => e.rule.project_id))];
            for (const projectId of projectIds) {
                try {
                    await global.wsManager.broadcastAlarmSummary(projectId);
                } catch (wsError) {
                    console.log('⚠️ WebSocket summary notification failed:', wsError.message);
                }
            }
        }

        return alarmEvents;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error evaluating alarm conditions:', error);
        throw error;
    } finally {
        client.release();
    }
};

// HANDLE REAL-TIME MEASUREMENTS (Called from WebSocket)
exports.handleRealTimeMeasurements = async (measurements) => {
    try {
        const alarmEvents = await exports.evaluateAlarmConditions(measurements);
        console.log(`📊 Processed ${alarmEvents.length} alarm events from real-time data`);
        return alarmEvents;
    } catch (error) {
        console.error('❌ Error handling real-time measurements for alarms:', error);
    }
};

// =============================================================================
// PROJECT STATISTICS
// =============================================================================

// GET PROJECT ALARM STATISTICS
exports.getProjectAlarmStats = async (req, res) => {
    console.log('🚨 GET PROJECT ALARM STATS REQUEST');
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
            active_alarms: activeStats.rows[0],
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
// LEGACY COMPATIBILITY (Keep for backward compatibility)
// =============================================================================

// Legacy: Get alarms (maps to alarm rules)
exports.getAlarms = exports.getAlarmRulesByProject;

// Legacy: Create alarm (maps to alarm rule)
exports.createAlarm = exports.createAlarmRule;

console.log('✅ AlarmController: Complete SCADA alarm system loaded successfully');

module.exports = {
    // Alarm Rules (Configuration)
    getAlarmRulesByProject: exports.getAlarmRulesByProject,
    createAlarmRule: exports.createAlarmRule,
    updateAlarmRule: exports.updateAlarmRule,
    deleteAlarmRule: exports.deleteAlarmRule,

    // Active Alarms (Current State)
    getActiveAlarms: exports.getActiveAlarms,
    acknowledgeAlarm: exports.acknowledgeAlarm,

    // Alarm Events (History)
    getAlarmEvents: exports.getAlarmEvents,

    // Real-time Evaluation
    evaluateAlarmConditions: exports.evaluateAlarmConditions,
    handleRealTimeMeasurements: exports.handleRealTimeMeasurements,

    // Statistics
    getProjectAlarmStats: exports.getProjectAlarmStats,

    // Legacy Compatibility
    getAlarms: exports.getAlarms,
    createAlarm: exports.createAlarm
};