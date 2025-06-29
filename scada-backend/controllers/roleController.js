const pool = require('../db');

// List all roles (for dropdowns or admin use)
exports.getRoles = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM roles ORDER BY role_name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// List all users and their roles (admin only)
exports.getUsers = async (req, res) => {
    if (req.user.role !== 'admin')
        return res.status(403).json({ error: 'Admins only' });

    try {
        const result = await pool.query(
            'SELECT id, username, email, role, full_name, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Change a user's role (admin only)
exports.changeUserRole = async (req, res) => {
    if (req.user.role !== 'admin')
        return res.status(403).json({ error: 'Admins only' });

    const { userId } = req.params;
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required' });

    try {
        // Optionally, check if role exists in roles table
        const roleCheck = await pool.query('SELECT * FROM roles WHERE role_name = $1', [role]);
        if (roleCheck.rows.length === 0)
            return res.status(400).json({ error: 'Role does not exist' });

        const result = await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role',
            [role, userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
