const pool = require('../db');

// Get diagram for a project
exports.getDiagramByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const result = await pool.query(
            'SELECT * FROM diagrams WHERE project_id = $1 LIMIT 1',
            [projectId]
        );
        if (result.rows.length === 0) {
            // Return an empty diagram if none exists yet
            return res.json({ diagram_json: null });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch diagram' });
    }
};

// Save or update diagram for a project (upsert)
exports.saveDiagramForProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { diagram_json, name } = req.body;

        // **THIS IS THE FIX**: Stringify the diagram_json before storing in Postgres
        const result = await pool.query(
            `
                INSERT INTO diagrams (project_id, diagram_json, name, updated_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                    ON CONFLICT (project_id) DO UPDATE
                                                    SET diagram_json = $2, name = $3, updated_at = CURRENT_TIMESTAMP
                                                    RETURNING *
            `,
            [projectId, JSON.stringify(diagram_json), name || 'Main Diagram']
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not save diagram' });
    }
};
