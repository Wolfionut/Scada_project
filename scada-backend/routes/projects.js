const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const projectController = require('../controllers/projectController');

// Protect all project routes
router.use(authenticateToken);

router.get('/', projectController.getAllProjects);
router.post('/', projectController.createProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

module.exports = router;
