// controllers/diagramController.js - ENHANCED WITH ALL ROUTER FUNCTIONALITY
const pool = require('../db');

console.log('🔧 Loading Enhanced Diagram Controller...');

// ============================================================================
// MAIN DIAGRAM OPERATIONS
// ============================================================================

// Get diagram for a project
exports.getDiagramByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        console.log('📊 Controller: Getting diagram for project:', projectId);

        const result = await pool.query(
            'SELECT * FROM diagrams WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 1',
            [projectId]
        );

        if (result.rows.length === 0) {
            console.log('📊 Controller: No diagram found, returning empty structure');
            return res.json({
                diagram_json: [],
                elements: [],
                metadata: {
                    version: "1.0",
                    created_at: new Date().toISOString(),
                    has_tag_bindings: false,
                    elements_count: 0
                }
            });
        }

        const diagram = result.rows[0];
        let diagramData = [];

        if (diagram.diagram_json) {
            try {
                if (typeof diagram.diagram_json === 'string') {
                    diagramData = JSON.parse(diagram.diagram_json);
                } else if (Array.isArray(diagram.diagram_json)) {
                    diagramData = diagram.diagram_json;
                } else {
                    diagramData = [];
                }
            } catch (parseError) {
                console.error('❌ Controller: Error parsing diagram JSON:', parseError);
                diagramData = [];
            }
        }

        // Enhance elements with current tag values
        const enhancedElements = await enhanceElementsWithTagData(diagramData, projectId);

        console.log('✅ Controller: Diagram found with', enhancedElements.length, 'elements');

        res.json({
            diagram_id: diagram.id,
            project_id: diagram.project_id,
            diagram_name: diagram.name,
            diagram_json: enhancedElements,
            created_at: diagram.created_at,
            updated_at: diagram.updated_at,
            metadata: {
                version: "2.0",
                elements_count: enhancedElements.length,
                linked_elements: enhancedElements.filter(el => el.linkedTag).length,
                has_tag_bindings: enhancedElements.some(el => el.linkedTag),
                last_updated: diagram.updated_at
            }
        });

    } catch (error) {
        console.error('❌ Controller: Error fetching diagram:', error);
        res.status(500).json({
            error: 'Could not fetch diagram',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Save or update diagram for a project - ENHANCED VERSION
exports.saveDiagramForProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { diagram_json, diagram_name, name, metadata } = req.body;

        console.log('📊 Controller: === SAVE DIAGRAM REQUEST ===');
        console.log('   Project ID:', projectId);
        console.log('   Body keys:', Object.keys(req.body));
        console.log('   diagram_json type:', typeof diagram_json);
        console.log('   diagram_json is array:', Array.isArray(diagram_json));
        console.log('   Elements count:', diagram_json?.length || 0);

        // Validate diagram data
        if (!diagram_json) {
            console.log('❌ Controller: Missing diagram_json');
            return res.status(400).json({
                error: 'diagram_json is required',
                received_keys: Object.keys(req.body)
            });
        }

        if (!Array.isArray(diagram_json)) {
            console.log('❌ Controller: diagram_json is not an array:', typeof diagram_json);
            return res.status(400).json({
                error: 'diagram_json must be an array of elements',
                received_type: typeof diagram_json,
                received_value: diagram_json
            });
        }

        console.log('✅ Controller: Validation passed');

        const diagramName = diagram_name || name || 'SCADA Process Diagram';
        const projectIdInt = parseInt(projectId);

        if (isNaN(projectIdInt)) {
            return res.status(400).json({
                error: 'Invalid project ID',
                received: projectId
            });
        }

        console.log('📊 Controller: Saving diagram:', {
            projectId: projectIdInt,
            name: diagramName,
            elements: diagram_json.length
        });

        // Enhanced metadata
        const enhancedMetadata = {
            version: "3.0",
            saved_at: new Date().toISOString(),
            elements_count: diagram_json.length,
            linked_elements: diagram_json.filter(el => el.linkedTag).length,
            has_data_bindings: diagram_json.some(el => el.linkedTag),
            symbol_types: [...new Set(diagram_json.map(el => el.key || el.type))],
            tag_bindings: diagram_json
                .filter(el => el.linkedTag)
                .map(el => ({
                    element_id: el.id,
                    element_type: el.type || el.key,
                    linked_tag: el.linkedTag,
                    element_name: el.displayName || el.name
                })),
            ...metadata
        };

        // Save to database with UPSERT
        const result = await pool.query(
            `INSERT INTO diagrams (project_id, diagram_json, name, created_at, updated_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (project_id) 
             DO UPDATE SET
                diagram_json = EXCLUDED.diagram_json,
                name = EXCLUDED.name,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [projectIdInt, JSON.stringify(diagram_json), diagramName]
        );

        if (result.rows.length === 0) {
            throw new Error('No rows returned from database insert/update');
        }

        const savedDiagram = result.rows[0];
        console.log('✅ Controller: Diagram saved successfully, ID:', savedDiagram.id);

        // Broadcast diagram update to WebSocket clients
        try {
            if (global.wsManager) {
                global.wsManager.broadcastToProject(projectId, {
                    type: 'diagram_updated',
                    projectId: projectIdInt,
                    data: {
                        elements_count: diagram_json.length,
                        linked_elements: enhancedMetadata.linked_elements,
                        updated_at: savedDiagram.updated_at,
                        metadata: enhancedMetadata
                    },
                    timestamp: new Date().toISOString()
                });
                console.log('📡 Controller: WebSocket broadcast sent');
            }
        } catch (wsError) {
            console.log('⚠️ Controller: WebSocket broadcast failed:', wsError.message);
        }

        res.json({
            success: true,
            message: 'Diagram saved successfully',
            diagram: {
                ...savedDiagram,
                metadata: enhancedMetadata
            },
            stats: {
                elements_count: diagram_json.length,
                linked_elements: enhancedMetadata.linked_elements,
                symbol_types: enhancedMetadata.symbol_types
            }
        });

    } catch (error) {
        console.error('❌ Controller: Error saving diagram:', error);
        res.status(500).json({
            error: 'Could not save diagram',
            details: error.message,
            timestamp: new Date().toISOString(),
            debug_info: {
                received_keys: Object.keys(req.body || {}),
                project_id: req.params.projectId,
                diagram_json_type: typeof req.body?.diagram_json,
                diagram_json_length: Array.isArray(req.body?.diagram_json) ? req.body.diagram_json.length : 'N/A'
            }
        });
    }
};

// ============================================================================
// TAG LINKING OPERATIONS - ENHANCED FROM ROUTER
// ============================================================================

// Link tag to diagram element - ENHANCED VERSION WITH AUTO-SAVE DETECTION
exports.linkTagToElement = async (req, res) => {
    console.log('🔗 Controller: === STARTING LINK TAG PROCESS ===');

    try {
        const { projectId, elementId } = req.params;
        const { tag_name, display_settings } = req.body;

        console.log('🔗 Controller: STEP 1: Parameters received');
        console.log('   Project:', projectId);
        console.log('   Element:', elementId);
        console.log('   Tag:', tag_name);

        if (!tag_name) {
            console.log('❌ Controller: STEP 1 FAILED: Missing tag_name');
            return res.status(400).json({
                error: 'tag_name is required',
                received: req.body
            });
        }

        console.log('✅ Controller: STEP 1 COMPLETE: Parameters validated');

        // STEP 2: Verify tag exists
        console.log('🔗 Controller: STEP 2: Verifying tag exists...');

        const tagQuery = `
            SELECT t.*, d.device_name, d.device_type
            FROM tags t
            JOIN devices d ON t.device_id = d.device_id
            WHERE t.tag_name = $1 AND d.project_id = $2
        `;

        const tagResult = await pool.query(tagQuery, [tag_name, projectId]);

        console.log('🔗 Controller: STEP 2b: Tag query result:');
        console.log('   Rows found:', tagResult.rows.length);

        if (tagResult.rows.length === 0) {
            console.log('❌ Controller: STEP 2 FAILED: Tag not found');
            return res.status(404).json({
                error: 'Tag not found in this project',
                tag_name: tag_name,
                project_id: projectId
            });
        }

        const tag = tagResult.rows[0];
        console.log('✅ Controller: STEP 2 COMPLETE: Tag found:', tag.tag_name);

        // STEP 3: Get current diagram
        console.log('🔗 Controller: STEP 3: Getting current diagram...');

        const diagramResult = await pool.query('SELECT diagram_json FROM diagrams WHERE project_id = $1', [projectId]);

        console.log('🔗 Controller: STEP 3b: Diagram query result:');
        console.log('   Rows found:', diagramResult.rows.length);

        if (diagramResult.rows.length === 0) {
            console.log('❌ Controller: STEP 3 FAILED: No diagram found');
            return res.status(404).json({
                error: 'No diagram found for this project. Please save your diagram first.',
                project_id: projectId,
                suggestion: 'Create elements in the diagram editor and click Save, then try linking tags again.'
            });
        }

        let elements = diagramResult.rows[0].diagram_json || [];

        if (typeof elements === 'string') {
            console.log('🔗 Controller: STEP 3d: Parsing JSON string...');
            try {
                elements = JSON.parse(elements);
            } catch (parseError) {
                console.log('❌ Controller: STEP 3 FAILED: JSON parse error:', parseError);
                return res.status(500).json({
                    error: 'Invalid diagram data format',
                    parse_error: parseError.message
                });
            }
        }

        console.log('✅ Controller: STEP 3 COMPLETE: Diagram loaded with', elements.length, 'elements');

        if (elements.length === 0) {
            console.log('❌ Controller: STEP 3 WARNING: Diagram has no elements');
            return res.status(404).json({
                error: 'Diagram has no elements to link tags to',
                suggestion: 'Add elements (tanks, pumps, etc.) to your diagram first, save it, then try linking tags.',
                project_id: projectId,
                elements_count: 0
            });
        }

        // STEP 4: Find element
        console.log('🔗 Controller: STEP 4: Finding element in diagram...');
        console.log('   Looking for element ID:', elementId);
        console.log('   Available elements:', elements.map(el => ({
            id: el.id,
            type: el.type || el.key,
            name: el.displayName || el.name
        })));

        const elementIndex = elements.findIndex(el => el.id === elementId);

        if (elementIndex === -1) {
            console.log('❌ Controller: STEP 4 FAILED: Element not found');
            return res.status(404).json({
                error: 'Element not found in diagram',
                element_id: elementId,
                available_elements: elements.map(el => ({
                    id: el.id,
                    type: el.type || el.key,
                    name: el.displayName || el.name
                })),
                suggestion: 'The element may have been deleted or the diagram not saved. Please refresh and try again.'
            });
        }

        console.log('✅ Controller: STEP 4 COMPLETE: Element found at index', elementIndex);

        // STEP 5: Check for existing links
        const existingLink = elements.find(el => el.linkedTag === tag_name && el.id !== elementId);

        if (existingLink) {
            console.log('❌ Controller: STEP 5 FAILED: Tag already linked');
            return res.status(400).json({
                error: `Tag "${tag_name}" is already linked to another element`,
                existing_element: existingLink.displayName || existingLink.id
            });
        }

        console.log('✅ Controller: STEP 5 COMPLETE: No conflicting links found');

        // STEP 6: Link the tag
        console.log('🔗 Controller: STEP 6: Linking tag to element...');

        elements[elementIndex] = {
            ...elements[elementIndex],
            linkedTag: tag_name,
            linkedTagId: tag.tag_id,
            tagType: tag.tag_type,
            engineeringUnit: tag.engineering_unit,
            displaySettings: {
                showValue: true,
                showUnit: true,
                showAlarmStatus: true,
                ...display_settings
            },
            linked_at: new Date().toISOString()
        };

        console.log('✅ Controller: STEP 6 COMPLETE: Element updated locally');

        // STEP 7: Save to database
        console.log('🔗 Controller: STEP 7: Saving updated diagram to database...');

        const updateResult = await pool.query(
            'UPDATE diagrams SET diagram_json = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2',
            [JSON.stringify(elements), projectId]
        );

        if (updateResult.rowCount === 0) {
            console.log('❌ Controller: STEP 7 FAILED: No rows updated');
            return res.status(500).json({
                error: 'Failed to update diagram in database'
            });
        }

        console.log('✅ Controller: STEP 7 COMPLETE: Database updated successfully');

        // STEP 8: WebSocket broadcast
        try {
            if (global.wsManager) {
                global.wsManager.broadcastToProject(projectId, {
                    type: 'tag_linked',
                    projectId: parseInt(projectId),
                    data: {
                        element_id: elementId,
                        tag_name: tag_name,
                        tag_info: tag,
                        element: elements[elementIndex]
                    },
                    timestamp: new Date().toISOString()
                });
                console.log('✅ Controller: STEP 8 COMPLETE: WebSocket broadcast sent');
            }
        } catch (wsError) {
            console.log('⚠️ Controller: STEP 8 WARNING: WebSocket broadcast failed:', wsError.message);
        }

        // STEP 9: Send success response
        const response = {
            success: true,
            message: `Tag "${tag_name}" linked successfully to element`,
            element: elements[elementIndex],
            tag_info: tag,
            timestamp: new Date().toISOString()
        };

        res.json(response);

        console.log('✅ Controller: STEP 9 COMPLETE: Success response sent');
        console.log('🎉 Controller: === LINK TAG PROCESS COMPLETED SUCCESSFULLY ===');

    } catch (error) {
        console.log('❌ Controller: === LINK TAG PROCESS FAILED ===');
        console.error('❌ Controller: CRITICAL ERROR:', error);

        if (!res.headersSent) {
            res.status(500).json({
                error: 'Could not link tag to element',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
};

// Unlink tag from diagram element
exports.unlinkTagFromElement = async (req, res) => {
    try {
        const { projectId, elementId } = req.params;

        console.log('🔗 Controller: Unlinking tag from element:', elementId);

        const diagramResult = await pool.query(
            'SELECT diagram_json FROM diagrams WHERE project_id = $1',
            [projectId]
        );

        if (diagramResult.rows.length === 0) {
            return res.status(404).json({ error: 'Diagram not found' });
        }

        let elements = diagramResult.rows[0].diagram_json || [];
        if (typeof elements === 'string') {
            elements = JSON.parse(elements);
        }

        const elementIndex = elements.findIndex(el => el.id === elementId);
        if (elementIndex === -1) {
            return res.status(404).json({ error: 'Element not found' });
        }

        const oldTagName = elements[elementIndex].linkedTag;

        elements[elementIndex] = {
            ...elements[elementIndex],
            linkedTag: null,
            linkedTagId: null,
            tagType: null,
            engineeringUnit: null,
            displaySettings: null,
            unlinked_at: new Date().toISOString()
        };

        await pool.query(
            'UPDATE diagrams SET diagram_json = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2',
            [JSON.stringify(elements), projectId]
        );

        console.log('✅ Controller: Tag unlinked successfully:', oldTagName);

        // Broadcast unlink event
        if (global.wsManager) {
            global.wsManager.broadcastToProject(projectId, {
                type: 'tag_unlinked',
                projectId: parseInt(projectId),
                data: {
                    element_id: elementId,
                    old_tag_name: oldTagName,
                    element: elements[elementIndex]
                },
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Tag unlinked successfully',
            old_tag_name: oldTagName,
            element: elements[elementIndex],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller: Error unlinking tag:', error);
        res.status(500).json({
            error: 'Could not unlink tag',
            details: error.message
        });
    }
};

// ============================================================================
// ELEMENT OPERATIONS
// ============================================================================

// Get diagram elements with tag data
exports.getDiagramElements = async (req, res) => {
    try {
        const { projectId } = req.params;

        console.log('📊 Controller: Getting diagram elements for project:', projectId);

        const result = await pool.query(
            'SELECT diagram_json FROM diagrams WHERE project_id = $1',
            [projectId]
        );

        let elements = [];
        if (result.rows.length > 0) {
            elements = result.rows[0].diagram_json || [];
            if (typeof elements === 'string') {
                elements = JSON.parse(elements);
            }
        }

        // Enhance with real-time tag data
        const enhancedElements = await enhanceElementsWithTagData(elements, projectId);

        res.json({
            elements: enhancedElements,
            project_id: parseInt(projectId),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Controller: Error fetching diagram elements:', error);
        res.status(500).json({
            error: 'Could not fetch diagram elements',
            details: error.message
        });
    }
};

// Update specific diagram element
exports.updateDiagramElement = async (req, res) => {
    try {
        const { projectId, elementId } = req.params;
        const updateData = req.body;

        console.log('🔧 Controller: Updating element:', elementId);

        // Get current diagram
        const diagramResult = await pool.query(
            'SELECT diagram_json FROM diagrams WHERE project_id = $1',
            [projectId]
        );

        if (diagramResult.rows.length === 0) {
            return res.status(404).json({ error: 'Diagram not found' });
        }

        let elements = diagramResult.rows[0].diagram_json || [];
        if (typeof elements === 'string') {
            elements = JSON.parse(elements);
        }

        // Find and update element
        const elementIndex = elements.findIndex(el => el.id === elementId);
        if (elementIndex === -1) {
            return res.status(404).json({ error: 'Element not found' });
        }

        // Update element properties
        elements[elementIndex] = {
            ...elements[elementIndex],
            ...updateData,
            updated_at: new Date().toISOString()
        };

        // Save back to database
        await pool.query(
            'UPDATE diagrams SET diagram_json = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2',
            [JSON.stringify(elements), projectId]
        );

        // Get updated element with tag data
        const updatedElement = await enhanceElementWithTagData(elements[elementIndex], projectId);

        console.log(`✅ Controller: Updated diagram element ${elementId} in project ${projectId}`);

        // Broadcast update
        if (global.wsManager) {
            global.wsManager.broadcastToProject(projectId, {
                type: 'element_updated',
                projectId: parseInt(projectId),
                data: {
                    element_id: elementId,
                    element: updatedElement,
                    updated_properties: Object.keys(updateData)
                },
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            element: updatedElement,
            message: 'Element updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Controller: Error updating diagram element:', error);
        res.status(500).json({
            error: 'Could not update diagram element',
            details: error.message
        });
    }
};

// ============================================================================
// TAG OPERATIONS
// ============================================================================

// Get tag suggestions for element type - ENHANCED FROM ROUTER
exports.getTagSuggestions = async (req, res) => {
    try {
        const { projectId, elementType } = req.params;
        console.log('🏷️ Controller: Getting tag suggestions for', elementType, 'in project', projectId);

        const tagsQuery = `
            SELECT
                t.tag_id,
                t.tag_name,
                t.tag_type,
                t.engineering_unit,
                t.simulation,
                d.device_id,
                d.device_name,
                d.device_type,
                (
                    SELECT m.value
                    FROM measurements m
                    WHERE m.tag_id = t.tag_id
                    ORDER BY m.timestamp DESC
                    LIMIT 1
                ) as current_value
            FROM tags t
                JOIN devices d ON t.device_id = d.device_id
            WHERE d.project_id = $1
            ORDER BY t.tag_name
        `;

        const result = await pool.query(tagsQuery, [projectId]);

        // Check which tags are already linked
        let linkedTags = [];
        try {
            const diagramResult = await pool.query(
                'SELECT diagram_json FROM diagrams WHERE project_id = $1',
                [projectId]
            );

            if (diagramResult.rows.length > 0) {
                let elements = diagramResult.rows[0].diagram_json || [];
                if (typeof elements === 'string') {
                    elements = JSON.parse(elements);
                }
                linkedTags = elements
                    .filter(el => el.linkedTag)
                    .map(el => el.linkedTag);
            }
        } catch (linkError) {
            console.log('⚠️ Controller: Could not check linked tags:', linkError.message);
        }

        const suggestions = result.rows.map(tag => {
            const tagName = tag.tag_name.toLowerCase();
            const type = elementType.toLowerCase();

            let compatibility_score = 50;
            let suggestion_reason = `Compatible with ${elementType}`;

            // Calculate compatibility
            if (tagName.includes(type)) {
                compatibility_score += 30;
                suggestion_reason = `Tag name contains "${type}"`;
            } else if (type === 'tank' && tagName.includes('level')) {
                compatibility_score += 25;
                suggestion_reason = 'Level measurement suitable for tank';
            } else if (type === 'pump' && (tagName.includes('speed') || tagName.includes('rpm'))) {
                compatibility_score += 25;
                suggestion_reason = 'Speed measurement suitable for pump';
            } else if (type === 'sensor' && tag.tag_type === 'analog') {
                compatibility_score += 20;
                suggestion_reason = 'Analog measurement suitable for sensor';
            }

            return {
                tag_id: tag.tag_id,
                tag_name: tag.tag_name,
                tag_type: tag.tag_type,
                engineering_unit: tag.engineering_unit,
                device_name: tag.device_name,
                device_type: tag.device_type,
                current_value: tag.current_value,
                simulation: tag.simulation,
                is_linked: linkedTags.includes(tag.tag_name),
                compatibility_score: Math.min(100, compatibility_score),
                suggestion_reason: suggestion_reason
            };
        });

        console.log('✅ Controller: Found', suggestions.length, 'tag suggestions');

        res.json({
            element_type: elementType,
            project_id: parseInt(projectId),
            suggestions: suggestions,
            total_suggestions: suggestions.length,
            available_suggestions: suggestions.filter(s => !s.is_linked).length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller: Error getting tag suggestions:', error);
        res.status(500).json({
            error: 'Could not get tag suggestions',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Get real-time data for diagram
exports.getDiagramRealTimeData = async (req, res) => {
    try {
        const { projectId } = req.params;

        console.log('📊 Controller: Getting real-time data for project:', projectId);

        // Get diagram elements
        const diagramResult = await pool.query(
            'SELECT diagram_json FROM diagrams WHERE project_id = $1',
            [projectId]
        );

        if (diagramResult.rows.length === 0) {
            return res.json({ realtime_data: {}, linked_tags: [] });
        }

        let elements = diagramResult.rows[0].diagram_json || [];
        if (typeof elements === 'string') {
            elements = JSON.parse(elements);
        }

        // Get linked tags
        const linkedTags = elements
            .filter(el => el.linkedTag)
            .map(el => el.linkedTag);

        if (linkedTags.length === 0) {
            return res.json({ realtime_data: {}, linked_tags: [] });
        }

        // Get current values for linked tags
        const query = `
            SELECT DISTINCT ON (t.tag_name)
                t.tag_name,
                t.tag_type,
                t.engineering_unit,
                m.value,
                m.timestamp,
                m.quality,
                d.device_name,
                d.status as device_status
            FROM tags t
            JOIN devices d ON t.device_id = d.device_id
            LEFT JOIN measurements m ON t.tag_id = m.tag_id
            WHERE d.project_id = $1 
              AND t.tag_name = ANY($2)
            ORDER BY t.tag_name, m.timestamp DESC NULLS LAST
        `;

        const result = await pool.query(query, [projectId, linkedTags]);

        // Format real-time data
        const realtimeData = {};
        result.rows.forEach(row => {
            realtimeData[row.tag_name] = {
                value: row.value,
                timestamp: row.timestamp,
                quality: row.quality || 'UNKNOWN',
                engineering_unit: row.engineering_unit,
                tag_type: row.tag_type,
                device_name: row.device_name,
                device_status: row.device_status,
                status: row.device_status === 'online' && row.value !== null ? 'GOOD' : 'BAD'
            };
        });

        res.json({
            realtime_data: realtimeData,
            linked_tags: linkedTags,
            project_id: parseInt(projectId),
            timestamp: new Date().toISOString(),
            data_freshness: 'live'
        });
    } catch (error) {
        console.error('❌ Controller: Error getting diagram real-time data:', error);
        res.status(500).json({ error: 'Could not get real-time data' });
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper function to enhance elements with tag data
async function enhanceElementsWithTagData(elements, projectId) {
    if (!Array.isArray(elements) || elements.length === 0) {
        return elements;
    }

    const linkedTags = elements
        .filter(el => el.linkedTag)
        .map(el => el.linkedTag);

    if (linkedTags.length === 0) {
        return elements;
    }

    try {
        // Get current tag values
        const query = `
            SELECT DISTINCT ON (t.tag_name)
                t.tag_name,
                t.tag_type,
                t.engineering_unit,
                m.value,
                m.timestamp,
                m.quality,
                d.device_name,
                d.status as device_status
            FROM tags t
            JOIN devices d ON t.device_id = d.device_id
            LEFT JOIN measurements m ON t.tag_id = m.tag_id
            WHERE d.project_id = $1 
              AND t.tag_name = ANY($2)
            ORDER BY t.tag_name, m.timestamp DESC NULLS LAST
        `;

        const result = await pool.query(query, [projectId, linkedTags]);

        // Create tag data lookup
        const tagData = {};
        result.rows.forEach(row => {
            tagData[row.tag_name] = {
                current_value: row.value,
                timestamp: row.timestamp,
                quality: row.quality || 'UNKNOWN',
                engineering_unit: row.engineering_unit,
                tag_type: row.tag_type,
                device_name: row.device_name,
                device_status: row.device_status,
                status: row.device_status === 'online' && row.value !== null ? 'GOOD' : 'BAD'
            };
        });

        // Enhance elements
        return elements.map(element => {
            if (element.linkedTag && tagData[element.linkedTag]) {
                return {
                    ...element,
                    realtime_data: tagData[element.linkedTag],
                    has_live_data: true
                };
            }
            return {
                ...element,
                has_live_data: false
            };
        });
    } catch (error) {
        console.error('❌ Controller: Error enhancing elements with tag data:', error);
        return elements;
    }
}

// Helper function to enhance single element
async function enhanceElementWithTagData(element, projectId) {
    const enhanced = await enhanceElementsWithTagData([element], projectId);
    return enhanced[0] || element;
}

console.log('✅ Enhanced Diagram Controller loaded successfully');
console.log('🔧 Features: Enhanced save, detailed logging, proper error handling, WebSocket integration');