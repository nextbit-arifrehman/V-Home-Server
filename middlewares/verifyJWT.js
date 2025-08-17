// middlewares/verifyJWT.js
const jwt = require('jsonwebtoken');
const { auth } = require('../utils/firebaseAdmin');

const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: No token provided',
      code: 'UNAUTHORIZED_NO_TOKEN',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // First try to verify as backend JWT token
    try {
      console.log('🔍 Verifying backend JWT token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch user from database to get latest data
      const User = require('../models/User');
      const dbUser = await User.findByUid(req.db, decoded.uid);
      
      if (!dbUser) {
        return res.status(404).json({
          error: 'User not found in database',
          code: 'USER_NOT_FOUND',
        });
      }
      
      // Add user info to request
      req.user = {
        uid: dbUser.uid,
        email: dbUser.email,
        displayName: dbUser.displayName,
        photoURL: dbUser.photoURL,
        role: dbUser.role,
        backendId: dbUser.backendId
      };
      
      console.log('✅ Backend JWT verified for:', dbUser.email, 'Role:', dbUser.role);
      return next();
    } catch (jwtError) {
      console.log('❌ Backend JWT verification failed, trying Firebase token...', jwtError.message);
    }

    // If backend JWT fails, try Firebase token (fallback for compatibility)
    if (!auth) {
      return res.status(503).json({
        error: 'Authentication service unavailable',
        code: 'AUTH_SERVICE_UNAVAILABLE',
      });
    }

    console.log('🔍 Verifying Firebase ID token...');
    const decodedToken = await auth.verifyIdToken(token);
    
    // Fetch user from database to get role
    const User = require('../models/User');
    let dbUser = await User.findByUid(req.db, decodedToken.uid);
    
    // If user doesn't exist in database, create them with default role
    if (!dbUser) {
      dbUser = await User.create(req.db, {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email?.split('@')[0],
        photoURL: decodedToken.picture,
        role: 'user', // Default role
        verificationStatus: 'verified',
        isFraud: false
      });
      console.log('Creating new user for', decodedToken.email);
    }
    
    // Add user info to request with role from database
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: dbUser.displayName || decodedToken.name || decodedToken.email?.split('@')[0],
      photoURL: dbUser.photoURL || decodedToken.picture,
      role: dbUser.role || 'user',
      backendId: `user_${decodedToken.uid}`
    };
    
    console.log('✅ Firebase token verified for:', decodedToken.email, 'Role:', dbUser.role);
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(403).json({
        error: 'Forbidden: Invalid or expired token',
        code: 'FORBIDDEN_INVALID_TOKEN',
    });
  }
};

module.exports = verifyJWT;