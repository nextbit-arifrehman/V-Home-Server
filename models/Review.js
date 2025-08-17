const { ObjectId } = require('mongodb');

const COLLECTION_NAME = 'reviews';

const Review = {
  create: async (db, reviewData) => {
    const result = await db.collection(COLLECTION_NAME).insertOne(reviewData);
    return db.collection(COLLECTION_NAME).findOne({ _id: result.insertedId });
  },

  getReviewById: async (db, id) => {
    return db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
  },

  getReviewsByPropertyId: async (db, propertyId) => {
    // Validate ObjectId format
    if (!propertyId || propertyId === 'undefined' || !ObjectId.isValid(propertyId)) {
      return [];
    }
    return db.collection(COLLECTION_NAME).find({ propertyId: new ObjectId(propertyId) }).toArray();
  },

  getReviewsByReviewerUid: async (db, reviewerUid) => {
    return db.collection(COLLECTION_NAME).find({ reviewerUid }).toArray();
  },

  getAllReviews: async (db) => {
    return db.collection(COLLECTION_NAME).find({}).toArray();
  },

  deleteReview: async (db, id) => {
    const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  },

  getLatestReviews: async (db, limit) => {
    return db.collection(COLLECTION_NAME).find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  },
};

module.exports = Review;