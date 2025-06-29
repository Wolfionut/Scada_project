const express = require('express');

console.log('Starting minimal server...');

const app = express();

// Just basic middleware
app.use(express.json());

// Simple route
app.get('/test', (req, res) => {
    res.json({ message: 'Test server working!' });
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
    console.log(`Try: curl http://localhost:${PORT}/test`);
});