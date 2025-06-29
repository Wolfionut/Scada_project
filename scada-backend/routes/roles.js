const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const roleController = require('../controllers/roleController');

// All routes are protected
router.use(authenticateToken);

// Get all roles (for dropdowns etc.)
router.get('/', roleController.getRoles);

// Get all users and their roles (admin only)
router.get('/users', roleController.getUsers);

// Change user role (admin only)
router.put('/user/:userId', roleController.changeUserRole);

module.exports = router;
