// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  submitContact,
  getContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  getContactStats
} = require('../controller/contactController');

// Validation rules
const contactValidation = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail()
    .trim()
    .toLowerCase(),
  
  body('subject')
    .notEmpty().withMessage('Subject is required')
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Subject must be between 3 and 200 characters'),
  
  body('message')
    .notEmpty().withMessage('Message is required')
    .trim()
    .isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters')
];

// Public route - Submit contact form
router.post('/', contactValidation, submitContact);

// Admin routes (add authentication middleware in production)
router.get('/', getContacts);
router.get('/stats', getContactStats);
router.get('/:id', getContactById);
router.patch('/:id/status', updateContactStatus);
router.delete('/:id', deleteContact);

module.exports = router;