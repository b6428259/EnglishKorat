const express = require('express');
const { body, param, query } = require('express-validator');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  createLeavePolicyRule,
  updateLeavePolicyRule,
  getLeavePolicyRules,
  getLeavePolicyRuleById
} = require('../controllers/leavePolicyController');

const router = express.Router();

// Validation rules
const createLeavePolicyValidation = [
  body('rule_name')
    .notEmpty()
    .withMessage('Rule name is required')
    .isLength({ max: 200 })
    .withMessage('Rule name cannot exceed 200 characters'),
  body('course_type')
    .isIn([
      'private', 'pair', 'group_small', 'group_large',
      'conversation_kids', 'conversation_adults', 'english_4skills',
      'ielts_prep', 'toeic_prep', 'toefl_prep',
      'chinese_conversation', 'chinese_4skills'
    ])
    .withMessage('Invalid course type'),
  body('course_hours')
    .isInt({ min: 1, max: 200 })
    .withMessage('Course hours must be a positive integer between 1 and 200'),
  body('max_students')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Max students must be between 1 and 20'),
  body('leave_credits')
    .isInt({ min: 0, max: 50 })
    .withMessage('Leave credits must be between 0 and 50'),
  body('price_per_hour')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Price per hour must be a valid decimal with up to 2 decimal places')
    .custom(value => value >= 0)
    .withMessage('Price per hour cannot be negative'),
  body('effective_date')
    .isISO8601()
    .withMessage('Effective date must be a valid ISO 8601 date'),
  body('expiry_date')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO 8601 date')
];

const updateLeavePolicyValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Policy rule ID must be a positive integer'),
  body('change_reason')
    .notEmpty()
    .withMessage('Change reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Change reason must be between 10 and 500 characters'),
  body('rule_name')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Rule name cannot exceed 200 characters'),
  body('course_type')
    .optional()
    .isIn([
      'private', 'pair', 'group_small', 'group_large',
      'conversation_kids', 'conversation_adults', 'english_4skills',
      'ielts_prep', 'toeic_prep', 'toefl_prep',
      'chinese_conversation', 'chinese_4skills'
    ])
    .withMessage('Invalid course type'),
  body('course_hours')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Course hours must be a positive integer between 1 and 200'),
  body('max_students')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Max students must be between 1 and 20'),
  body('leave_credits')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Leave credits must be between 0 and 50'),
  body('price_per_hour')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Price per hour must be a valid decimal with up to 2 decimal places')
    .custom(value => value >= 0)
    .withMessage('Price per hour cannot be negative'),
  body('effective_date')
    .optional()
    .isISO8601()
    .withMessage('Effective date must be a valid ISO 8601 date'),
  body('expiry_date')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO 8601 date')
];

const getListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('branch_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Branch ID must be a positive integer'),
  query('course_type')
    .optional()
    .isIn([
      'private', 'pair', 'group_small', 'group_large',
      'conversation_kids', 'conversation_adults', 'english_4skills',
      'ielts_prep', 'toeic_prep', 'toefl_prep',
      'chinese_conversation', 'chinese_4skills'
    ])
    .withMessage('Invalid course type'),
  query('status')
    .optional()
    .isIn(['draft', 'active', 'inactive', 'archived'])
    .withMessage('Invalid status')
];

const getByIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Policy rule ID must be a positive integer')
];

// Routes
router.post(
  '/',
  authMiddleware,
  authorize(['admin', 'owner']),
  createLeavePolicyValidation,
  validate,
  createLeavePolicyRule
);

router.put(
  '/:id',
  authMiddleware,
  authorize(['admin', 'owner']),
  updateLeavePolicyValidation,
  validate,
  updateLeavePolicyRule
);

router.get(
  '/',
  authMiddleware,
  getListValidation,
  validate,
  getLeavePolicyRules
);

router.get(
  '/:id',
  authMiddleware,
  getByIdValidation,
  validate,
  getLeavePolicyRuleById
);

module.exports = router;