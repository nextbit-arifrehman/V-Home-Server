// controllers/authController.js

const { auth } = require('../utils/firebaseAdmin'); // ✅ Use initialized auth
const User = require('../models/User');

// Register user (Firebase Auth + MongoDB)
exports.registerUser = async (req, res) => {
  try {
    if (!auth) {
      return res.status(503).json({ 
        error: 'Firebase authentication is not available. Please configure Firebase credentials.' 
      });
    }

    const { email, password, displayName, photoURL, role } = req.body;
    
    console.log(`📧 Backend: Registration attempt for email: ${email}`);

    // Check if user already exists in MongoDB
    const existingUser = await User.findByEmail(req.db, email);
    if (existingUser) {
      console.log(`❌ Backend: User already exists with email: ${email}`);
      return res.status(409).json({ 
        error: 'User already exists with this email address',
        code: 'auth/email-already-exists'
      });
    }

    // Create Firebase Auth user
    console.log(`🔥 Backend: Creating Firebase user for: ${email}`);
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      photoURL,
    });

    // Save user info in MongoDB with backend unique ID
    console.log(`💾 Backend: Saving user to MongoDB...`);
    const user = await User.create(req.db, {
      uid: userRecord.uid,
      backendId: `user_${userRecord.uid}`, // Unique backend identifier
      email,
      displayName: displayName || email.split('@')[0], // Fallback to email prefix
      photoURL,
      role: role || 'user', // default to "user"
      verified: false, // Default to not verified
      isFraud: false, // Default to not fraud
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    console.log(`✅ Backend: User registration completed for: ${email}`);
    res.status(201).json({
      message: 'User registered successfully. Please log in.',
      user: {
        uid: user.uid,
        backendId: user.backendId,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        verified: user.verified,
        isFraud: user.isFraud
      },
    });
  } catch (error) {
    console.error('❌ Backend: Register error:', error.code, error.message);
    
    // Handle Firebase specific errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ 
        error: 'User already exists with this email address',
        code: error.code 
      });
    }
    
    res.status(400).json({ 
      error: error.message,
      code: error.code 
    });
  }
};

// Login with Firebase ID Token
exports.loginUser = async (req, res) => {
  try {
    console.log("🔐 Backend: Received login request with Firebase ID token");
    const { idToken } = req.body;

    // Verify Firebase ID token
    console.log("🔍 Backend: Verifying Firebase ID token with Admin SDK...");
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const displayName = decodedToken.name || email.split('@')[0];
    const photoURL = decodedToken.picture;
    console.log("✅ Backend: Firebase token verified successfully for:", email);

    // Check for existing user and create/update accordingly
    console.log("🔍 Backend: Checking if user exists in MongoDB...");
    let user = await User.createOrUpdate(req.db, {
      uid: uid,
      backendId: `user_${uid}`, // Unique backend identifier
      email: email,
      displayName: displayName,
      photoURL: photoURL,
      role: 'user', // default role for new users
      verified: false,
      isFraud: false,
      createdAt: new Date(),
      lastLoginAt: new Date()
    });
    
    console.log(`👤 Backend: User processed: ${email}`);
    console.log(`🎯 Backend: Current user role: ${user.role}`);

    // Generate Backend JWT Token for API authentication
    console.log("🔑 Backend: Generating JWT token for API access...");
    const jwt = require('jsonwebtoken');
    const backendToken = jwt.sign(
      { 
        uid: user.uid,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log("✅ Backend: JWT token generated successfully");

    console.log("💾 Backend: Sending user data and tokens to frontend...");
    res.status(200).json({
      message: 'Login successful',
      token: backendToken,
      user: {
        uid: user.uid,
        backendId: user.backendId,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        verified: user.verified,
        isFraud: user.isFraud
      },
    });
    console.log("✅ Backend: Login flow completed successfully");
  } catch (error) {
    console.error('❌ Backend: Login error:', error.code, error.message);
    res.status(401).json({ 
      error: 'Invalid ID token or login failure',
      code: error.code 
    });
  }
};

// Get user info for current session
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByUid(req.db, req.user.uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        isFraud: user.isFraud
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Logout is handled on the frontend by removing the JWT token
exports.logout = (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
};
