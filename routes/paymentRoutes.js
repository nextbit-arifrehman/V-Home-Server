const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const verifyJWT = require('../middlewares/verifyJWT');
const verifyRole = require('../middlewares/verifyRole');

// Route to create a Stripe Payment Intent
// This route should be protected and typically only accessible by authenticated users (e.g., 'user' role)
router.post('/create-payment-intent', verifyJWT, verifyRole('user'), paymentController.createPaymentIntent);

// Route to confirm payment completion
router.post('/confirm-payment', verifyJWT, verifyRole('user'), paymentController.confirmPayment);

module.exports = router;