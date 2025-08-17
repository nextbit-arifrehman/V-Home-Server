const { ObjectId } = require('mongodb');

const COLLECTION_NAME = 'offers';

const Offer = {
  create: async (db, offerData) => {
    const result = await db.collection(COLLECTION_NAME).insertOne(offerData);
    return db.collection(COLLECTION_NAME).findOne({ _id: result.insertedId });
  },

  getOfferById: async (db, id) => {
    return db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
  },

  getOffersByBuyerUid: async (db, buyerUid) => {
    return db.collection(COLLECTION_NAME).find({ buyerUid }).toArray();
  },

  getOffersByAgentUid: async (db, agentUid) => {
    // Find offers where the agent's UID matches the agentUid field in the offer
    // First try with agentUid field, if not found try with agentEmail matching the user's email
    const offers = await db.collection(COLLECTION_NAME).find({ 
      $or: [
        { agentUid: agentUid },
        // For older offers that might have agentEmail but no agentUid
        { propertyAgentUid: agentUid }
      ]
    }).toArray();
    
    return offers;
  },

  getSoldOffersByAgentUid: async (db, agentUid) => {
    // Find sold offers by both agentUid and agentEmail for compatibility
    return db.collection(COLLECTION_NAME).find({ 
      $or: [
        { agentUid: agentUid, status: 'bought' },
        { propertyAgentUid: agentUid, status: 'bought' }
      ]
    }).toArray();
  },

  updateOfferStatus: async (db, id, status) => {
    const result = await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );
    return result.modifiedCount > 0;
  },

  updateOffer: async (db, id, updateData) => {
    const result = await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    return result.modifiedCount > 0;
  },

  deleteOffer: async (db, id) => {
    const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  },

  updateManyOffers: async (db, filter, update) => {
    const result = await db.collection(COLLECTION_NAME).updateMany(filter, update);
    return result.modifiedCount;
  },

  getTotalSoldAmountByAgentUid: async (db, agentUid) => {
    const result = await db.collection(COLLECTION_NAME).aggregate([
      { $match: { 
        $or: [
          { agentUid: agentUid, status: 'bought' },
          { propertyAgentUid: agentUid, status: 'bought' }
        ]
      }},
      { $group: { _id: null, totalSoldAmount: { $sum: '$offeredAmount' } } }
    ]).toArray();
    return result.length > 0 ? result[0].totalSoldAmount : 0;
  },

  // Check if user has active offer for property
  getActiveOfferByUserAndProperty: async (db, buyerUid, propertyId) => {
    return db.collection(COLLECTION_NAME).findOne({ 
      buyerUid, 
      propertyId, 
      status: { $in: ['pending', 'accepted'] } 
    });
  },

  // Cancel/delete offer by ID (only for pending offers)
  cancelOffer: async (db, offerId, buyerUid) => {
    const result = await db.collection(COLLECTION_NAME).deleteOne({ 
      _id: new ObjectId(offerId),
      buyerUid,
      status: 'pending' // Only allow canceling pending offers
    });
    return result.deletedCount > 0;
  },
};

module.exports = Offer;