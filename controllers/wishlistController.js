const Wishlist = require('../models/Wishlist');
const Property = require('../models/Property');

// Add property to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { propertyId } = req.body;
    const userId = req.user.uid;

    // Check if property exists
    const property = await Property.getPropertyById(req.db, propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check if already wishlisted
    const existingWishlist = await Wishlist.getWishlistByUserAndProperty(req.db, userId, propertyId);
    if (existingWishlist) {
      return res.status(409).json({ message: 'Property already in wishlist' });
    }

    const newWishlist = {
      userId: userId,
      propertyId: propertyId,
      addedAt: new Date(),
    };

    const result = await Wishlist.create(req.db, newWishlist);
    res.status(201).json({ message: 'Property added to wishlist', wishlist: result });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user's wishlist (excluding sold properties)
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.uid;

    const wishlistedItems = await Wishlist.getWishlistByUserId(req.db, userId);

    // Populate property details for each wishlisted item and filter out sold properties
    const populatedWishlist = await Promise.all(wishlistedItems.map(async (item) => {
      const property = await Property.getPropertyById(req.db, item.propertyId);
      return { 
        ...item, 
        propertyDetails: property,
        verificationStatus: property?.verificationStatus || 'pending',
        propertyTitle: property?.title,
        propertyLocation: property?.location,
        priceRange: property?.priceRange,
        agentName: property?.agentName,
        agentEmail: property?.agentEmail,
        propertyImage: property?.image,
        isSold: property?.status === 'sold'
      };
    }));

    // Filter out sold properties from wishlist
    const availableWishlist = populatedWishlist.filter(item => 
      item.propertyDetails && item.propertyDetails.status !== 'sold'
    );

    res.json(availableWishlist);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove property from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { id } = req.params; // Wishlist item ID
    const userId = req.user.uid;

    const wishlistItem = await Wishlist.getWishlistById(req.db, id);
    if (!wishlistItem) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    // Ensure user owns the wishlist item or is admin
    if (wishlistItem.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to remove this wishlist item' });
    }

    const deleted = await Wishlist.deleteWishlist(req.db, id);
    if (deleted) {
      res.json({ message: 'Property removed from wishlist' });
    } else {
      res.status(404).json({ error: 'Wishlist item not found or could not be deleted' });
    }
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};