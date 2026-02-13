const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const upload = require('../middleware/upload');
const {
  submitJobApplication,
  submitSpontaneousApplication,
  getJobApplications,
  getSpontaneousApplications,
  getJobApplicationById,
  updateJobApplicationStatus,
  deleteApplication,
  getApplicationStats,
} = require('../controller/appcontroller');

// Validation rules
const jobApplicationValidation = [
  body('jobId').notEmpty().withMessage('Job ID is required'),
  body('jobTitle').notEmpty().withMessage('Job title is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('applicantName').notEmpty().withMessage('Name is required').trim(),
  body('applicantEmail').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('coverLetter').optional().trim(),
];

const spontaneousApplicationValidation = [
  body('applicantName').notEmpty().withMessage('Name is required').trim(),
  body('applicantEmail').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

// Public routes
router.post(
  '/job',
  upload.single('resume'),
  jobApplicationValidation,
  submitJobApplication
);

router.post(
  '/spontaneous',
  upload.single('resume'),
  spontaneousApplicationValidation,
  submitSpontaneousApplication
);

// Admin routes (add authentication middleware in production)
router.get('/job', getJobApplications);
router.get('/spontaneous', getSpontaneousApplications);
router.get('/stats', getApplicationStats);
router.get('/job/:id', getJobApplicationById);
router.patch('/job/:id/status', updateJobApplicationStatus);
router.delete('/job/:id', deleteApplication);

module.exports = router;