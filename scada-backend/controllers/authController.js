const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { username, email, password, full_name } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing fields.' });
    }

    try {
        const hashed = await bcrypt.hash(password, 10);

        const userCheck = await pool.query('SELECT id FROM users WHERE username=$1 OR email=$2', [username, email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists.' });
        }

        const result = await pool.query(
            `INSERT INTO users (username, email, password, full_name) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at`,
            [username, email, hashed, full_name || null]
        );
        res.status(201).json({ user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields.' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'User not found.' });

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Wrong password.' });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                full_name: user.full_name,
                created_at: user.created_at,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
