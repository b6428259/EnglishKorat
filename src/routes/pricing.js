/**
 * Pricing Management Routes
 * RESTful API routes for the comprehensive pricing system
 */

const express = require('express');
const {
  getCategories,
  getDurations,
  getPricingTiers,
  getPricingMatrix,
  calculatePricing,
  calculateSavings,
  getCoursePricing,
  updateCoursePricing,
  recalculateEnrollmentPricing,
  getPricingHistory,
  getPricingAnalytics
} = require('../controllers/pricingController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Pricing configuration routes
router
  .route('/categories')
  .get(getCategories);

router
  .route('/durations')
  .get(getDurations);

router
  .route('/tiers')
  .get(getPricingTiers);

// Pricing calculation routes
router
  .route('/matrix/:categoryId/:durationId')
  .get(getPricingMatrix);

router
  .route('/calculate')
  .post(calculatePricing);

router
  .route('/savings')
  .post(calculateSavings);

// Course-specific pricing routes
router
  .route('/course/:courseId')
  .get(getCoursePricing)
  .put(authorize('admin', 'owner'), updateCoursePricing);

// Enrollment pricing management routes
router
  .route('/recalculate/:enrollmentId')
  .post(authorize('admin', 'owner'), recalculateEnrollmentPricing);

router
  .route('/history/:enrollmentId')
  .get(getPricingHistory);

// Analytics routes
router
  .route('/analytics')
  .get(authorize('admin', 'owner'), getPricingAnalytics);

module.exports = router;