// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'scada_db',
    password: 'Ionutdan123@',
    port: 5432,
});

module.exports = pool;
