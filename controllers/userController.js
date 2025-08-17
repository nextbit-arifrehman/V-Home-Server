const User = require('../models/User');
const { auth } = require('../utils/firebaseAdmin');

// Get user profile by uid
exports.getProfile = async (req, res) => {
  try {
    const uid = req.user.uid;

    const user = await User.findByUid(req.db, uid);
    if (!user || !user.uid || user.uid === '') {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return filtered user info
    const { displayName, email, photoURL, role, isFraud } = user;
    res.json({
      user: {
        displayName,
        email,
        photoURL,
        role,
        isFraud
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user profile (e.g., displayName, photoURL)
exports.updateProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { displayName, photoURL } = req.body;

    // Update in Firebase Auth (if available)
    if (auth) {
      try {
        await auth.updateUser(uid, {
          displayName,
          photoURL,
        });
      } catch (firebaseError) {
        console.warn('Firebase update failed:', firebaseError.message);
        // Continue with MongoDB update even if Firebase fails
      }
    }

    // Update in MongoDB
    const updateData = {};
    if (displayName !== undefined && displayName !== null && displayName !== '') {
      updateData.displayName = displayName;
    }
    if (photoURL !== undefined && photoURL !== null && photoURL !== '') {
      updateData.photoURL = photoURL;
    }

    await User.updateUser(req.db, uid, updateData);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.getAllUsers(req.db);
    if (!users || !Array.isArray(users)) {
      return res.status(500).json({ error: 'Server error retrieving users' });
    }

    // Return filtered user info
    const filteredUsers = users.map(user => ({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      role: user.role,
      isFraud: user.isFraud
    }));

    res.json(filteredUsers);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Server error retrieving users' });
  }
};

// Make user admin (Admin only)
exports.makeAdmin = async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`🔄 Admin: Updating user role to 'admin' for uid: ${uid}`);
    
    const user = await User.findByUid(req.db, uid);
    if (!user || !user.uid) {
      console.log(`❌ Admin: User not found with uid: ${uid}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`👤 Admin: Found user ${user.email}, current role: ${user.role}`);
    await User.updateUserRole(req.db, uid, 'admin');
    console.log(`✅ Admin: User ${user.email} role updated to 'admin'`);

    res.json({ message: 'User promoted to admin', user: { role: 'admin' } });
  } catch (error) {
    console.error('❌ Admin: Make admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Make user agent (Admin only)
exports.makeAgent = async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`🔄 Admin: Updating user role to 'agent' for uid: ${uid}`);
    
    const user = await User.findByUid(req.db, uid);
    if (!user || !user.uid) {
      console.log(`❌ Admin: User not found with uid: ${uid}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`👤 Admin: Found user ${user.email}, current role: ${user.role}`);
    await User.updateUserRole(req.db, uid, 'agent');
    console.log(`✅ Admin: User ${user.email} role updated to 'agent'`);

    res.json({ message: 'User promoted to agent', user: { role: 'agent' } });
  } catch (error) {
    console.error('❌ Admin: Make agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Mark agent as fraud (Admin only)
exports.markFraudAgent = async (req, res) => {
  try {
    const { uid } = req.params;

    const user = await User.findByUid(req.db, uid);
    if (!user || !user.uid) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'agent') {
      return res.status(400).json({ error: 'User is not an agent' });
    }

    await User.updateUser(req.db, uid, { isFraud: true, role: 'fraud' });

    res.json({ message: 'Agent marked as fraud', user: { isFraud: true, role: 'fraud' } });
  } catch (error) {
    console.error('Mark as fraud error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete user and all related data (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { uid } = req.params;
    
    // First check if user exists in MongoDB
    const user = await User.findByUid(req.db, uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`Starting deletion process for user: ${user.email} (${user.role})`);

    // Track what gets deleted for reporting
    const deletionSummary = {
      user: false,
      properties: 0,
      offers: 0,
      reviews: 0,
      wishlistItems: 0
    };

    // 1. Delete user's properties (if agent)
    if (user.role === 'agent') {
      const propertiesResult = await req.db.collection('properties').deleteMany({ agentUid: uid });
      deletionSummary.properties = propertiesResult.deletedCount;
      console.log(`Deleted ${propertiesResult.deletedCount} properties`);
    }

    // 2. Delete user's offers (if user made any offers)
    const offersResult = await req.db.collection('offers').deleteMany({ userUid: uid });
    deletionSummary.offers = offersResult.deletedCount;
    console.log(`Deleted ${offersResult.deletedCount} offers`);

    // 3. Delete user's reviews
    const reviewsResult = await req.db.collection('reviews').deleteMany({ userUid: uid });
    deletionSummary.reviews = reviewsResult.deletedCount;
    console.log(`Deleted ${reviewsResult.deletedCount} reviews`);

    // 4. Delete user's wishlist items
    const wishlistResult = await req.db.collection('wishlist').deleteMany({ userUid: uid });
    deletionSummary.wishlistItems = wishlistResult.deletedCount;
    console.log(`Deleted ${wishlistResult.deletedCount} wishlist items`);

    // 5. Delete the user record
    const userDeleteResult = await User.deleteUserByUid(req.db, uid);
    if (!userDeleteResult || userDeleteResult.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    deletionSummary.user = true;
    console.log('Deleted user record');

    // 6. Try to delete from Firebase (optional, don't fail if it doesn't work)
    try {
      if (auth && uid && uid.length > 0 && uid.length <= 128) {
        await auth.deleteUser(uid);
        console.log('Deleted from Firebase');
      } else if (!auth) {
        console.warn('Firebase not available - skipping Firebase user deletion');
      }
    } catch (firebaseError) {
      console.warn('Firebase deletion failed (user may not exist in Firebase):', firebaseError.message);
      // Continue - Firebase deletion is optional
    }

    console.log('User deletion completed:', deletionSummary);

    res.json({ 
      message: 'User and all related data deleted successfully',
      deletionSummary
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error deleting user: ' + error.message });
  }
};

// Test endpoint: Make current user an agent (for testing purposes)
exports.becomeMockAgent = async (req, res) => {
  try {
    const userUid = req.user.uid;
    
    // Find the user and update their role
    let user = await User.findByUid(req.db, userUid);
    if (!user) {
      // Create user if doesn't exist
      user = await User.create(req.db, {
        uid: userUid,
        email: req.user.email,
        displayName: req.user.displayName,
        photoURL: req.user.photoURL,
        role: 'agent',
        verificationStatus: 'verified',
        isFraud: false
      });
    } else {
      await User.updateUser(req.db, userUid, { role: 'agent' });
    }
    
    res.json({ 
      message: 'You are now an agent (for testing purposes)', 
      user: { ...user, role: 'agent' } 
    });
  } catch (error) {
    console.error('Become agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};