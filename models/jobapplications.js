const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  jobId: {
    type: Number,
    required: true,
  },
  jobTitle: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  applicantName: {
    type: String,
    required: true,
    trim: true,
  },
  applicantEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  coverLetter: {
    type: String,
    default: '',
  },
  resumeUrl: {
    type: String,
    required: true,
  },
  resumePublicId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected'],
    default: 'pending',
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
  notes: {
    type: String,
    default: '',
  },
});

module.exports = mongoose.model('JobApplication', jobApplicationSchema);