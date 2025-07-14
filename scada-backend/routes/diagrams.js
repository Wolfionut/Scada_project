// routes/diagrams.js - REFACTORED TO USE CONTROLLER PROPERLY
const express = require('express');
const router = express.Router();
const diagramController = require('../controllers/diagramController');

console.log('🔧 Loading diagrams router with proper controller integration...');

// Import auth middleware with fallback
let authenticateToken;
try {
    authenticateToken = require('../middleware/auth');
    console.log('✅ Auth middleware loaded');
} catch (error) {
    console.error('❌ Could not load auth middleware:', error.message);
    authenticateToken = (req, res, next) => {
        console.log('⚠️ Using fallback auth for:', req.method, req.path);
        req.user = { id: 1, username: 'dev-user' };
        next();
    };
}

// Debug middleware
router.use((req, res, next) => {
    console.log('🔧 Diagrams route:', req.method, req.path);
    next();
});

// Apply authentication
router.use(authenticateToken);

// ============================================================================
// MAIN DIAGRAM ROUTES - NOW USING CONTROLLER
// ============================================================================

// Get diagram for project
router.get('/project/:projectId', diagramController.getDiagramByProject);

// Save diagram for project
router.post('/project/:projectId', diagramController.saveDiagramForProject);

// Get tag suggestions for element type
router.get('/project/:projectId/tag-suggestions/:elementType', diagramController.getTagSuggestions);

// Link tag to diagram element
router.post('/project/:projectId/elements/:elementId/link-tag', diagramController.linkTagToElement);

// Unlink tag from diagram element
router.delete('/project/:projectId/elements/:elementId/unlink-tag', diagramController.unlinkTagFromElement);

// Get diagram elements
router.get('/project/:projectId/elements', diagramController.getDiagramElements);

// Update diagram element
router.put('/project/:projectId/elements/:elementId', diagramController.updateDiagramElement);

// Get real-time data for diagram
router.get('/project/:projectId/realtime-data', diagramController.getDiagramRealTimeData);

// ============================================================================
// UTILITY ROUTES
// ============================================================================

// Test routes
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Diagrams routes working with controller integration!',
        timestamp: new Date().toISOString(),
        architecture: 'router + controller pattern'
    });
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'diagrams-api',
        architecture: 'router + controller',
        timestamp: new Date().toISOString(),
        routes: {
            'GET /project/:projectId': 'Get diagram → diagramController.getDiagramByProject',
            'POST /project/:projectId': 'Save diagram → diagramController.saveDiagramForProject',
            'GET /project/:projectId/tag-suggestions/:elementType': 'Get tag suggestions → diagramController.getTagSuggestions',
            'POST /project/:projectId/elements/:elementId/link-tag': 'Link tag → diagramController.linkTagToElement',
            'DELETE /project/:projectId/elements/:elementId/unlink-tag': 'Unlink tag → diagramController.unlinkTagFromElement',
            'GET /project/:projectId/elements': 'Get elements → diagramController.getDiagramElements',
            'PUT /project/:projectId/elements/:elementId': 'Update element → diagramController.updateDiagramElement',
            'GET /project/:projectId/realtime-data': 'Get realtime data → diagramController.getDiagramRealTimeData'
        }
    });
});

console.log('✅ Diagrams routes loaded with proper controller integration');
module.exports = router;