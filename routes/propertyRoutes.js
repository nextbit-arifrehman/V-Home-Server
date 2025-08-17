// routes/propertyRoutes.js

const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const verifyJWT = require('../middlewares/verifyJWT');
const verifyRole = require('../middlewares/verifyRole');

// Public route for fetching advertised properties for homepage advertisement section
router.get('/advertisements', propertyController.getAdvertisedProperties);

// Public route for searching properties by location
router.get('/search', propertyController.searchPropertiesByLocation);

// Public route for getting all verified properties (no auth required)
router.get('/public', propertyController.getAllVerifiedProperties);

// Protected routes - user must be logged in
router.use(verifyJWT);

// Get all verified properties (for All Properties page)
router.get('/', propertyController.getAllVerifiedProperties);

// Get property details by ID
router.get('/:id', propertyController.getPropertyDetails);

// Agent-only routes for managing own properties
router.post('/', verifyRole('agent'), propertyController.addProperty);
router.get('/agent/my-properties', verifyRole('agent'), propertyController.getMyProperties);
router.put('/:id', verifyRole('agent'), propertyController.updateProperty);
router.patch('/:id', verifyRole('agent'), propertyController.updateProperty);
router.delete('/:id', verifyRole('agent'), propertyController.deleteProperty);

// Admin-only routes to verify or reject properties
router.patch('/verify/:id', verifyRole('admin'), propertyController.verifyProperty);


// Admin route to get all properties (for admin management)
router.get('/admin/all', verifyRole('admin'), propertyController.getAllProperties);

// Admin route to get advertised properties for managing advertisements
router.get('/admin/advertise', verifyRole('admin'), propertyController.getAdminAdvertisedProperties);

// Admin route to mark property as advertised
router.patch('/admin/advertise/:id', verifyRole('admin'), propertyController.advertiseProperty);

module.exports = router;
