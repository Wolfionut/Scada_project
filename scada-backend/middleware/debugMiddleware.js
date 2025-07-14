// middleware/debugMiddleware.js - Enhanced debugging for diagrams
const debugMiddleware = (req, res, next) => {
    // Enhanced logging for diagram operations
    if (req.path.includes('/diagrams')) {
        console.log('🔧 DIAGRAM REQUEST:', {
            method: req.method,
            path: req.path,
            params: req.params,
            query: req.query,
            body: req.method !== 'GET' ? {
                keys: Object.keys(req.body || {}),
                diagram_json_type: typeof req.body?.diagram_json,
                diagram_json_length: Array.isArray(req.body?.diagram_json) ? req.body.diagram_json.length : 'N/A',
                has_tag_name: !!req.body?.tag_name
            } : undefined,
            timestamp: new Date().toISOString()
        });
    }

    // Enhanced error handling
    const originalJson = res.json;
    res.json = function(body) {
        if (req.path.includes('/diagrams')) {
            console.log('🔧 DIAGRAM RESPONSE:', {
                status: res.statusCode,
                path: req.path,
                success: body?.success !== false && res.statusCode < 400,
                elements_count: body?.diagram_json?.length || body?.elements?.length || body?.stats?.elements_count,
                linked_elements: body?.stats?.linked_elements || body?.metadata?.linked_elements,
                error: body?.error,
                timestamp: new Date().toISOString()
            });
        }
        return originalJson.call(this, body);
    };

    next();
};

// Error boundary middleware
const errorBoundaryMiddleware = (err, req, res, next) => {
    console.error('❌ MIDDLEWARE ERROR:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Send a structured error response
    res.status(err.status || 500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        suggestion: req.path.includes('/diagrams') ?
            'Check if diagram exists and elements are properly saved' :
            'Check server logs for more details'
    });
};

module.exports = {
    debugMiddleware,
    errorBoundaryMiddleware
};