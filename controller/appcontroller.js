const JobApplication = require('../models/jobapplications');
const SpontaneousApplication = require('../models/spontaneous');
const { cloudinary } = require('../config/cloudinary');
const { sendApplicationConfirmation, sendAdminNotification } = require('../utils/email');

// @desc    Submit job application
// @route   POST /api/applications/job
// @access  Public
const submitJobApplication = async (req, res) => {
  try {
    const { jobId, jobTitle, department, applicantName, applicantEmail, coverLetter } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resume file is required',
      });
    }

    // Create new application
    const application = new JobApplication({
      jobId,
      jobTitle,
      department,
      applicantName,
      applicantEmail,
      coverLetter,
      resumeUrl: req.file.path,
      resumePublicId: req.file.filename,
    });

    await application.save();

    // Send confirmation email
    try {
      await sendApplicationConfirmation({
        email: applicantEmail,
        name: applicantName,
        jobTitle,
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue even if email fails
    }

    // Send admin notification
    try {
      await sendAdminNotification({
        type: 'job',
        application,
      });
    } catch (emailError) {
      console.error('Admin notification failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        id: application._id,
        applicantName: application.applicantName,
        jobTitle: application.jobTitle,
        appliedAt: application.appliedAt,
      },
    });
  } catch (error) {
    console.error('Job application error:', error);
    
    // Delete uploaded file if database save fails
    if (req.file && req.file.filename) {
      await cloudinary.uploader.destroy(req.file.filename);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message,
    });
  }
};

// @desc    Submit spontaneous application
// @route   POST /api/applications/spontaneous
// @access  Public
const submitSpontaneousApplication = async (req, res) => {
  try {
    const { applicantName, applicantEmail } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resume file is required',
      });
    }

    // Create new spontaneous application
    const application = new SpontaneousApplication({
      applicantName,
      applicantEmail,
      resumeUrl: req.file.path,
      resumePublicId: req.file.filename,
    });

    await application.save();

    // Send confirmation email
    try {
      await sendApplicationConfirmation({
        email: applicantEmail,
        name: applicantName,
        type: 'spontaneous',
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // Send admin notification
    try {
      await sendAdminNotification({
        type: 'spontaneous',
        application,
      });
    } catch (emailError) {
      console.error('Admin notification failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        id: application._id,
        applicantName: application.applicantName,
        appliedAt: application.appliedAt,
      },
    });
  } catch (error) {
    console.error('Spontaneous application error:', error);
    
    // Delete uploaded file if database save fails
    if (req.file && req.file.filename) {
      await cloudinary.uploader.destroy(req.file.filename);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message,
    });
  }
};

// @desc    Get all job applications
// @route   GET /api/applications/job
// @access  Private/Admin
const getJobApplications = async (req, res) => {
  try {
    const { status, jobId, startDate, endDate, page = 1, limit = 10 } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (jobId) query.jobId = jobId;
    if (startDate || endDate) {
      query.appliedAt = {};
      if (startDate) query.appliedAt.$gte = new Date(startDate);
      if (endDate) query.appliedAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const applications = await JobApplication.find(query)
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobApplication.countDocuments(query);

    res.status(200).json({
      success: true,
      data: applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message,
    });
  }
};

// @desc    Get all spontaneous applications
// @route   GET /api/applications/spontaneous
// @access  Private/Admin
const getSpontaneousApplications = async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (startDate || endDate) {
      query.appliedAt = {};
      if (startDate) query.appliedAt.$gte = new Date(startDate);
      if (endDate) query.appliedAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const applications = await SpontaneousApplication.find(query)
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SpontaneousApplication.countDocuments(query);

    res.status(200).json({
      success: true,
      data: applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get spontaneous applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message,
    });
  }
};

// @desc    Get single application
// @route   GET /api/applications/job/:id
// @access  Private/Admin
const getJobApplicationById = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error('Get job application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application',
      error: error.message,
    });
  }
};

// @desc    Update application status
// @route   PATCH /api/applications/job/:id/status
// @access  Private/Admin
const updateJobApplicationStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const application = await JobApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    application.status = status || application.status;
    if (notes !== undefined) application.notes = notes;
    if (status && ['reviewed', 'shortlisted', 'rejected'].includes(status)) {
      application.reviewedAt = new Date();
    }

    await application.save();

    res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      data: application,
    });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application',
      error: error.message,
    });
  }
};

// @desc    Delete application
// @route   DELETE /api/applications/job/:id
// @access  Private/Admin
const deleteApplication = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Delete file from Cloudinary
    if (application.resumePublicId) {
      await cloudinary.uploader.destroy(application.resumePublicId);
    }

    await application.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete application',
      error: error.message,
    });
  }
};

// @desc    Get application statistics
// @route   GET /api/applications/stats
// @access  Private/Admin
const getApplicationStats = async (req, res) => {
  try {
    const totalJobApplications = await JobApplication.countDocuments();
    const totalSpontaneousApplications = await SpontaneousApplication.countDocuments();
    
    const jobApplicationsByStatus = await JobApplication.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const spontaneousByStatus = await SpontaneousApplication.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const applicationsByJob = await JobApplication.aggregate([
      {
        $group: {
          _id: { jobId: '$jobId', jobTitle: '$jobTitle' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const recentApplications = await JobApplication.find()
      .sort({ appliedAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        total: {
          job: totalJobApplications,
          spontaneous: totalSpontaneousApplications,
          all: totalJobApplications + totalSpontaneousApplications,
        },
        jobApplicationsByStatus,
        spontaneousByStatus,
        applicationsByJob,
        recentApplications,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
};

module.exports = {
  submitJobApplication,
  submitSpontaneousApplication,
  getJobApplications,
  getSpontaneousApplications,
  getJobApplicationById,
  updateJobApplicationStatus,
  deleteApplication,
  getApplicationStats,
};