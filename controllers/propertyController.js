const Property = require('../models/Property');
const User = require('../models/User');

// Add new property (Agent only)
exports.addProperty = async (req, res) => {
  try {
    const {
      title,
      location,
      image,
      priceRange,
    } = req.body;

    const agentUid = req.user.uid;
    
    // Find agent in database
    const agent = await User.findByUid(req.db, agentUid);
    
    // Check if agent exists and is an agent (not fraud)
    if (!agent || agent.role !== 'agent') {
      return res.status(403).json({ 
        error: 'Only agents can add properties',
        code: 'UNAUTHORIZED_AGENT'
      });
    }

    // Check if agent is marked as fraud
    if (agent.isFraud) {
      return res.status(403).json({ 
        error: 'Agent marked as fraud, cannot add property',
        code: 'FRAUD_AGENT'
      });
    }

    // Create new property
    const newProperty = await Property.create(req.db, {
      title,
      location,
      image,
      priceRange,
      agentUid,
      agentName: agent.displayName,
      agentEmail: agent.email,
      verificationStatus: 'pending',
      isAdvertised: false,
      createdAt: new Date(),
    });

    res.status(201).json({ 
      message: 'Property added successfully', 
      property: newProperty 
    });
  } catch (error) {
    console.error('Add property error:', error);
    res.status(500).json({ 
      error: 'Server error adding property',
      code: 'SERVER_ERROR' 
    });
  }
};

// Get all verified properties (for All Properties page)
exports.getAllVerifiedProperties = async (req, res) => {
  try {
    const { search, sort } = req.query;
    
    // Start with verified properties filter and exclude sold properties
    const filter = { 
      verificationStatus: 'verified',
      status: { $ne: 'sold' } // Exclude sold properties from public listings
    };
    
    // Add search if provided
    if (search) {
      filter.location = { $regex: search, $options: 'i' };
    }

    // Initialize sort options
    const sortOptions = {};
    
    // Add sort if provided
    if (sort) {
      if (sort === 'priceAsc') {
        sortOptions['priceRange.min'] = 1;
      } else if (sort === 'priceDesc') {
        sortOptions['priceRange.min'] = -1;
      }
    }

    // Get properties from database
    const properties = await Property.getAllProperties(req.db, filter, sortOptions);

    // Filter out properties from fraud agents
    const users = await req.db.collection('users').find({}).toArray();
    const fraudUserIds = users.filter(user => user.isFraud).map(user => user.uid);
    
    const validProperties = properties.filter(property => 
      !fraudUserIds.includes(property.agentUid)
    );

    res.json(validProperties);
  } catch (error) {
    console.error('Get verified properties error:', error);
    res.status(500).json({ 
      error: 'Server error retrieving properties',
      code: 'SERVER_ERROR' 
    });
  }
};

// Get property details by ID
exports.getPropertyDetails = async (req, res) => {
  try {
    const propertyId = req.params.id;
    
    // Validate propertyId
    if (!propertyId || propertyId === 'undefined') {
      return res.status(400).json({ 
        error: 'Invalid property ID',
        code: 'INVALID_PROPERTY_ID' 
      });
    }

    const property = await Property.getPropertyById(req.db, propertyId);

    if (!property) {
      return res.status(404).json({ 
        error: 'Property not found',
        code: 'PROPERTY_NOT_FOUND' 
      });
    }

    res.json(property);
  } catch (error) {
    console.error('Get property details error:', error);
    res.status(500).json({ 
      error: 'Server error retrieving property',
      code: 'SERVER_ERROR' 
    });
  }
};

// Update property by id (Agent only)
exports.updateProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const { title, location, image, description, minPrice, maxPrice } = req.body;
    const agentUid = req.user.uid;

    console.log('🔍 Update property request:', { propertyId, title, location, minPrice, maxPrice });

    // Find property
    const property = await Property.getPropertyById(req.db, propertyId);
    
    if (!property) {
      return res.status(404).json({ 
        error: 'Property not found',
        code: 'PROPERTY_NOT_FOUND' 
      });
    }

    // Check if user is the agent who owns this property
    if (property.agentUid !== agentUid) {
      return res.status(403).json({ 
        error: 'Not authorized to update this property',
        code: 'UNAUTHORIZED_UPDATE' 
      });
    }

    // Check if property was rejected (if rejected, can't be updated)
    if (property.verificationStatus === 'rejected') {
      return res.status(403).json({ 
        error: 'Cannot update rejected property',
        code: 'REJECTED_PROPERTY' 
      });
    }

    // Parse and validate prices
    const parsedMinPrice = parseFloat(minPrice) || 0;
    const parsedMaxPrice = parseFloat(maxPrice) || 0;
    
    // Generate price range string for display
    let priceRange = "Price on request";
    if (parsedMinPrice > 0 && parsedMaxPrice > 0) {
      priceRange = `$${parsedMinPrice.toLocaleString()} - $${parsedMaxPrice.toLocaleString()}`;
    } else if (parsedMinPrice > 0) {
      priceRange = `From $${parsedMinPrice.toLocaleString()}`;
    } else if (parsedMaxPrice > 0) {
      priceRange = `Up to $${parsedMaxPrice.toLocaleString()}`;
    }

    // Prepare update data
    const updateData = {
      title,
      location,
      description,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
      priceRange: priceRange,
      updatedAt: new Date()
    };

    // Add image if provided
    if (image) {
      updateData.image = image;
    }

    console.log('🔄 Updating property with data:', updateData);

    // Update property
    const updated = await Property.updateProperty(req.db, propertyId, updateData);

    if (!updated) {
      return res.status(500).json({ 
        error: 'Failed to update property',
        code: 'UPDATE_FAILED' 
      });
    }

    // Get updated property
    const updatedProperty = await Property.getPropertyById(req.db, propertyId);
    
    console.log('✅ Property updated successfully:', updatedProperty.title);
    
    res.json({ 
      message: 'Property updated successfully', 
      property: updatedProperty 
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ 
      error: 'Server error updating property',
      code: 'SERVER_ERROR' 
    });
  }
};

// Delete property by id (Agent only)
exports.deleteProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const agentUid = req.user.uid;

    // Find property
    const property = await Property.getPropertyById(req.db, propertyId);
    
    if (!property) {
      return res.status(404).json({ 
        error: 'Property not found',
        code: 'PROPERTY_NOT_FOUND' 
      });
    }

    // Check if user is the agent who owns this property or is admin
    if (property.agentUid !== agentUid) {
      return res.status(403).json({ 
        error: 'Not authorized to delete this property',
        code: 'UNAUTHORIZED_DELETE' 
      });
    }

    // Delete property
    const deleted = await Property.deleteProperty(req.db, propertyId);

    if (!deleted) {
      return res.status(500).json({ 
        error: 'Failed to delete property',
        code: 'DELETE_FAILED' 
      });
    }

    res.json({ 
      message: 'Property deleted successfully',
      propertyId 
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ 
      error: 'Server error deleting property',
      code: 'SERVER_ERROR' 
    });
  }
};

// Admin routes
// Update property verification status
exports.verifyProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const { status } = req.body; // 'verified' or 'rejected'

    // Validate status
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid verification status',
        code: 'INVALID_STATUS' 
      });
    }

    // Update property verification status
    const updated = await Property.updateVerificationStatus(req.db, propertyId, status);

    if (!updated) {
      return res.status(500).json({ 
        error: 'Failed to update verification status',
        code: 'UPDATE_FAILED' 
      });
    }

    // Get updated property
    const updatedProperty = await Property.getPropertyById(req.db, propertyId);
    
    res.json({ 
      message: `Property ${status === 'verified' ? 'verified' : 'rejected'} successfully`, 
      property: updatedProperty 
    });
  } catch (error) {
    console.error('Verify property error:', error);
    res.status(500).json({ 
      error: 'Server error verifying property',
      code: 'SERVER_ERROR' 
    });
  }
};

// Get all properties for admin management
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.getAllProperties(req.db, {}, { createdAt: -1 });
    res.json(properties);
  } catch (error) {
    console.error('Get all properties error:', error);
    res.status(500).json({ 
      error: 'Server error retrieving properties',
      code: 'SERVER_ERROR' 
    });
  }
};

// Advertise a property (Admin only)
exports.advertiseProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const { isAdvertised } = req.body; // boolean
    
    // Validate input
    if (typeof isAdvertised !== 'boolean') {
      return res.status(400).json({ 
        error: 'Invalid advertise status',
        code: 'INVALID_STATUS' 
      });
    }

    // Update property advertising status
    const updated = await Property.advertiseProperty(req.db, propertyId, isAdvertised);
    
    if (!updated) {
      return res.status(500).json({ 
        error: 'Failed to update advertise status',
        code: 'UPDATE_FAILED' 
      });
    }

    // Get updated property
    const updatedProperty = await Property.getPropertyById(req.db, propertyId);
    
    res.json({ 
      message: `Property ${isAdvertised ? 'added to' : 'removed from'} advertisements successfully`, 
      property: updatedProperty 
    });
  } catch (error) {
    console.error('Advertise property error:', error);
    res.status(500).json({ 
      error: 'Server error updating advertise status',
      code: 'SERVER_ERROR' 
    });
  }
};

exports.getAdminAdvertisedProperties = async (req, res) => {
  try {
    const properties = await Property.getAllProperties(req.db, { isAdvertised: true });
    res.json(properties);
  } catch (error) {
    console.error('Get advertised properties error:', error);
    res.status(500).json({ 
      error: 'Server error retrieving properties',
      code: 'SERVER_ERROR' 
    });
  }
};
exports.getAdvertisedProperties = async (req, res) => {
  try {
    const properties = await Property.getAdvertisedProperties(req.db);
    
    // Filter out properties from fraud agents
    const users = await req.db.collection('users').find({}).toArray();
    const fraudUserIds = users.filter(user => user.isFraud).map(user => user.uid);
    
    const validProperties = properties.filter(property => 
      !fraudUserIds.includes(property.agentUid)
    );
    
    res.json(validProperties);
  } catch (error) {
    console.error('Get advertised properties error:', error);
    res.status(500).json({ 
      error: 'Server error retrieving properties',
      code: 'SERVER_ERROR' 
    });
  }
};

// Get latest advertised properties
exports.getLatestAdvertisedProperties = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const properties = await Property.getLatestAdvertisedProperties(req.db, limit);
    res.json(properties);
  } catch (error) {
    console.error('Get latest advertised properties error:', error);
    res.status(500).json({ 
      error: 'Server error retrieving properties',
      code: 'SERVER_ERROR' 
    });
  }
};

// Search properties by location
exports.searchPropertiesByLocation = async (req, res) => {
  try {
    const location = req.query.location;
    if (!location) {
      return res.status(400).json({ 
        error: 'Location parameter is required',
        code: 'MISSING_LOCATION' 
      });
    }
    
    const properties = await Property.searchPropertiesByLocation(req.db, location);
    res.json(properties);
  } catch (error) {
    console.error('Search properties error:', error);
    res.status(500).json({ 
      error: 'Server error searching properties',
      code: 'SERVER_ERROR' 
    });
  }
};

// Sort properties by price
exports.sortPropertiesByPrice = async (req, res) => {
  try {
    const order = req.query.order === 'desc' ? -1 : 1;
    const properties = await Property.sortPropertiesByPrice(req.db, order);
    res.json(properties);
  } catch (error) {
    console.error('Sort properties error:', error);
    res.status(500).json({ 
      error: 'Server error sorting properties',
      code: 'SERVER_ERROR' 
    });
  }
};

exports.getMyProperties = async (req, res) => {
  try {
    const agentUid = req.user.uid;
    
    console.log(`🔍 Getting all properties (including sold) for agent: ${req.user.email} (UID: ${agentUid})`);
    
    // Get ALL properties by this agent including sold ones
    const properties = await Property.getAllProperties(req.db, { agentUid });
    
    console.log(`✅ Found ${properties.length} total properties for agent: ${req.user.email}`);
    
    res.json({ 
      properties: properties,
      total: properties.length 
    });
  } catch (error) {
    console.error('Get my properties error:', error);
    res.status(500).json({ 
      error: 'Server error retrieving agent properties',
      code: 'SERVER_ERROR' 
    });
  }
};