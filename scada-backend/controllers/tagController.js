// controllers/tagController.js - Complete Enhanced SCADA Tags Controller with Database Optimizations
const pool = require('../db');

console.log('🏷️ TagController: Loading complete enhanced tags controller with database optimizations...');

// ==============================================================================
// PRIMARY INDEPENDENT APPROACH FUNCTIONS (Project-level)
// ==============================================================================

// CREATE TAG FOR PROJECT - Device selected in modal
const createTagForProject = async (req, res) => {
    console.log('🏷️ CREATE TAG FOR PROJECT REQUEST');
    console.log('Project ID:', req.params.projectId);
    console.log('User ID:', req.user.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { projectId } = req.params;
    const {
        device_id, // Device selected in modal
        tag_name,
        tag_type = 'analog',
        address,
        update_interval = 1000,
        simulation = false,
        simulation_min,
        simulation_max,
        simulation_noise,
        simulation_pattern,
        // Enhanced professional fields
        tag_group,
        data_type = 'FLOAT',
        engineering_unit,
        raw_min,
        raw_max,
        scaled_min,
        scaled_max,
        deadband,
        read_only = false,
        description
    } = req.body;

    // Validation
    if (!tag_name) {
        return res.status(400).json({ error: 'Tag name is required' });
    }

    if (!device_id) {
        return res.status(400).json({ error: 'Device selection is required' });
    }

    const client = await pool.connect();

    try {
        // Check if project exists and user has access
        console.log('🔍 Checking project access...');
        const projectCheckQuery = `
            SELECT * FROM projects
            WHERE id = $1 AND user_id = $2
        `;
        const projectResult = await client.query(projectCheckQuery, [projectId, req.user.id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Check if device exists and belongs to the project
        console.log('🔍 Checking device belongs to project...');
        const deviceCheckQuery = `
            SELECT d.*, p.user_id
            FROM devices d
                     JOIN projects p ON d.project_id = p.id
            WHERE d.device_id = $1 AND d.project_id = $2 AND p.user_id = $3
        `;
        const deviceResult = await client.query(deviceCheckQuery, [device_id, projectId, req.user.id]);

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found or does not belong to this project' });
        }

        const deviceCheck = deviceResult.rows[0];
        console.log('✅ Device access confirmed:', deviceCheck.device_name);

        // Check for duplicate tag names within the device
        console.log('🔍 Checking for duplicate tag names...');
        const existingTagQuery = `
            SELECT tag_id FROM tags
            WHERE device_id = $1 AND tag_name = $2
        `;
        const existingTagResult = await client.query(existingTagQuery, [device_id, tag_name]);

        if (existingTagResult.rows.length > 0) {
            return res.status(409).json({
                error: `Tag name "${tag_name}" already exists for device "${deviceCheck.device_name}"`
            });
        }

        // Validate data type
        const validDataTypes = ['FLOAT', 'DOUBLE', 'INT16', 'INT32', 'BOOL', 'STRING'];
        if (data_type && !validDataTypes.includes(data_type)) {
            return res.status(400).json({
                error: `Invalid data_type. Must be one of: ${validDataTypes.join(', ')}`
            });
        }

        // Validate simulation pattern
        if (simulation && simulation_pattern) {
            const validPatterns = [
                'random', 'sine', 'square', 'ramp', 'step',
                'temperature', 'pressure', 'flow', 'level', 'motor_rpm', 'vibration'
            ];
            if (!validPatterns.includes(simulation_pattern)) {
                return res.status(400).json({
                    error: `Invalid simulation_pattern. Must be one of: ${validPatterns.join(', ')}`
                });
            }
        }

        console.log('💾 Inserting tag data...');

        // Insert the tag
        const insertQuery = `
            INSERT INTO tags (
                device_id, tag_name, tag_type, address, update_interval,
                simulation, simulation_min, simulation_max, simulation_noise, simulation_pattern,
                tag_group, data_type, engineering_unit,
                raw_min, raw_max, scaled_min, scaled_max,
                deadband, read_only, description,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
                RETURNING *
        `;

        const values = [
            parseInt(device_id),
            tag_name.trim(),
            tag_type,
            address || null,
            update_interval ? parseInt(update_interval) : null,
            simulation,
            simulation && simulation_min !== undefined ? parseFloat(simulation_min) : null,
            simulation && simulation_max !== undefined ? parseFloat(simulation_max) : null,
            simulation && simulation_noise !== undefined ? parseFloat(simulation_noise) : null,
            simulation ? simulation_pattern : null,
            tag_group || null,
            data_type || 'FLOAT',
            engineering_unit || null,
            raw_min !== undefined ? parseFloat(raw_min) : null,
            raw_max !== undefined ? parseFloat(raw_max) : null,
            scaled_min !== undefined ? parseFloat(scaled_min) : null,
            scaled_max !== undefined ? parseFloat(scaled_max) : null,
            deadband !== undefined ? parseFloat(deadband) : null,
            read_only,
            description || null,
            new Date().toISOString(),
            new Date().toISOString()
        ];

        const result = await client.query(insertQuery, values);
        const newTag = result.rows[0];

        console.log('✅ Tag created successfully:', newTag.tag_name);

        // Send WebSocket notification
        try {
            if (global.wsManager) {
                global.wsManager.broadcastToProject(projectId, {
                    type: 'tag_created',
                    data: {
                        tag: newTag,
                        device_id: device_id,
                        device_name: deviceCheck.device_name,
                        project_id: projectId
                    }
                });
                console.log('📡 WebSocket notification sent');
            }
        } catch (wsError) {
            console.log('⚠️ WebSocket notification failed:', wsError.message);
        }

        res.status(201).json({
            success: true,
            message: `${simulation ? 'Simulation' : 'Real'} tag "${tag_name}" created for device "${deviceCheck.device_name}"`,
            tag: {
                ...newTag,
                device_name: deviceCheck.device_name,
                device_type: deviceCheck.device_type
            }
        });

    } catch (error) {
        console.error('❌ Error creating tag:', error);
        res.status(500).json({
            error: 'Failed to create tag',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// GET ALL TAGS FOR PROJECT - Independent view
const getTagsByProject = async (req, res) => {
    console.log('🏷️ GET PROJECT TAGS REQUEST');
    console.log('Project ID:', req.params.projectId);
    console.log('User ID:', req.user.id);

    const { projectId } = req.params;
    const client = await pool.connect();

    try {
        // Check project access - FIXED: use 'id' instead of 'project_id'
        const projectCheckQuery = `
            SELECT * FROM projects WHERE id = $1 AND user_id = $2
        `;
        const projectResult = await client.query(projectCheckQuery, [projectId, req.user.id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Get all tags for all devices in the project with device info
        const tagsQuery = `
            SELECT
                t.tag_id,
                t.device_id,
                t.tag_name,
                t.tag_type,
                t.address,
                t.update_interval,
                t.simulation,
                t.simulation_min,
                t.simulation_max,
                t.simulation_noise,
                t.simulation_pattern,
                t.tag_group,
                t.data_type,
                t.engineering_unit,
                t.raw_min,
                t.raw_max,
                t.scaled_min,
                t.scaled_max,
                t.deadband,
                t.read_only,
                t.description,
                t.created_at,
                t.updated_at,
                d.device_name,
                d.device_type,
                d.connection_quality as device_status
            FROM tags t
                     JOIN devices d ON t.device_id = d.device_id
            WHERE d.project_id = $1
            ORDER BY d.device_name, t.tag_group, t.tag_name
        `;
        const tagsResult = await client.query(tagsQuery, [projectId]);

        console.log(`✅ Found ${tagsResult.rows.length} tags across all devices in project`);

        res.json(tagsResult.rows);

    } catch (error) {
        console.error('❌ Error fetching project tags:', error);
        res.status(500).json({
            error: 'Failed to fetch project tags',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// GET DEVICES FOR PROJECT - For modal dropdown
const getDevicesForProject = async (req, res) => {
    console.log('🏷️ GET PROJECT DEVICES REQUEST');
    console.log('Project ID:', req.params.projectId);

    const { projectId } = req.params;
    const client = await pool.connect();

    try {
        // Check project access - FIXED: use 'id' instead of 'project_id'
        const projectCheckQuery = `
            SELECT * FROM projects WHERE id = $1 AND user_id = $2
        `;
        const projectResult = await client.query(projectCheckQuery, [projectId, req.user.id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Get all devices for the project
        const devicesQuery = `
            SELECT
                device_id,
                device_name,
                device_type,
                connection_quality as status,
                ip_address,
                port,
                protocol
            FROM devices
            WHERE project_id = $1
            ORDER BY device_name
        `;
        const devicesResult = await client.query(devicesQuery, [projectId]);

        console.log(`✅ Found ${devicesResult.rows.length} devices in project`);

        res.json(devicesResult.rows);

    } catch (error) {
        console.error('❌ Error fetching project devices:', error);
        res.status(500).json({
            error: 'Failed to fetch project devices',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// UPDATE TAG - Project-level access
const updateTagForProject = async (req, res) => {
    console.log('🏷️ UPDATE TAG FOR PROJECT REQUEST');
    console.log('Project ID:', req.params.projectId);
    console.log('Tag ID:', req.params.tagId);
    console.log('User ID:', req.user.id);

    const { projectId, tagId } = req.params;
    const updateData = req.body;
    const client = await pool.connect();

    try {
        // Check if tag exists and user has project access - FIXED: use 'id' instead of 'project_id'
        const tagCheckQuery = `
            SELECT t.*, d.device_name, d.device_type, p.user_id, p.id as project_id
            FROM tags t
                     JOIN devices d ON t.device_id = d.device_id
                     JOIN projects p ON d.project_id = p.id
            WHERE t.tag_id = $1 AND p.id = $2 AND p.user_id = $3
        `;
        const tagResult = await client.query(tagCheckQuery, [tagId, projectId, req.user.id]);

        if (tagResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tag not found or access denied' });
        }

        const tagCheck = tagResult.rows[0];

        // Check for duplicate tag names (excluding current tag) within the same device
        if (updateData.tag_name && updateData.tag_name !== tagCheck.tag_name) {
            const existingTagQuery = `
                SELECT tag_id FROM tags
                WHERE device_id = $1 AND tag_name = $2 AND tag_id != $3
            `;
            const existingResult = await client.query(existingTagQuery, [tagCheck.device_id, updateData.tag_name, tagId]);

            if (existingResult.rows.length > 0) {
                return res.status(409).json({
                    error: `Tag name "${updateData.tag_name}" already exists for device "${tagCheck.device_name}"`
                });
            }
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];
        let valueIndex = 1;

        const allowedFields = [
            'tag_name', 'tag_type', 'address', 'update_interval',
            'simulation', 'simulation_min', 'simulation_max', 'simulation_noise', 'simulation_pattern',
            'tag_group', 'data_type', 'engineering_unit',
            'raw_min', 'raw_max', 'scaled_min', 'scaled_max',
            'deadband', 'read_only', 'description'
        ];

        allowedFields.forEach(field => {
            if (updateData.hasOwnProperty(field)) {
                updateFields.push(`${field} = $${valueIndex}`);

                if (field.includes('_min') || field.includes('_max') || field === 'deadband') {
                    updateValues.push(updateData[field] !== undefined ? parseFloat(updateData[field]) : null);
                } else if (field === 'update_interval') {
                    updateValues.push(updateData[field] ? parseInt(updateData[field]) : null);
                } else {
                    updateValues.push(updateData[field] || null);
                }
                valueIndex++;
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // Add updated_at timestamp
        updateFields.push(`updated_at = $${valueIndex}`);
        updateValues.push(new Date().toISOString());
        valueIndex++;

        // Add tag_id for WHERE clause
        updateValues.push(tagId);

        const updateQuery = `
            UPDATE tags
            SET ${updateFields.join(', ')}
            WHERE tag_id = $${valueIndex}
                RETURNING *
        `;

        const result = await client.query(updateQuery, updateValues);
        const updatedTag = result.rows[0];

        console.log('✅ Tag updated successfully:', updatedTag.tag_name);

        // Send WebSocket notification
        try {
            if (global.wsManager) {
                global.wsManager.broadcastToProject(projectId, {
                    type: 'tag_updated',
                    data: {
                        tag: {
                            ...updatedTag,
                            device_name: tagCheck.device_name,
                            device_type: tagCheck.device_type
                        },
                        project_id: projectId
                    }
                });
            }
        } catch (wsError) {
            console.log('⚠️ WebSocket notification failed:', wsError.message);
        }

        res.json({
            success: true,
            message: `Tag "${updatedTag.tag_name}" updated successfully`,
            tag: {
                ...updatedTag,
                device_name: tagCheck.device_name,
                device_type: tagCheck.device_type
            }
        });

    } catch (error) {
        console.error('❌ Error updating tag:', error);
        res.status(500).json({
            error: 'Failed to update tag',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// DELETE TAG - Project-level access
const deleteTagForProject = async (req, res) => {
    console.log('🏷️ DELETE TAG FOR PROJECT REQUEST');
    console.log('Project ID:', req.params.projectId);
    console.log('Tag ID:', req.params.tagId);

    const { projectId, tagId } = req.params;
    const client = await pool.connect();

    try {
        // Check if tag exists and user has project access - FIXED: use 'id' instead of 'project_id'
        const tagCheckQuery = `
            SELECT t.*, d.device_name, d.device_type, p.user_id, p.id as project_id
            FROM tags t
                     JOIN devices d ON t.device_id = d.device_id
                     JOIN projects p ON d.project_id = p.id
            WHERE t.tag_id = $1 AND p.id = $2 AND p.user_id = $3
        `;
        const tagResult = await client.query(tagCheckQuery, [tagId, projectId, req.user.id]);

        if (tagResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tag not found or access denied' });
        }

        const tagCheck = tagResult.rows[0];

        // Delete associated measurements first
        await client.query(`DELETE FROM measurements WHERE tag_id = $1`, [tagId]);

        // Delete the tag
        await client.query(`DELETE FROM tags WHERE tag_id = $1`, [tagId]);

        console.log('✅ Tag deleted successfully:', tagCheck.tag_name);

        // Send WebSocket notification
        try {
            if (global.wsManager) {
                global.wsManager.broadcastToProject(projectId, {
                    type: 'tag_deleted',
                    data: {
                        tag_id: tagId,
                        tag_name: tagCheck.tag_name,
                        device_name: tagCheck.device_name,
                        project_id: projectId
                    }
                });
            }
        } catch (wsError) {
            console.log('⚠️ WebSocket notification failed:', wsError.message);
        }

        res.json({
            success: true,
            message: `Tag "${tagCheck.tag_name}" deleted successfully`
        });

    } catch (error) {
        console.error('❌ Error deleting tag:', error);
        res.status(500).json({
            error: 'Failed to delete tag',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// GET PROJECT TAG STATISTICS (Basic)
const getProjectTagStats = async (req, res) => {
    const { projectId } = req.params;
    const client = await pool.connect();

    try {
        // Check project access - FIXED: use 'id' instead of 'project_id'
        const projectCheckQuery = `
            SELECT * FROM projects WHERE id = $1 AND user_id = $2
        `;
        const projectResult = await client.query(projectCheckQuery, [projectId, req.user.id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        const project = projectResult.rows[0];

        // Get comprehensive project tag statistics
        const statsQuery = `
            SELECT
                COUNT(*) as total_tags,
                COUNT(CASE WHEN t.simulation = true THEN 1 END) as simulation_tags,
                COUNT(CASE WHEN t.simulation = false THEN 1 END) as real_tags,
                COUNT(CASE WHEN t.read_only = true THEN 1 END) as readonly_tags,
                COUNT(CASE WHEN t.tag_group IS NOT NULL THEN 1 END) as grouped_tags,
                COUNT(CASE WHEN t.engineering_unit IS NOT NULL THEN 1 END) as tags_with_units,
                COUNT(CASE WHEN t.deadband IS NOT NULL THEN 1 END) as tags_with_deadband,
                COUNT(DISTINCT t.tag_group) as unique_groups,
                COUNT(DISTINCT t.tag_type) as unique_types,
                COUNT(DISTINCT t.data_type) as unique_data_types,
                COUNT(DISTINCT d.device_id) as devices_with_tags
            FROM tags t
                     JOIN devices d ON t.device_id = d.device_id
            WHERE d.project_id = $1
        `;
        const statsResult = await client.query(statsQuery, [projectId]);
        const stats = statsResult.rows[0];

        // Get device breakdown
        const deviceBreakdownQuery = `
            SELECT
                d.device_name,
                d.device_type,
                COUNT(t.tag_id) as tag_count
            FROM devices d
                     LEFT JOIN tags t ON d.device_id = t.device_id
            WHERE d.project_id = $1
            GROUP BY d.device_id, d.device_name, d.device_type
            ORDER BY tag_count DESC
        `;
        const deviceResult = await client.query(deviceBreakdownQuery, [projectId]);

        // Get tag type breakdown
        const typeBreakdownQuery = `
            SELECT
                t.tag_type,
                COUNT(*) as count
            FROM tags t
                JOIN devices d ON t.device_id = d.device_id
            WHERE d.project_id = $1
            GROUP BY t.tag_type
            ORDER BY count DESC
        `;
        const typeResult = await client.query(typeBreakdownQuery, [projectId]);

        // Get group breakdown
        const groupBreakdownQuery = `
            SELECT
                COALESCE(t.tag_group, 'Ungrouped') as tag_group,
                COUNT(*) as count
            FROM tags t
                JOIN devices d ON t.device_id = d.device_id
            WHERE d.project_id = $1
            GROUP BY t.tag_group
            ORDER BY count DESC
        `;
        const groupResult = await client.query(groupBreakdownQuery, [projectId]);

        res.json({
            project_id: projectId,
            project_name: project.project_name,
            summary: stats,
            breakdowns: {
                by_device: deviceResult.rows,
                by_tag_type: typeResult.rows,
                by_group: groupResult.rows
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting project tag stats:', error);
        res.status(500).json({
            error: 'Failed to get project tag statistics',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// ==============================================================================
// ENHANCED FUNCTIONS (Using Database Improvements)
// ==============================================================================

// GET TAG STATISTICS using the new database view
const getTagStatistics = async (req, res) => {
    console.log('📊 GET TAG STATISTICS REQUEST');
    console.log('Project ID:', req.params.projectId);
    console.log('User ID:', req.user.id);

    const { projectId } = req.params;
    const client = await pool.connect();

    try {
        // Check project access
        const projectCheckQuery = `
            SELECT * FROM projects WHERE id = $1 AND user_id = $2
        `;
        const projectResult = await client.query(projectCheckQuery, [projectId, req.user.id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Use the new tag_statistics view with device info
        const statsQuery = `
            SELECT 
                ts.*,
                d.project_id
            FROM tag_statistics ts
            JOIN devices d ON ts.device_id = d.device_id
            WHERE d.project_id = $1
            ORDER BY ts.device_name, ts.tag_name
        `;

        const result = await client.query(statsQuery, [projectId]);

        console.log(`✅ Found statistics for ${result.rows.length} tags`);

        // Transform data for easier frontend consumption
        const statisticsMap = {};
        result.rows.forEach(row => {
            statisticsMap[row.tag_id] = {
                tag_id: row.tag_id,
                tag_name: row.tag_name,
                device_id: row.device_id,
                device_name: row.device_name,
                tag_type: row.tag_type,
                engineering_unit: row.engineering_unit,
                measurements_count: parseInt(row.measurements_count) || 0,
                last_measurement: row.last_measurement,
                avg_value: row.avg_value ? parseFloat(row.avg_value) : null,
                min_value: row.min_value ? parseFloat(row.min_value) : null,
                max_value: row.max_value ? parseFloat(row.max_value) : null,
                quality_percentage: row.quality_percentage ? parseFloat(row.quality_percentage) : 0,
                simulation: row.simulation || false
            };
        });

        res.json({
            project_id: projectId,
            statistics: statisticsMap,
            total_tags: Object.keys(statisticsMap).length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error fetching tag statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch tag statistics',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// GET LATEST MEASUREMENTS using the new database view
const getLatestMeasurements = async (req, res) => {
    console.log('📈 GET LATEST MEASUREMENTS REQUEST');
    console.log('Project ID:', req.params.projectId);
    console.log('User ID:', req.user.id);

    const { projectId } = req.params;
    const client = await pool.connect();

    try {
        // Check project access
        const projectCheckQuery = `
            SELECT * FROM projects WHERE id = $1 AND user_id = $2
        `;
        const projectResult = await client.query(projectCheckQuery, [projectId, req.user.id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Use the new latest_measurements view
        const measurementsQuery = `
            SELECT 
                lm.tag_id,
                lm.tag_name,
                lm.device_id,
                lm.device_name,
                lm.value,
                lm.quality,
                lm.source,
                lm.timestamp,
                lm.engineering_unit,
                lm.tag_type,
                lm.simulation
            FROM latest_measurements lm
            JOIN devices d ON lm.device_id = d.device_id
            WHERE d.project_id = $1
            ORDER BY lm.device_name, lm.tag_name
        `;

        const result = await client.query(measurementsQuery, [projectId]);

        console.log(`✅ Found latest measurements for ${result.rows.length} tags`);

        // Transform to map for easier frontend access
        const latestValues = {};
        result.rows.forEach(row => {
            latestValues[row.tag_id] = {
                tag_id: row.tag_id,
                tag_name: row.tag_name,
                device_id: row.device_id,
                device_name: row.device_name,
                value: row.value ? parseFloat(row.value) : null,
                quality: row.quality || 'unknown',
                source: row.source || 'unknown',
                timestamp: row.timestamp,
                engineering_unit: row.engineering_unit,
                tag_type: row.tag_type,
                simulation: row.simulation || false
            };
        });

        res.json({
            project_id: projectId,
            latest_measurements: latestValues,
            total_measurements: Object.keys(latestValues).length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error fetching latest measurements:', error);
        res.status(500).json({
            error: 'Failed to fetch latest measurements',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// GET TAG HEALTH using the new database function
const getTagHealth = async (req, res) => {
    console.log('🏥 GET TAG HEALTH REQUEST');
    console.log('Project ID:', req.params.projectId);
    console.log('Tag ID:', req.params.tagId);
    console.log('User ID:', req.user.id);

    const { projectId, tagId } = req.params;
    const client = await pool.connect();

    try {
        // Check tag exists and user has access
        const tagCheckQuery = `
            SELECT t.tag_id, t.tag_name, d.device_name 
            FROM tags t
            JOIN devices d ON t.device_id = d.device_id
            JOIN projects p ON d.project_id = p.id
            WHERE t.tag_id = $1 AND p.id = $2 AND p.user_id = $3
        `;
        const tagResult = await client.query(tagCheckQuery, [tagId, projectId, req.user.id]);

        if (tagResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tag not found or access denied' });
        }

        const tagInfo = tagResult.rows[0];

        // Use the new get_tag_health function
        const healthQuery = `SELECT * FROM get_tag_health($1)`;
        const result = await client.query(healthQuery, [tagId]);

        const health = result.rows[0];

        console.log(`✅ Tag health status: ${health.status}`);

        res.json({
            tag_id: parseInt(tagId),
            tag_name: tagInfo.tag_name,
            device_name: tagInfo.device_name,
            health: {
                status: health.status || 'UNKNOWN',
                last_good_measurement: health.last_good_measurement,
                measurements_last_hour: parseInt(health.measurements_last_hour) || 0,
                quality_percentage: parseFloat(health.quality_percentage) || 0
            },
            assessment: {
                is_healthy: health.status === 'HEALTHY',
                is_stale: health.status === 'STALE',
                has_poor_quality: health.status === 'POOR_QUALITY',
                needs_attention: health.status !== 'HEALTHY'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting tag health:', error);
        res.status(500).json({
            error: 'Failed to get tag health',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// GET TAG HISTORY for charts and analysis
const getTagHistory = async (req, res) => {
    console.log('📊 GET TAG HISTORY REQUEST');
    console.log('Project ID:', req.params.projectId);
    console.log('Tag ID:', req.params.tagId);
    console.log('Query params:', req.query);

    const { projectId, tagId } = req.params;
    const {
        hours = 24,
        limit = 1000,
        quality = 'all',
        source = 'all'
    } = req.query;

    const client = await pool.connect();

    try {
        // Check tag exists and user has access
        const tagCheckQuery = `
            SELECT t.tag_id, t.tag_name, t.engineering_unit, d.device_name 
            FROM tags t
            JOIN devices d ON t.device_id = d.device_id
            JOIN projects p ON d.project_id = p.id
            WHERE t.tag_id = $1 AND p.id = $2 AND p.user_id = $3
        `;
        const tagResult = await client.query(tagCheckQuery, [tagId, projectId, req.user.id]);

        if (tagResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tag not found or access denied' });
        }

        const tagInfo = tagResult.rows[0];

        // Build history query with filters
        let historyQuery = `
            SELECT 
                value, 
                quality, 
                source, 
                timestamp
            FROM measurements 
            WHERE tag_id = $1 
            AND timestamp > CURRENT_TIMESTAMP - INTERVAL '${parseInt(hours)} hours'
        `;

        const queryParams = [tagId];
        let paramIndex = 2;

        // Add quality filter
        if (quality !== 'all') {
            historyQuery += ` AND quality = $${paramIndex}`;
            queryParams.push(quality);
            paramIndex++;
        }

        // Add source filter
        if (source !== 'all') {
            historyQuery += ` AND source = $${paramIndex}`;
            queryParams.push(source);
            paramIndex++;
        }

        historyQuery += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
        queryParams.push(parseInt(limit));

        const result = await client.query(historyQuery, queryParams);

        console.log(`✅ Found ${result.rows.length} historical measurements`);

        // Process data for frontend consumption
        const processedData = result.rows.map(row => ({
            value: row.value ? parseFloat(row.value) : null,
            quality: row.quality,
            source: row.source,
            timestamp: row.timestamp,
            formatted_time: new Date(row.timestamp).toLocaleString()
        }));

        // Calculate basic statistics
        const values = processedData
            .filter(d => d.value !== null && d.quality === 'good')
            .map(d => d.value);

        const statistics = values.length > 0 ? {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            quality_good_percent: (values.length / processedData.length * 100).toFixed(2)
        } : null;

        res.json({
            tag_id: parseInt(tagId),
            tag_name: tagInfo.tag_name,
            device_name: tagInfo.device_name,
            engineering_unit: tagInfo.engineering_unit,
            query_parameters: {
                hours_requested: parseInt(hours),
                limit_requested: parseInt(limit),
                quality_filter: quality,
                source_filter: source
            },
            data_points: processedData.length,
            statistics,
            data: processedData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error fetching tag history:', error);
        res.status(500).json({
            error: 'Failed to fetch tag history',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// GET DEVICE TAGS WITH STATISTICS (Enhanced device endpoint)
const getDeviceTagsWithStats = async (req, res) => {
    console.log('🔧 GET DEVICE TAGS WITH STATS REQUEST');
    console.log('Project ID:', req.params.projectId);
    console.log('Device ID:', req.params.deviceId);

    const { projectId, deviceId } = req.params;
    const client = await pool.connect();

    try {
        // Check access
        const deviceCheckQuery = `
            SELECT d.device_id, d.device_name, d.device_type
            FROM devices d
            JOIN projects p ON d.project_id = p.id
            WHERE d.device_id = $1 AND p.id = $2 AND p.user_id = $3
        `;
        const deviceResult = await client.query(deviceCheckQuery, [deviceId, projectId, req.user.id]);

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        const deviceInfo = deviceResult.rows[0];

        // Get tags with statistics for this device
        const tagsWithStatsQuery = `
            SELECT 
                ts.*
            FROM tag_statistics ts
            WHERE ts.device_id = $1
            ORDER BY ts.tag_name
        `;

        const result = await client.query(tagsWithStatsQuery, [deviceId]);

        console.log(`✅ Found ${result.rows.length} tags with statistics for device`);

        res.json({
            device: deviceInfo,
            tags_count: result.rows.length,
            tags: result.rows.map(row => ({
                tag_id: row.tag_id,
                tag_name: row.tag_name,
                tag_type: row.tag_type,
                engineering_unit: row.engineering_unit,
                simulation: row.simulation,
                statistics: {
                    measurements_count: parseInt(row.measurements_count) || 0,
                    last_measurement: row.last_measurement,
                    avg_value: row.avg_value ? parseFloat(row.avg_value) : null,
                    min_value: row.min_value ? parseFloat(row.min_value) : null,
                    max_value: row.max_value ? parseFloat(row.max_value) : null,
                    quality_percentage: row.quality_percentage ? parseFloat(row.quality_percentage) : 0
                }
            })),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error fetching device tags with stats:', error);
        res.status(500).json({
            error: 'Failed to fetch device tags with statistics',
            details: error.message
        });
    } finally {
        client.release();
    }
};

// ==============================================================================
// LEGACY COMPATIBILITY FUNCTIONS (Device-centric)
// ==============================================================================

// LEGACY FUNCTIONS - Keep for backward compatibility with device-specific routes
const createTag = async (req, res) => {
    // Redirect to project-level creation or handle legacy route
    const { deviceId } = req.params;
    const client = await pool.connect();

    try {
        // Get project ID from device
        const deviceQuery = `SELECT project_id FROM devices WHERE device_id = $1`;
        const deviceResult = await client.query(deviceQuery, [deviceId]);

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Add device_id to request body and call project-level function
        req.body.device_id = parseInt(deviceId);
        req.params.projectId = deviceResult.rows[0].project_id;

        return createTagForProject(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create tag', details: error.message });
    } finally {
        client.release();
    }
};

const getTagsByDevice = async (req, res) => {
    // Legacy function - filter project tags by device
    const { deviceId } = req.params;
    const client = await pool.connect();

    try {
        // Get project ID and check access - FIXED: use 'id' instead of 'project_id'
        const deviceCheckQuery = `
            SELECT d.project_id, p.user_id
            FROM devices d
                     JOIN projects p ON d.project_id = p.id
            WHERE d.device_id = $1 AND p.user_id = $2
        `;
        const deviceResult = await client.query(deviceCheckQuery, [deviceId, req.user.id]);

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        // Get tags for this specific device
        req.params.projectId = deviceResult.rows[0].project_id;

        // Call project function and filter by device
        const originalJson = res.json;
        res.json = function(data) {
            if (Array.isArray(data)) {
                const filteredTags = data.filter(tag => tag.device_id == deviceId);
                return originalJson.call(this, filteredTags);
            }
            return originalJson.call(this, data);
        };

        return getTagsByProject(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tags', details: error.message });
    } finally {
        client.release();
    }
};

// Keep other legacy functions for compatibility
const updateTag = updateTagForProject;
const deleteTag = deleteTagForProject;
const getTagStats = async (req, res) => {
    // Device-specific stats - implement if needed
    res.status(501).json({ error: 'Use project-level statistics instead' });
};

// Legacy bulk operations - keep existing implementation
const bulkCreateTags = async (req, res) => {
    res.status(501).json({ error: 'Bulk operations not implemented for independent approach yet' });
};

const exportTags = async (req, res) => {
    res.status(501).json({ error: 'Export not implemented for independent approach yet' });
};

const importTags = async (req, res) => {
    res.status(501).json({ error: 'Import not implemented for independent approach yet' });
};

console.log('✅ TagController: Complete enhanced independent approach with database optimizations loaded successfully');

// ==============================================================================
// MODULE EXPORTS
// ==============================================================================

module.exports = {
    // ==============================================================================
    // PRIMARY INDEPENDENT APPROACH FUNCTIONS (Project-level)
    // ==============================================================================
    createTagForProject,
    getTagsByProject,
    getDevicesForProject,
    updateTagForProject,
    deleteTagForProject,
    getProjectTagStats,

    // ==============================================================================
    // ENHANCED FUNCTIONS (Using Database Improvements)
    // ==============================================================================

    // Statistics and Analytics
    getTagStatistics,           // Uses tag_statistics view
    getLatestMeasurements,      // Uses latest_measurements view
    getTagHealth,               // Uses get_tag_health() function
    getTagHistory,              // Uses optimized indexes for time-series
    getDeviceTagsWithStats,     // Enhanced device endpoint with statistics

    // ==============================================================================
    // LEGACY COMPATIBILITY FUNCTIONS (Device-centric)
    // ==============================================================================

    // Basic legacy functions
    createTag,                  // Redirects to project-level creation
    getTagsByDevice,            // Filters project tags by device
    updateTag,                  // Alias for updateTagForProject
    deleteTag,                  // Alias for deleteTagForProject
    getTagStats,                // Legacy device stats (deprecated)

    // ==============================================================================
    // BULK OPERATIONS (Future Implementation)
    // ==============================================================================
    bulkCreateTags,             // Not implemented yet
    exportTags,                 // Not implemented yet
    importTags,                 // Not implemented yet

    // ==============================================================================
    // FUNCTION MAPPING REFERENCE
    // ==============================================================================
    /*
    Function Usage Guide:

    PRIMARY FUNCTIONS (Use these in your React frontend):
    - getTagsByProject          → Get all tags for a project
    - createTagForProject       → Create new tag (requires device_id in body)
    - updateTagForProject       → Update existing tag
    - deleteTagForProject       → Delete tag
    - getTagStatistics          → Get enhanced statistics (uses database view)
    - getLatestMeasurements     → Get real-time values (uses database view)
    - getTagHealth              → Get tag health status (uses database function)
    - getTagHistory             → Get historical data (optimized queries)

    LEGACY FUNCTIONS (For backward compatibility):
    - getTagsByDevice           → Filters project tags by device
    - createTag                 → Redirects to project creation
    - updateTag                 → Same as updateTagForProject
    - deleteTag                 → Same as deleteTagForProject

    RECOMMENDED API ENDPOINTS FOR FRONTEND:
    - GET /api/tags/project/:projectId/statistics
    - GET /api/tags/project/:projectId/latest
    - GET /api/tags/project/:projectId/:tagId/health
    - GET /api/tags/project/:projectId/:tagId/history
    */
};