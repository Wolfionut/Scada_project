const pool = require('../db');

// List all projects for the current user
exports.getAllProjects = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create new project for the current user
exports.createProject = async (req, res) => {
    const { project_name } = req.body;
    if (!project_name) return res.status(400).json({ error: 'Project name required' });

    try {
        const result = await pool.query(
            'INSERT INTO projects (user_id, project_name) VALUES ($1, $2) RETURNING *',
            [req.user.id, project_name]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update project (only owner can update)
exports.updateProject = async (req, res) => {
    const projectId = req.params.id;
    const { project_name } = req.body;
    if (!project_name) return res.status(400).json({ error: 'Project name required' });

    try {
        // Update only if the project belongs to this user
        const result = await pool.query(
            'UPDATE projects SET project_name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [project_name, projectId, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete project (only owner can delete)
exports.deleteProject = async (req, res) => {
    const projectId = req.params.id;
    try {
        const result = await pool.query(
            'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *',
            [projectId, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
        res.json({ message: 'Project deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
