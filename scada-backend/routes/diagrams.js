const express = require('express');
const router = express.Router();
const diagramController = require('../controllers/diagramController');
const authenticateToken  = require('../middleware/auth'); // <--- Correct

router.use(authenticateToken);

router.get('/project/:projectId', diagramController.getDiagramByProject);
router.post('/project/:projectId', diagramController.saveDiagramForProject);

module.exports = router;
