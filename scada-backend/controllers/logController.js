const pool = require('../db');

// List logs for the current user (latest first)
exports.getLogs = async (req, res) => {
    try {
        // Only get logs for the current user
        const result = await pool.query(
            'SELECT * FROM logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create (insert) a log
exports.createLog = async (req, res) => {
    const { action, details } = req.body;
    if (!action) return res.status(400).json({ error: 'Action is required' });

    try {
        const result = await pool.query(
            'INSERT INTO logs (user_id, action, details) VALUES ($1, $2, $3) RETURNING *',
            [req.user.id, action, details || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// (Optional) Delete a log by ID
exports.deleteLog = async (req, res) => {
    const { logId } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM logs WHERE id = $1 AND user_id = $2 RETURNING *',
            [logId, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Log not found' });
        res.json({ message: 'Log deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
