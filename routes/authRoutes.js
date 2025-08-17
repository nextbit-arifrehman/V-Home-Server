// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyJWT = require('../middlewares/verifyJWT');

// Public routes
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);

// Protected route to get user info (for client session validation)
router.get('/me', verifyJWT, authController.getMe);

// Check users in database (for development/testing)
router.get('/users', async (req, res) => {
  try {
    const users = await req.db.collection('users').find({}).toArray();
    res.json({
      message: `Found ${users.length} users`,
      users: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout route (optional if you handle logout on client side by removing tokens)
router.post('/logout', verifyJWT, authController.logout);

module.exports = router;
