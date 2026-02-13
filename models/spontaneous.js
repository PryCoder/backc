const mongoose = require('mongoose');

const spontaneousApplicationSchema = new mongoose.Schema({
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
    enum: ['pending', 'reviewed', 'contacted', 'archived'],
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

module.exports = mongoose.model('SpontaneousApplication', spontaneousApplicationSchema);