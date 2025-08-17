const Review = require('../models/Review');
const Property = require('../models/Property');
const User = require('../models/User');

// Add a review for a property (User only)
exports.addReview = async (req, res) => {
  try {
    const { propertyId, reviewText } = req.body;
    const userUid = req.user.uid;

    const user = await User.findByUid(req.db, userUid);
    if (!user || user.role !== 'user') {
      return res.status(403).json({ error: 'Only users can add reviews' });
    }

    const property = await Property.getPropertyById(req.db, propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const newReview = await Review.create(req.db, {
      propertyId,
      propertyTitle: property.title,
      propertyImage: property.image,
      propertyAgentUid: property.agentUid,
      propertyAgentName: property.agentName,
      reviewerUid: userUid,
      reviewerName: user.displayName,
      reviewerEmail: user.email,
      reviewerImage: user.photoURL || '',
      reviewText,
      createdAt: new Date(),
    });

    res.status(201).json({ message: 'Review added successfully', review: newReview });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all reviews for a specific property (public)
exports.getReviewsByProperty = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    
    // Validate propertyId
    if (!propertyId || propertyId === 'undefined') {
      return res.status(400).json({ error: 'Invalid property ID' });
    }

    const reviews = await Review.getReviewsByPropertyId(req.db, propertyId);

    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all reviews made by logged-in user (User only)
exports.getMyReviews = async (req, res) => {
  try {
    console.log(`🔍 Getting reviews for user: ${req.user.email} (UID: ${req.user.uid})`);
    const userUid = req.user.uid;
    const reviews = await Review.getReviewsByReviewerUid(req.db, userUid);

    // For reviews that don't have propertyImage, fetch it from the property
    const enhancedReviews = await Promise.all(reviews.map(async (review) => {
      if (!review.propertyImage && review.propertyId) {
        const property = await Property.getPropertyById(req.db, review.propertyId);
        if (property) {
          review.propertyImage = property.image;
        }
      }
      return review;
    }));

    console.log(`✅ Found ${enhancedReviews.length} reviews for user: ${req.user.email}`);
    res.json(enhancedReviews);
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete a review (User who wrote it or Admin)
exports.deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const userUid = req.user.uid;
    const userRole = req.user.role;

    const review = await Review.getReviewById(req.db, reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Only the reviewer or admin can delete
    if (review.reviewerUid !== userUid && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this review' });
    }

    await Review.deleteReview(req.db, reviewId);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: Get all reviews (Admin only)
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.getAllReviews(req.db);

    res.json(reviews);
  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get latest reviews for homepage (Public)
exports.getLatestReviewsForHomepage = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3; // Default to 3 reviews
    const reviews = await Review.getLatestReviews(req.db, limit);

    res.json(reviews);
  } catch (error) {
    console.error('Get latest reviews for homepage error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
