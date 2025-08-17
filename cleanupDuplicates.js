// Cleanup script to remove duplicate users
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function cleanupDuplicateUsers() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    const db = client.db();
    const collection = db.collection('users');
    
    // Find all users grouped by email
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: "$email",
          count: { $sum: 1 },
          docs: { $push: "$$ROOT" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();
    
    console.log(`Found ${duplicates.length} emails with duplicates`);
    
    for (const duplicate of duplicates) {
      console.log(`\nProcessing duplicates for email: ${duplicate._id}`);
      console.log(`Found ${duplicate.count} duplicate records`);
      
      // Sort by createdAt to keep the oldest record
      const sortedDocs = duplicate.docs.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      const keepDoc = sortedDocs[0]; // Keep the first (oldest) document
      const removeIds = sortedDocs.slice(1).map(doc => doc._id);
      
      console.log(`Keeping document: ${keepDoc._id} (created: ${keepDoc.createdAt})`);
      console.log(`Removing ${removeIds.length} duplicate documents`);
      
      // Remove duplicate documents
      if (removeIds.length > 0) {
        const deleteResult = await collection.deleteMany({
          _id: { $in: removeIds }
        });
        console.log(`Deleted ${deleteResult.deletedCount} duplicate documents`);
      }
    }
    
    console.log("\n✅ Cleanup completed successfully");
    
    // Show final count
    const finalCount = await collection.countDocuments();
    console.log(`Final user count: ${finalCount}`);
    
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await client.close();
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupDuplicateUsers().catch(console.error);
}

module.exports = { cleanupDuplicateUsers };