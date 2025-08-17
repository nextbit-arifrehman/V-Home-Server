const { ObjectId } = require('mongodb');

const COLLECTION_NAME = 'properties';

const Property = {
  create: async (db, propertyData) => {
    const result = await db.collection(COLLECTION_NAME).insertOne(propertyData);
    const property = await db.collection(COLLECTION_NAME).findOne({ _id: result.insertedId });
    // Add id field for frontend compatibility
    if (property) {
      property.id = property._id.toString();
    }
    return property;
  },

  getAllProperties: async (db, filter, sortOptions) => {
    const properties = await db.collection(COLLECTION_NAME).find(filter).sort(sortOptions).toArray();
    // Add id field for frontend compatibility
    return properties.map(property => ({
      ...property,
      id: property._id.toString()
    }));
  },

  getPropertyById: async (db, id) => {
    // Try finding by custom string ID first (property1, property2, etc.)
    let property = await db.collection(COLLECTION_NAME).findOne({ _id: id });
    
    // If not found and id looks like ObjectId, try ObjectId format
    if (!property && ObjectId.isValid(id)) {
      property = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
    }
    
    // Add id field for frontend compatibility
    if (property) {
      property.id = property._id.toString();
    }
    
    return property;
  },

  updateProperty: async (db, id, updateData) => {
    // Try custom string ID first
    let result = await db.collection(COLLECTION_NAME).updateOne(
      { _id: id },
      { $set: updateData }
    );
    
    // If not found and id looks like ObjectId, try ObjectId format
    if (result.matchedCount === 0 && ObjectId.isValid(id)) {
      result = await db.collection(COLLECTION_NAME).updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
    }
    
    return result.modifiedCount > 0;
  },

  deleteProperty: async (db, id) => {
    // Try custom string ID first
    let result = await db.collection(COLLECTION_NAME).deleteOne({ _id: id });
    
    // If not found and id looks like ObjectId, try ObjectId format
    if (result.deletedCount === 0 && ObjectId.isValid(id)) {
      result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
    }
    
    return result.deletedCount > 0;
  },

  updateVerificationStatus: async (db, id, status) => {
    // Try custom string ID first
    let result = await db.collection(COLLECTION_NAME).updateOne(
      { _id: id },
      { $set: { verificationStatus: status } }
    );
    
    // If not found and id looks like ObjectId, try ObjectId format
    if (result.matchedCount === 0 && ObjectId.isValid(id)) {
      result = await db.collection(COLLECTION_NAME).updateOne(
        { _id: new ObjectId(id) },
        { $set: { verificationStatus: status } }
      );
    }
    
    return result.modifiedCount > 0;
  },

  advertiseProperty: async (db, id, isAdvertised) => {
    // Try custom string ID first
    let result = await db.collection(COLLECTION_NAME).updateOne(
      { _id: id },
      { $set: { isAdvertised } }
    );
    
    // If not found and id looks like ObjectId, try ObjectId format
    if (result.matchedCount === 0 && ObjectId.isValid(id)) {
      result = await db.collection(COLLECTION_NAME).updateOne(
        { _id: new ObjectId(id) },
        { $set: { isAdvertised } }
      );
    }
    
    return result.modifiedCount > 0;
  },

  getAdvertisedProperties: async (db) => {
    const properties = await db.collection(COLLECTION_NAME).find({ 
      isAdvertised: true, 
      verificationStatus: 'verified',
      status: { $ne: 'sold' }
    }).toArray();
    // Add id field for frontend compatibility
    return properties.map(property => ({
      ...property,
      id: property._id.toString()
    }));
  },

  getLatestAdvertisedProperties: async (db, limit) => {
    const properties = await db.collection(COLLECTION_NAME).find({ 
      isAdvertised: true, 
      verificationStatus: 'verified',
      status: { $ne: 'sold' }
    }).sort({ createdAt: -1 }).limit(limit).toArray();
    // Add id field for frontend compatibility
    return properties.map(property => ({
      ...property,
      id: property._id.toString()
    }));
  },

  searchPropertiesByLocation: async (db, location) => {
    const properties = await db.collection(COLLECTION_NAME).find({ 
      location: { $regex: location, $options: 'i' }, 
      verificationStatus: 'verified',
      status: { $ne: 'sold' }
    }).toArray();
    // Add id field for frontend compatibility
    return properties.map(property => ({
      ...property,
      id: property._id.toString()
    }));
  },

  sortPropertiesByPrice: async (db, order) => {
    const properties = await db.collection(COLLECTION_NAME).find({ 
      verificationStatus: 'verified',
      status: { $ne: 'sold' }
    }).sort({ 'priceRange.min': order }).toArray();
    // Add id field for frontend compatibility
    return properties.map(property => ({
      ...property,
      id: property._id.toString()
    }));
  },
};

module.exports = Property;