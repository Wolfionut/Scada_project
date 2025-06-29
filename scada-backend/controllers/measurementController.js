// controllers/measurementController.js - Complete Enhanced SCADA Version
const pool = require('../db');

console.log('📊 MeasurementController: Loading enhanced SCADA version...');

// ==================== EXISTING BASIC FUNCTIONS (KEEP AS-IS) ====================

// List latest measurements for a tag, with optional time filtering
exports.getMeasurementsByTag = async (req, res) => {
    try {
        const { tagId } = req.params;
        const { start, end, limit = 1000 } = req.query;

        console.log('📊 Getting measurements for tag:', tagId);
        console.log('📊 Time range:', { start, end, limit });

        // Verify tag exists and user has access
        const tagCheckQuery = `
            SELECT t.*, d.device_name, p.user_id, p.project_name
            FROM tags t
            JOIN devices d ON t.device_id = d.device_id
            JOIN projects p ON d.project_id = p.id
            WHERE t.tag_id = $1
        `;
        const tagResult = await pool.query(tagCheckQuery, [tagId]);

        if (tagResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        const tag = tagResult.rows[0];

        // Check if user has access to this tag's project
        if (tag.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied to this tag' });
        }

        let query = `
            SELECT 
                measurement_id, 
                tag_id, 
                value, 
                timestamp, 
                quality, 
                source 
            FROM measurements 
            WHERE tag_id = $1
        `;
        let params = [tagId];

        // Add time filters if provided
        if (start && end) {
            query += ` AND timestamp >= to_timestamp($2/1000) AND timestamp <= to_timestamp($3/1000)`;
            params.push(start, end);
        } else if (start) {
            query += ` AND timestamp >= to_timestamp($2/1000)`;
            params.push(start);
        } else if (end) {
            query += ` AND timestamp <= to_timestamp($2/1000)`;
            params.push(end);
        }

        query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit));

        console.log('📊 Executing query:', query);
        console.log('📊 With params:', params);

        const { rows } = await pool.query(query, params);

        console.log(`📊 Found ${rows.length} measurements for tag ${tag.tag_name}`);

        res.json({
            tag_info: {
                tag_id: tag.tag_id,
                tag_name: tag.tag_name,
                tag_type: tag.tag_type,
                engineering_unit: tag.engineering_unit,
                device_name: tag.device_name,
                project_name: tag.project_name
            },
            measurements: rows,
            query_info: {
                total_count: rows.length,
                limit: parseInt(limit),
                time_range: { start, end }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error getting measurements:', error);
        res.status(500).json({
            error: 'Could not get measurements',
            details: error.message
        });
    }
};

// Create a measurement for a tag (manual entry)
exports.createMeasurement = async (req, res) => {
    try {
        const { tagId } = req.params;
        const { value, timestamp, quality = 'good', source = 'manual' } = req.body;

        console.log('📊 Creating measurement for tag:', tagId, 'value:', value);

        // Verify tag exists and user has access
        const tagCheckQuery = `
            SELECT t.*, d.device_name, p.user_id, p.project_name, d.project_id
            FROM tags t
            JOIN devices d ON t.device_id = d.device_id
            JOIN projects p ON d.project_id = p.id
            WHERE t.tag_id = $1
        `;
        const tagResult = await pool.query(tagCheckQuery, [tagId]);

        if (tagResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        const tag = tagResult.rows[0];

        // Check if user has access to this tag's project
        if (tag.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied to this tag' });
        }

        // Validate value
        if (value === undefined || value === null) {
            return res.status(400).json({ error: 'Value is required' });
        }

        // Check if tag is read-only
        if (tag.read_only) {
            return res.status(400).json({
                error: 'Cannot manually add measurements to read-only tag',
                tag_name: tag.tag_name
            });
        }

        const result = await pool.query(
            `INSERT INTO measurements (device_id, tag_id, value, timestamp, quality, source)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                tag.device_id,
                tagId,
                value,
                timestamp ? new Date(timestamp) : new Date(),
                quality,
                source
            ]
        );

        const measurement = result.rows[0];

        console.log('✅ Created measurement:', measurement.measurement_id);

        // Broadcast via WebSocket if available
        if (global.wsManager) {
            global.wsManager.broadcastMeasurement(tag.project_id, {
                ...measurement,
                tag_name: tag.tag_name,
                device_name: tag.device_name
            });
        }

        res.status(201).json({
            success: true,
            measurement: measurement,
            tag_info: {
                tag_name: tag.tag_name,
                device_name: tag.device_name,
                project_name: tag.project_name
            }
        });
    } catch (error) {
        console.error('❌ Error creating measurement:', error);
        res.status(500).json({
            error: 'Could not create measurement',
            details: error.message
        });
    }
};

// Delete a measurement by ID
exports.deleteMeasurement = async (req, res) => {
    try {
        const { measurementId } = req.params;

        console.log('📊 Deleting measurement:', measurementId);

        // Verify measurement exists and user has access
        const measurementCheckQuery = `
            SELECT m.*, t.tag_name, d.device_name, p.user_id, p.project_name
            FROM measurements m
            JOIN tags t ON m.tag_id = t.tag_id
            JOIN devices d ON t.device_id = d.device_id
            JOIN projects p ON d.project_id = p.id
            WHERE m.measurement_id = $1
        `;
        const measurementResult = await pool.query(measurementCheckQuery, [measurementId]);

        if (measurementResult.rows.length === 0) {
            return res.status(404).json({ error: 'Measurement not found' });
        }

        const measurement = measurementResult.rows[0];

        // Check if user has access to this measurement's project
        if (measurement.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied to this measurement' });
        }

        const result = await pool.query(
            `DELETE FROM measurements WHERE measurement_id = $1 RETURNING *`,
            [measurementId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Measurement not found' });
        }

        console.log('✅ Deleted measurement:', result.rows[0].measurement_id);

        res.json({
            success: true,
            message: 'Measurement deleted successfully',
            deleted: {
                measurement_id: result.rows[0].measurement_id,
                tag_name: measurement.tag_name,
                device_name: measurement.device_name,
                value: result.rows[0].value,
                timestamp: result.rows[0].timestamp
            }
        });
    } catch (error) {
        console.error('❌ Error deleting measurement:', error);
        res.status(500).json({
            error: 'Could not delete measurement',
            details: error.message
        });
    }
};

// ==================== NEW ENHANCED SCADA FUNCTIONS ====================

// 📊 Get current values for all tags in a project (REAL-TIME DASHBOARD)
exports.getCurrentValues = async (req, res) => {
    try {
        const { projectId } = req.params;

        console.log('📊 Getting current values for project:', projectId);

        // Verify project access
        const projectQuery = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.id]
        );

        if (projectQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        const project = projectQuery.rows[0];

        // Get latest value for each tag (DISTINCT ON is PostgreSQL magic!)
        const query = `
            SELECT DISTINCT ON (t.tag_id) 
                t.tag_id,
                t.tag_name,
                t.tag_type,
                t.engineering_unit,
                t.simulation,
                t.read_only,
                t.tag_group,
                d.device_id,
                d.device_name,
                d.device_type,
                m.measurement_id,
                m.value,
                m.timestamp,
                m.quality,
                m.source,
                EXTRACT(EPOCH FROM (NOW() - m.timestamp)) as age_seconds
            FROM tags t
            JOIN devices d ON t.device_id = d.device_id
            LEFT JOIN measurements m ON t.tag_id = m.tag_id
            WHERE d.project_id = $1
            ORDER BY t.tag_id, m.timestamp DESC NULLS LAST
        `;

        const result = await pool.query(query, [projectId]);

        // Format for frontend consumption
        const currentValues = result.rows.map(row => ({
            tag_id: row.tag_id,
            tag_name: row.tag_name,
            tag_type: row.tag_type,
            engineering_unit: row.engineering_unit,
            simulation: row.simulation,
            read_only: row.read_only,
            tag_group: row.tag_group,
            device: {
                device_id: row.device_id,
                device_name: row.device_name,
                device_type: row.device_type
            },
            current_value: {
                measurement_id: row.measurement_id,
                value: row.value,
                timestamp: row.timestamp,
                quality: row.quality || 'unknown',
                source: row.source || 'unknown',
                age_seconds: row.age_seconds ? Math.floor(row.age_seconds) : null,
                is_stale: row.age_seconds > 300, // Stale if older than 5 minutes
                formatted_value: formatValue(row.value, row.engineering_unit, row.tag_type)
            }
        }));

        // Calculate statistics
        const totalTags = currentValues.length;
        const liveTags = currentValues.filter(t => t.current_value.value !== null).length;
        const staleTags = currentValues.filter(t => t.current_value.is_stale).length;
        const simulationTags = currentValues.filter(t => t.simulation).length;

        console.log(`📊 Project ${project.project_name}: ${totalTags} tags, ${liveTags} live, ${staleTags} stale`);

        res.json({
            project_id: parseInt(projectId),
            project_name: project.project_name,
            current_values: currentValues,
            statistics: {
                total_tags: totalTags,
                live_tags: liveTags,
                stale_tags: staleTags,
                simulation_tags: simulationTags,
                live_percentage: totalTags > 0 ? Math.round((liveTags / totalTags) * 100) : 0
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting current values:', error);
        res.status(500).json({
            error: 'Could not get current values',
            details: error.message
        });
    }
};

// 📈 Get time-series data for multiple tags (TRENDING)

// Fixed getTimeSeriesData function in measurementController.js
exports.getTimeSeriesData = async (req, res) => {
    try {
        const { projectId } = req.params;
        const {
            tagIds,
            startTime,
            endTime,
            interval = '1 hour',
            maxPoints = 1000,
            aggregation = 'none' // none, avg, min, max
        } = req.query;

        console.log('📈 Getting time-series data:', { projectId, tagIds, startTime, endTime, aggregation });

        // Verify project access
        const projectQuery = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.id]
        );

        if (projectQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Parse tag IDs
        const tagIdList = tagIds ? tagIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];

        if (tagIdList.length === 0) {
            return res.status(400).json({ error: 'No valid tag IDs provided' });
        }

        // Build time filter with proper timestamp handling
        let timeFilter = '';
        const params = [projectId];
        let paramIndex = 2;

        // ⚠️ FIX: Convert timestamp strings to proper format for PostgreSQL
        if (startTime) {
            // Convert millisecond timestamp to PostgreSQL timestamp
            timeFilter += ` AND m.timestamp >= to_timestamp($${paramIndex}::bigint / 1000)`;
            params.push(startTime); // Keep as string, PostgreSQL will handle the conversion
            paramIndex++;
        }

        if (endTime) {
            timeFilter += ` AND m.timestamp <= to_timestamp($${paramIndex}::bigint / 1000)`;
            params.push(endTime); // Keep as string, PostgreSQL will handle the conversion
            paramIndex++;
        }

        // Add tag IDs to params
        const tagPlaceholders = tagIdList.map((_, index) => `$${paramIndex + index}`).join(',');
        params.push(...tagIdList);

        // Build aggregation query
        let selectClause = 'm.value, m.timestamp, m.quality';
        let groupByClause = '';

        if (aggregation !== 'none') {
            const aggFunc = aggregation.toUpperCase();
            selectClause = `
                ${aggFunc}(m.value) as value,
                date_trunc('${interval}', m.timestamp) as timestamp,
                'aggregated' as quality
            `;
            groupByClause = ` GROUP BY date_trunc('${interval}', m.timestamp), m.tag_id, t.tag_name, t.engineering_unit, d.device_name`;
        }

        const query = `
            SELECT 
                m.tag_id,
                t.tag_name,
                t.engineering_unit,
                d.device_name,
                ${selectClause}
            FROM measurements m
            JOIN tags t ON m.tag_id = t.tag_id
            JOIN devices d ON t.device_id = d.device_id
            WHERE d.project_id = $1
            AND m.tag_id IN (${tagPlaceholders})
            ${timeFilter}
            ${groupByClause}
            ORDER BY ${aggregation !== 'none' ? 'timestamp ASC, m.tag_id' : 'm.timestamp ASC, m.tag_id'}
            LIMIT $${params.length + 1}
        `;

        params.push(maxPoints);

        console.log('📈 Executing query:', query);
        console.log('📈 With params:', params);

        const result = await pool.query(query, params);

        // Group by tag
        const groupedData = {};
        result.rows.forEach(row => {
            if (!groupedData[row.tag_id]) {
                groupedData[row.tag_id] = {
                    tag_id: row.tag_id,
                    tag_name: row.tag_name,
                    engineering_unit: row.engineering_unit,
                    device_name: row.device_name,
                    data_points: []
                };
            }

            groupedData[row.tag_id].data_points.push({
                timestamp: row.timestamp,
                value: row.value,
                quality: row.quality,
                formatted_value: formatValue(row.value, row.engineering_unit)
            });
        });

        console.log(`📈 Retrieved ${result.rows.length} data points for ${Object.keys(groupedData).length} tags`);

        res.json({
            project_id: parseInt(projectId),
            time_series: Object.values(groupedData),
            query_info: {
                start_time: startTime ? new Date(parseInt(startTime)) : null,
                end_time: endTime ? new Date(parseInt(endTime)) : null,
                total_points: result.rows.length,
                max_points: maxPoints,
                aggregation: aggregation,
                interval: interval
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting time-series data:', error);
        res.status(500).json({
            error: 'Could not get time-series data',
            details: error.message
        });
    }
};


// 🔥 Get recent measurements across entire project (ACTIVITY FEED)
exports.getRecentActivity = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { limit = 100, quality, source, deviceId } = req.query;

        console.log('🔥 Getting recent activity for project:', projectId);

        // Verify project access
        const projectQuery = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.id]
        );

        if (projectQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Build filters
        let whereClause = 'WHERE d.project_id = $1';
        const params = [projectId];
        let paramIndex = 2;

        if (quality) {
            whereClause += ` AND m.quality = $${paramIndex}`;
            params.push(quality);
            paramIndex++;
        }

        if (source) {
            whereClause += ` AND m.source = $${paramIndex}`;
            params.push(source);
            paramIndex++;
        }

        if (deviceId) {
            whereClause += ` AND d.device_id = $${paramIndex}`;
            params.push(deviceId);
            paramIndex++;
        }

        const query = `
            SELECT 
                m.measurement_id,
                m.tag_id,
                t.tag_name,
                t.tag_type,
                t.engineering_unit,
                d.device_id,
                d.device_name,
                d.device_type,
                m.value,
                m.timestamp,
                m.quality,
                m.source
            FROM measurements m
            JOIN tags t ON m.tag_id = t.tag_id
            JOIN devices d ON t.device_id = d.device_id
            ${whereClause}
            ORDER BY m.timestamp DESC
            LIMIT $${paramIndex}
        `;

        params.push(parseInt(limit));

        const result = await pool.query(query, params);

        // Format activity data
        const activities = result.rows.map(row => ({
            ...row,
            formatted_value: formatValue(row.value, row.engineering_unit, row.tag_type),
            age_minutes: Math.floor((Date.now() - new Date(row.timestamp).getTime()) / 60000)
        }));

        console.log(`🔥 Found ${activities.length} recent activities`);

        res.json({
            project_id: parseInt(projectId),
            recent_activity: activities,
            query_info: {
                limit: parseInt(limit),
                filters: { quality, source, deviceId },
                count: activities.length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting recent activity:', error);
        res.status(500).json({
            error: 'Could not get recent activity',
            details: error.message
        });
    }
};

// 📊 Get measurement statistics for project
exports.getProjectStatistics = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { timeRange = '24h' } = req.query;

        console.log('📊 Getting project statistics for:', projectId, 'range:', timeRange);

        // Verify project access
        const projectQuery = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.id]
        );

        if (projectQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Calculate time window
        const timeWindows = {
            '1h': '1 hour',
            '6h': '6 hours',
            '24h': '24 hours',
            '7d': '7 days',
            '30d': '30 days'
        };

        const interval = timeWindows[timeRange] || '24 hours';

        const query = `
            SELECT 
                COUNT(*) as total_measurements,
                COUNT(DISTINCT m.tag_id) as active_tags,
                COUNT(DISTINCT d.device_id) as active_devices,
                COUNT(CASE WHEN m.quality = 'good' THEN 1 END) as good_quality,
                COUNT(CASE WHEN m.quality = 'bad' THEN 1 END) as bad_quality,
                COUNT(CASE WHEN m.quality = 'uncertain' THEN 1 END) as uncertain_quality,
                COUNT(CASE WHEN m.source = 'simulation' THEN 1 END) as simulation_data,
                COUNT(CASE WHEN m.source = 'modbus' THEN 1 END) as modbus_data,
                COUNT(CASE WHEN m.source = 'mqtt' THEN 1 END) as mqtt_data,
                COUNT(CASE WHEN m.source = 'manual' THEN 1 END) as manual_data,
                MIN(m.timestamp) as earliest_measurement,
                MAX(m.timestamp) as latest_measurement,
                AVG(EXTRACT(EPOCH FROM (NOW() - m.timestamp))) as avg_age_seconds
            FROM measurements m
            JOIN tags t ON m.tag_id = t.tag_id
            JOIN devices d ON t.device_id = d.device_id
            WHERE d.project_id = $1
            AND m.timestamp >= NOW() - INTERVAL '${interval}'
        `;

        const result = await pool.query(query, [projectId]);
        const stats = result.rows[0];

        // Calculate rates and percentages
        const totalMeasurements = parseInt(stats.total_measurements);
        const goodQuality = parseInt(stats.good_quality);
        const qualityRate = totalMeasurements > 0 ?
            Math.round((goodQuality / totalMeasurements) * 100) : 0;

        // Get total tags in project for coverage calculation
        const totalTagsQuery = `
            SELECT COUNT(*) as total_tags
            FROM tags t
            JOIN devices d ON t.device_id = d.device_id
            WHERE d.project_id = $1
        `;
        const totalTagsResult = await pool.query(totalTagsQuery, [projectId]);
        const totalTags = parseInt(totalTagsResult.rows[0].total_tags);
        const tagCoverage = totalTags > 0 ?
            Math.round((parseInt(stats.active_tags) / totalTags) * 100) : 0;

        console.log(`📊 Project stats: ${totalMeasurements} measurements, ${stats.active_tags}/${totalTags} tags active`);

        res.json({
            project_id: parseInt(projectId),
            time_range: timeRange,
            statistics: {
                measurements: {
                    total: totalMeasurements,
                    avg_per_hour: totalMeasurements > 0 ? Math.round(totalMeasurements / (parseFloat(interval.split(' ')[0]) || 24)) : 0
                },
                coverage: {
                    active_tags: parseInt(stats.active_tags),
                    total_tags: totalTags,
                    active_devices: parseInt(stats.active_devices),
                    tag_coverage_percent: tagCoverage
                },
                quality: {
                    good: parseInt(stats.good_quality),
                    bad: parseInt(stats.bad_quality),
                    uncertain: parseInt(stats.uncertain_quality),
                    quality_rate_percent: qualityRate
                },
                sources: {
                    simulation: parseInt(stats.simulation_data),
                    modbus: parseInt(stats.modbus_data),
                    mqtt: parseInt(stats.mqtt_data),
                    manual: parseInt(stats.manual_data)
                },
                timing: {
                    earliest: stats.earliest_measurement,
                    latest: stats.latest_measurement,
                    avg_age_seconds: stats.avg_age_seconds ? Math.round(parseFloat(stats.avg_age_seconds)) : null,
                    interval: interval
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting project statistics:', error);
        res.status(500).json({
            error: 'Could not get project statistics',
            details: error.message
        });
    }
};

// 🔍 Search measurements across project
exports.searchMeasurements = async (req, res) => {
    try {
        const { projectId } = req.params;
        const {
            query,
            tagName,
            deviceName,
            minValue,
            maxValue,
            startTime,
            endTime,
            limit = 500
        } = req.query;

        console.log('🔍 Searching measurements in project:', projectId);

        // Verify project access
        const projectQuery = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.id]
        );

        if (projectQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Build search query
        let whereClause = 'WHERE d.project_id = $1';
        const params = [projectId];
        let paramIndex = 2;

        if (tagName) {
            whereClause += ` AND t.tag_name ILIKE $${paramIndex}`;
            params.push(`%${tagName}%`);
            paramIndex++;
        }

        if (deviceName) {
            whereClause += ` AND d.device_name ILIKE $${paramIndex}`;
            params.push(`%${deviceName}%`);
            paramIndex++;
        }

        if (minValue !== undefined) {
            whereClause += ` AND m.value >= $${paramIndex}`;
            params.push(parseFloat(minValue));
            paramIndex++;
        }

        if (maxValue !== undefined) {
            whereClause += ` AND m.value <= $${paramIndex}`;
            params.push(parseFloat(maxValue));
            paramIndex++;
        }

        if (startTime) {
            whereClause += ` AND m.timestamp >= to_timestamp($${paramIndex}/1000)`;
            params.push(startTime);
            paramIndex++;
        }

        if (endTime) {
            whereClause += ` AND m.timestamp <= to_timestamp($${paramIndex}/1000)`;
            params.push(endTime);
            paramIndex++;
        }

        const searchQuery = `
            SELECT 
                m.measurement_id,
                m.tag_id,
                t.tag_name,
                t.tag_type,
                t.engineering_unit,
                d.device_id,
                d.device_name,
                m.value,
                m.timestamp,
                m.quality,
                m.source
            FROM measurements m
            JOIN tags t ON m.tag_id = t.tag_id
            JOIN devices d ON t.device_id = d.device_id
            ${whereClause}
            ORDER BY m.timestamp DESC
            LIMIT $${paramIndex}
        `;

        params.push(parseInt(limit));

        const result = await pool.query(searchQuery, params);

        console.log(`🔍 Search found ${result.rows.length} measurements`);

        res.json({
            project_id: parseInt(projectId),
            search_results: result.rows.map(row => ({
                ...row,
                formatted_value: formatValue(row.value, row.engineering_unit, row.tag_type)
            })),
            search_info: {
                criteria: { query, tagName, deviceName, minValue, maxValue, startTime, endTime },
                result_count: result.rows.length,
                limit: parseInt(limit)
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error searching measurements:', error);
        res.status(500).json({
            error: 'Could not search measurements',
            details: error.message
        });
    }
};

// ==================== HELPER FUNCTIONS ====================

// Format value with engineering unit
function formatValue(value, unit, tagType) {
    if (value === null || value === undefined) {
        return 'N/A';
    }

    if (tagType === 'digital' || tagType === 'boolean') {
        return value ? 'ON' : 'OFF';
    }

    if (typeof value === 'number') {
        const formatted = value.toFixed(2);
        return unit ? `${formatted} ${unit}` : formatted;
    }

    return value.toString();
}

console.log('✅ MeasurementController: Enhanced SCADA version loaded successfully');

