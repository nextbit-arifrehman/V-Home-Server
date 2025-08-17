// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyJWT = require('../middlewares/verifyJWT');
const verifyRole = require('../middlewares/verifyRole');

// All routes here are protected; user must be logged in
router.use(verifyJWT);

// User profile
router.get('/profile', userController.getProfile);

// Test endpoint to become agent (for testing purposes)
router.post('/become-agent', userController.becomeMockAgent);

// Admin only routes
router.get('/', verifyRole('admin'), userController.getAllUsers);
router.patch('/make-admin/:uid', verifyRole('admin'), userController.makeAdmin);
router.patch('/make-agent/:uid', verifyRole('admin'), userController.makeAgent);
router.patch('/mark-fraud/:uid', verifyRole('admin'), userController.markFraudAgent);
router.delete('/:uid', verifyRole('admin'), userController.deleteUser);

module.exports = router;
