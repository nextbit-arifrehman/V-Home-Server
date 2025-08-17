const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const verifyJWT = require('../middlewares/verifyJWT');
const verifyRole = require('../middlewares/verifyRole');

// All wishlist routes are protected - any authenticated user can use wishlist
router.use(verifyJWT);

// Add property to wishlist
router.post('/', wishlistController.addToWishlist);

// Get user's wishlist
router.get('/', wishlistController.getWishlist);

// Remove property from wishlist
router.delete('/:id', wishlistController.removeFromWishlist);

module.exports = router;