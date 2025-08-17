const { ObjectId } = require('mongodb');

const COLLECTION_NAME = 'users';

const User = {
  findByUid: async (db, uid) => {
    return db.collection(COLLECTION_NAME).findOne({ uid });
  },

  findByEmail: async (db, email) => {
    return db.collection(COLLECTION_NAME).findOne({ email });
  },

  getAllUsers: async (db) => {
    return db.collection(COLLECTION_NAME).find({}).toArray();
  },

  updateUser: async (db, uid, updateData) => {
    return db.collection(COLLECTION_NAME).updateOne({ uid }, { $set: updateData });
  },

  updateUserRole: async (db, uid, role) => {
    console.log(`🔄 Database: Updating user role to ${role} for uid: ${uid}`);
    const result = await db.collection(COLLECTION_NAME).updateOne(
      { uid }, 
      { $set: { role: role, lastLoginAt: new Date() } }
    );
    console.log(`✅ Database: User role updated successfully`);
    return result;
  },

  deleteUserById: async (db, id) => {
    return db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
  },

  deleteUserByUid: async (db, uid) => {
    return db.collection(COLLECTION_NAME).deleteOne({ uid });
  },

  createOrUpdate: async (db, userData) => {
    console.log(`🔍 Database: Checking for existing user with email: ${userData.email}`);
    
    // First check by email to prevent duplicates
    const existingUserByEmail = await db.collection(COLLECTION_NAME).findOne({ email: userData.email });
    
    if (existingUserByEmail) {
      console.log(`👤 Database: User exists with email ${userData.email}, updating instead of creating`);
      
      // Update existing user's data but preserve role unless explicitly changing
      const updateData = {
        uid: userData.uid, // Update UID in case it changed (shouldn't happen but safety)
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        lastLoginAt: new Date()
      };
      
      await db.collection(COLLECTION_NAME).updateOne(
        { email: userData.email }, 
        { $set: updateData }
      );
      
      console.log(`✅ Database: Existing user updated for ${userData.email}`);
      return db.collection(COLLECTION_NAME).findOne({ email: userData.email });
    }
    
    // Check by UID as secondary check
    const existingUserByUid = await db.collection(COLLECTION_NAME).findOne({ uid: userData.uid });
    
    if (existingUserByUid) {
      console.log(`👤 Database: User exists with UID ${userData.uid}, updating profile data`);
      
      const updateData = {
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        lastLoginAt: new Date()
      };
      
      await db.collection(COLLECTION_NAME).updateOne(
        { uid: userData.uid }, 
        { $set: updateData }
      );
      
      console.log(`✅ Database: Existing user profile updated`);
      return db.collection(COLLECTION_NAME).findOne({ uid: userData.uid });
    }
    
    // If no existing user found, create new one
    console.log(`👤 Database: Creating new user account for ${userData.email}`);
    const result = await db.collection(COLLECTION_NAME).insertOne(userData);
    console.log(`✅ Database: New user created successfully`);
    return db.collection(COLLECTION_NAME).findOne({ _id: result.insertedId });
  },

  create: async (db, userData) => {
    const result = await db.collection(COLLECTION_NAME).insertOne(userData);
    // Find and return the newly created document
    return db.collection(COLLECTION_NAME).findOne({ _id: result.insertedId });
  },

  updateLastLogin: async (db, uid) => {
    return db.collection(COLLECTION_NAME).updateOne(
      { uid }, 
      { $set: { lastLoginAt: new Date() } }
    );
  }
};

module.exports = User;