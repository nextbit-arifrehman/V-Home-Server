// controllers/offerController.js

const Offer = require('../models/Offer');
const Property = require('../models/Property');
const User = require('../models/User');

// User makes an offer for a property (User only)
exports.makeOffer = async (req, res) => {
  try {
    console.log('📝 Offer creation request body:', req.body);
    
    const {
      propertyId,
      propertyTitle,
      propertyLocation,
      propertyImage,
      agentName,
      agentEmail,
      buyerEmail,
      buyerName,
      offeredAmount, // Frontend sends offeredAmount
      buyingDate,
      status
    } = req.body;

    const buyerUid = req.user.uid;
    const buyer = await User.findByUid(req.db, buyerUid);

    // Validation: only 'user' role can buy
    if (!buyer || buyer.role !== 'user') {
      return res.status(403).json({ error: 'Only users can make offers' });
    }

    // Check if user already has an active offer for this property
    const existingOffer = await Offer.getActiveOfferByUserAndProperty(req.db, buyerUid, propertyId);
    if (existingOffer) {
      return res.status(400).json({ 
        error: 'You already have an active offer for this property',
        code: 'DUPLICATE_OFFER'
      });
    }

    console.log(`💰 Creating offer for ${offeredAmount} by ${buyerName} for property ${propertyTitle}`);

    // Get property to ensure we have the correct agent UID
    const property = await Property.getPropertyById(req.db, propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const offer = await Offer.create(req.db, {
      propertyId,
      propertyTitle,
      propertyLocation,
      propertyImage,
      agentName,
      agentEmail,
      agentUid: property.agentUid, // Use property's agent UID
      buyerUid,
      buyerEmail,
      buyerName,
      offeredAmount, // Store as offeredAmount to match frontend expectation
      buyingDate,
      status: status || 'pending',
      createdAt: new Date()
    });

    console.log('✅ Offer created successfully:', offer);
    res.status(201).json({ message: 'Offer made successfully', offer });
  } catch (error) {
    console.error('❌ Make offer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// User: get all offers made by logged-in user
exports.getMyOffers = async (req, res) => {
  try {
    const buyerUid = req.user.uid;
    console.log(`🔍 Getting offers for user: ${req.user.email} (UID: ${buyerUid})`);
    
    const offers = await Offer.getOffersByBuyerUid(req.db, buyerUid);
    
    console.log(`📦 Found ${offers.length} offers for user: ${req.user.email}`);
    res.json(offers);
  } catch (error) {
    console.error('Get my offers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Agent: get all offers made for agent's properties (requested/offered properties) - show ALL offer history with pending first
exports.getRequestedOffers = async (req, res) => {
  try {
    const agentUid = req.user.uid;
    const agentEmail = req.user.email;
    
    console.log(`🔍 Getting requested offers for agent: ${agentEmail} (UID: ${agentUid})`);
    
    // Get ALL offers by agent UID (for newer offers) and agent email (for compatibility)
    // Show all statuses: pending, accepted, rejected, bought (complete history)
    const offersByUid = await req.db.collection('offers').find({ 
      agentUid: agentUid
    }).toArray();
    
    const offersByEmail = await req.db.collection('offers').find({ 
      agentEmail: agentEmail
    }).toArray();
    
    // Combine and deduplicate offers
    const allOffers = [...offersByUid, ...offersByEmail];
    const uniqueOffers = allOffers.filter((offer, index, self) => 
      index === self.findIndex(o => o._id.toString() === offer._id.toString())
    );

    // Sort offers: pending first, then by creation date (newest first)
    const sortedOffers = uniqueOffers.sort((a, b) => {
      // Pending offers come first
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      
      // Then sort by creation date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    console.log(`✅ Found ${sortedOffers.length} total offers (all history) for agent: ${agentEmail}`);
    res.json(sortedOffers);
  } catch (error) {
    console.error('Get requested offers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Agent: get all sold properties by agent
exports.getSoldPropertiesByAgent = async (req, res) => {
  try {
    const agentUid = req.user.uid;
    const agentEmail = req.user.email;
    
    console.log(`🔍 Getting sold properties for agent: ${agentEmail} (UID: ${agentUid})`);
    
    // Find sold offers by both agentUid and agentEmail for compatibility
    const soldOffers = await req.db.collection('offers').find({ 
      $or: [
        { agentUid: agentUid, status: 'bought' },
        { agentEmail: agentEmail, status: 'bought' },
        { propertyAgentUid: agentUid, status: 'bought' }
      ]
    }).toArray();
    
    console.log(`✅ Found ${soldOffers.length} sold properties for agent: ${agentEmail}`);
    res.json(soldOffers);
  } catch (error) {
    console.error('Get sold properties by agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Agent: get total sold amount by agent
exports.getTotalSoldAmountByAgent = async (req, res) => {
  try {
    const agentUid = req.user.uid;
    const agentEmail = req.user.email;
    
    console.log(`🔍 Getting total sold amount for agent: ${agentEmail} (UID: ${agentUid})`);
    
    // Find total sold amount by both agentUid and agentEmail for compatibility
    const result = await req.db.collection('offers').aggregate([
      { $match: { 
        $or: [
          { agentUid: agentUid, status: 'bought' },
          { agentEmail: agentEmail, status: 'bought' },
          { propertyAgentUid: agentUid, status: 'bought' }
        ]
      }},
      { $group: { _id: null, totalSoldAmount: { $sum: '$offeredAmount' } } }
    ]).toArray();
    
    const totalSoldAmount = result.length > 0 ? result[0].totalSoldAmount : 0;
    
    console.log(`✅ Total sold amount for agent ${agentEmail}: $${totalSoldAmount}`);
    res.json({ totalSoldAmount });
  } catch (error) {
    console.error('Get total sold amount by agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Agent: accept or reject an offer
exports.respondToOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    const { action } = req.body; // 'accept' or 'reject'

    console.log('Respond to offer - offerId:', offerId, 'action:', action);

    if (!offerId || offerId === 'undefined') {
      return res.status(400).json({ error: 'Invalid offer ID' });
    }

    const offer = await Offer.getOfferById(req.db, offerId);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Only the agent who owns the property can respond
    if (offer.agentEmail !== req.user.email) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({ error: 'Offer already responded' });
    }

    if (action === 'accept') {
      // Accept this offer
      await Offer.updateOfferStatus(req.db, offerId, 'accepted');

      // Reject all other offers for this property
      await Offer.updateManyOffers(
        req.db,
        { propertyId: offer.propertyId, _id: { $ne: offer._id } },
        { $set: { status: 'rejected' } }
      );

      const updatedOffer = await Offer.getOfferById(req.db, offerId);
      res.json({ message: 'Offer accepted', offer: updatedOffer });
    } else if (action === 'reject') {
      await Offer.updateOfferStatus(req.db, offerId, 'rejected');
      const updatedOffer = await Offer.getOfferById(req.db, offerId);
      res.json({ message: 'Offer rejected', offer: updatedOffer });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Respond to offer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// User: mark offer as paid (payment completed)
exports.markOfferAsBought = async (req, res) => {
  try {
    const offerId = req.params.id;
    const { transactionId } = req.body;

    const offer = await Offer.getOfferById(req.db, offerId);
    if (offer.buyerUid !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (offer.status !== 'accepted') {
      return res.status(400).json({ error: 'Offer not accepted yet' });
    }

    await Offer.updateOffer(req.db, offerId, { status: 'bought', transactionId });

    res.json({ message: 'Payment completed, offer marked as bought', offer });
  } catch (error) {
    console.error('Mark offer paid error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// User: Get bought properties (for "Property Bought" dashboard page)
exports.getUserBoughtProperties = async (req, res) => {
  try {
    const buyerUid = req.user.uid;
    const buyerEmail = req.user.email;
    
    console.log(`🏠 Getting bought properties for user: ${buyerEmail} (UID: ${buyerUid})`);
    
    // Find all bought offers by this user
    const boughtOffers = await req.db.collection('offers').find({ 
      $or: [
        { buyerUid: buyerUid, status: 'bought' },
        { buyerEmail: buyerEmail, status: 'bought' }
      ]
    }).toArray();
    
    console.log(`✅ Found ${boughtOffers.length} bought properties for user: ${buyerEmail}`);
    res.json({ 
      properties: boughtOffers,
      totalPurchases: boughtOffers.length,
      totalSpent: boughtOffers.reduce((sum, offer) => sum + (offer.offeredAmount || 0), 0)
    });
  } catch (error) {
    console.error('Get user bought properties error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// User: Cancel pending offer
exports.cancelOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    const buyerUid = req.user.uid;

    console.log(`🗑️ Canceling offer ${offerId} for user ${req.user.email}`);

    const success = await Offer.cancelOffer(req.db, offerId, buyerUid);
    
    if (!success) {
      return res.status(404).json({ 
        error: 'Offer not found or cannot be cancelled' 
      });
    }

    console.log('✅ Offer cancelled successfully');
    res.json({ message: 'Offer cancelled successfully' });
  } catch (error) {
    console.error('❌ Cancel offer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
