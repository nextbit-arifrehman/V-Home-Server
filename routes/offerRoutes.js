// routes/offerRoutes.js

const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const verifyJWT = require('../middlewares/verifyJWT');
const verifyRole = require('../middlewares/verifyRole');

// All routes are protected - user must be logged in
router.use(verifyJWT);

// User routes
router.post('/', verifyRole('user'), offerController.makeOffer); // User makes an offer on a property
router.get('/my-offers', verifyRole('user'), offerController.getMyOffers); // User views their pending/accepted/rejected offers
router.get('/my-bought-properties', verifyRole('user'), offerController.getUserBoughtProperties); // User views bought properties (Property Bought page)
router.delete('/:id', verifyRole('user'), offerController.cancelOffer); // User cancels pending offer

// Agent routes
router.get('/agent/requested-properties', verifyRole('agent'), offerController.getRequestedOffers); // Offers received by agent
router.get('/agent/sold-properties', verifyRole('agent'), offerController.getSoldPropertiesByAgent); // Agent views their sold properties
router.get('/agent/total-sold-amount', verifyRole('agent'), offerController.getTotalSoldAmountByAgent); // Agent views their total sold amount
router.patch('/agent/accept/:id', verifyRole('agent'), offerController.respondToOffer);
router.patch('/agent/reject/:id', verifyRole('agent'), offerController.respondToOffer);

// After payment, user updates offer status to bought (optional)
router.patch('/user/pay/:id', verifyRole('user'), offerController.markOfferAsBought);

module.exports = router;
