// Initialize Stripe with working test key
let stripe;
try {
  console.log('🔑 Initializing Stripe with test key for fake money simulation...');
  
  // Use the verified working test key for fake money transactions
  const stripeKey = 'sk_test_51Rja8jD0N78lazSNVzCNxJSEAnqWvFxb0n6QQFP1qt8DunzEvApYEfvnQUSYRgWi4ygpG75EqVeSXJ4A09PQZn9N00KPPOaMbr';
  
  // Log key info for debugging (safely)
  const keyStart = stripeKey.substring(0, 7);
  const keyEnd = stripeKey.substring(stripeKey.length - 4);
  console.log(`🔑 Stripe test key format: ${keyStart}...${keyEnd}`);
  console.log(`🔑 Key length: ${stripeKey.length} characters`);
  
  stripe = require('stripe')(stripeKey);
  console.log('✅ Stripe initialized successfully for test payments');
} catch (error) {
  console.error('❌ Failed to initialize Stripe:', error.message);
  stripe = null;
}

const Offer = require('../models/Offer');

exports.createPaymentIntent = async (req, res) => {
  console.log('📋 STEP 1: Starting payment intent creation process');
  
  try {
    // Check if Stripe is properly initialized
    if (!stripe) {
      console.error('❌ STEP 1 FAILED: Stripe not initialized');
      return res.status(500).json({ 
        error: 'Payment system not properly configured. Please contact support.',
        step: 'stripe_initialization'
      });
    }
    console.log('✅ STEP 1 PASSED: Stripe is initialized');

    const { amount, offerId } = req.body;
    console.log(`📋 STEP 2: Validating request data - amount: $${amount}, offerId: ${offerId}`);

    if (!amount || amount <= 0) {
      console.error('❌ STEP 2 FAILED: Invalid amount');
      return res.status(400).json({ 
        error: 'Amount is required and must be a positive number',
        step: 'amount_validation'
      });
    }

    if (!offerId) {
      console.error('❌ STEP 2 FAILED: Missing offer ID');
      return res.status(400).json({ 
        error: 'Offer ID is required',
        step: 'offer_id_validation'
      });
    }
    console.log('✅ STEP 2 PASSED: Request data is valid');

    console.log('📋 STEP 3: Fetching offer from database');
    const offer = await Offer.getOfferById(req.db, offerId);
    if (!offer) {
      console.error('❌ STEP 3 FAILED: Offer not found in database');
      return res.status(404).json({ 
        error: 'Offer not found',
        step: 'offer_lookup'
      });
    }
    console.log(`✅ STEP 3 PASSED: Found offer - ${offer.propertyTitle}, status: ${offer.status}`);

    console.log('📋 STEP 4: Validating offer status and permissions');
    if (offer.status !== 'accepted') {
      console.error(`❌ STEP 4 FAILED: Offer status is '${offer.status}', not 'accepted'`);
      return res.status(400).json({ 
        error: 'Only accepted offers can be paid for',
        step: 'offer_status_validation',
        currentStatus: offer.status
      });
    }

    if (offer.buyerEmail !== req.user.email) {
      console.error(`❌ STEP 4 FAILED: User ${req.user.email} not authorized for offer by ${offer.buyerEmail}`);
      return res.status(403).json({ 
        error: 'Unauthorized to pay for this offer',
        step: 'user_authorization'
      });
    }
    console.log('✅ STEP 4 PASSED: Offer status and user authorization valid');

    console.log('📋 STEP 5: Converting amount to cents and creating Stripe payment intent');
    const amountInCents = Math.round(amount * 100);
    console.log(`💰 Amount conversion: $${amount} = ${amountInCents} cents`);

    // Test Stripe connection first
    try {
      console.log('🔌 Testing Stripe API connection...');
      await stripe.customers.list({ limit: 1 });
      console.log('✅ Stripe API connection test successful');
    } catch (stripeTestError) {
      console.error('❌ STEP 5 FAILED: Stripe API connection test failed:', stripeTestError.message);
      return res.status(500).json({
        error: 'Payment service connection failed. Please check API credentials.',
        step: 'stripe_connection_test',
        details: stripeTestError.message
      });
    }

    console.log('🎯 Creating Stripe payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        offerId: offerId,
        userId: req.user.id,
        propertyTitle: offer.propertyTitle,
        buyerEmail: offer.buyerEmail
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(`✅ STEP 5 PASSED: Payment intent created successfully - ID: ${paymentIntent.id}`);
    console.log('🎉 ALL STEPS PASSED: Payment intent creation completed successfully');

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      success: true,
      step: 'completed'
    });
  } catch (error) {
    console.error('❌ PAYMENT INTENT CREATION FAILED:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode
    });
    
    // Provide specific error messages based on error type
    let errorMessage = 'Payment processing failed. Please try again.';
    let errorStep = 'unknown_error';
    
    if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Payment service authentication failed. Please contact support.';
      errorStep = 'stripe_authentication';
    } else if (error.type === 'StripeConnectionError') {
      errorMessage = 'Unable to connect to payment service. Please try again later.';
      errorStep = 'stripe_connection';
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Payment service error. Please try again.';
      errorStep = 'stripe_api_error';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      step: errorStep,
      technical_details: error.message
    });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, offerId } = req.body;

    if (!paymentIntentId || !offerId) {
      return res.status(400).json({ error: 'Payment Intent ID and Offer ID are required' });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Update offer status to 'bought' using our MongoDB model
    const updateResult = await Offer.updateOffer(req.db, offerId, { 
      status: 'bought',
      transactionId: paymentIntentId,
      paidAt: new Date()
    });

    if (!updateResult) {
      return res.status(404).json({ error: 'Failed to update offer' });
    }

    // Get the updated offer
    const offer = await Offer.getOfferById(req.db, offerId);

    console.log(`✅ Payment confirmed for offer ${offerId}, property: ${offer.propertyTitle}`);

    // Hide property from public listings after being sold
    // Update property status to sold/unavailable so it doesn't appear in general listings
    try {
      const Property = require('../models/Property');
      await Property.updateProperty(req.db, offer.propertyId, { 
        status: 'sold',
        soldAt: new Date(),
        soldTo: offer.buyerEmail
      });
      console.log(`🏠 Property ${offer.propertyId} marked as sold`);

      // Automatically reject all other pending offers for this property since it's now sold
      await Offer.updateManyOffers(
        req.db,
        { 
          propertyId: offer.propertyId, 
          _id: { $ne: offer._id }, 
          status: 'pending' 
        },
        { $set: { status: 'rejected', rejectedReason: 'Property has been sold to another buyer' } }
      );
      console.log(`📧 Automatically rejected all other pending offers for sold property ${offer.propertyId}`);

      // Remove sold property from all user wishlists automatically
      const Wishlist = require('../models/Wishlist');
      await req.db.collection('wishlists').deleteMany({ propertyId: offer.propertyId });
      console.log(`🗑️ Automatically removed sold property ${offer.propertyId} from all user wishlists`);
    } catch (error) {
      console.error('Error updating property status after sale:', error);
      // Don't fail the payment confirmation if property update fails
    }

    res.status(200).json({
      success: true,
      message: 'Payment confirmed and offer updated',
      offer: offer
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message });
  }
};