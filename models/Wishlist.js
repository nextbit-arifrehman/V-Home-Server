const { ObjectId } = require('mongodb');

const COLLECTION_NAME = 'wishlists';

const Wishlist = {
  create: async (db, wishlistData) => {
    const result = await db.collection(COLLECTION_NAME).insertOne(wishlistData);
    return db.collection(COLLECTION_NAME).findOne({ _id: result.insertedId });
  },

  getWishlistById: async (db, id) => {
    return db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
  },

  getWishlistByUserAndProperty: async (db, userId, propertyId) => {
    return db.collection(COLLECTION_NAME).findOne({ userId: userId, propertyId: propertyId });
  },

  getWishlistByUserId: async (db, userId) => {
    return db.collection(COLLECTION_NAME).find({ userId: userId }).toArray();
  },

  deleteWishlist: async (db, wishlistId) => {
    const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(wishlistId) });
    return result.deletedCount > 0;
  },
};

module.exports = Wishlist;