// controllers/contactController.js
const Contact = require('../models/contact');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { validationResult } = require('express-validator');
const { sendContactConfirmation, sendAdminNotification } = require('../utils/email'); // Updated import

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Advanced content moderation using Gemini API for multiple languages
// @access  Private
const moderateContent = async (content) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Using latest model for better multi-language support
    
    const prompt = `You are an advanced content moderation system. Analyze this message for inappropriate content including:
    
    1. Profanity in ANY language (English, Hindi, Spanish, Arabic, Chinese, etc.)
    2. Regional slangs and "galli" (Indian/Hindi/Punjabi/Urdu gaalis)
    3. Hate speech, threats, harassment, bullying
    4. Spam, scams, phishing attempts
    5. Sexually explicit content
    6. Violence or gore
    7. Personal information sharing

    Message to analyze:
    Subject: "${content.subject}"
    Message: "${content.message}"
    
    Return a STRICT JSON response with:
    - isAppropriate: boolean (false if ANY inappropriate content detected)
    - toxicityScore: number between 0-1 (1 being most toxic)
    - language: detected primary language (e.g., "en", "hi", "es", "ur", "pa", "bn", "mr", "ta", "te", "ml", "kn", "gu", "or")
    - detectedLanguages: array of languages detected in the message
    - flags: array of objects with:
        * category: string (profanity/hate_speech/threats/spam/sexual/violence/phishing/pii)
        * confidence: number 0-1
        * text: the flagged text snippet
        * language: language of the flagged text
    - inappropriateTerms: array of strings (specific inappropriate terms found)
    - hasGalli: boolean (specifically for Indian regional slangs)
    - threatLevel: string (low/medium/high)
    - requiresReview: boolean (true if borderline case needs human review)
    
    Be VERY strict. ANY inappropriate word in ANY language should mark isAppropriate as false.
    Consider common misspellings, leetspeak, and attempts to bypass filters.
    
    Return ONLY the JSON object, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    const cleanText = text.replace(/```json|```|`/g, '').trim();
    const moderationResult = JSON.parse(cleanText);
    
    // Add timestamp
    moderationResult.moderatedAt = new Date();
    
    // Log for monitoring
    console.log('Moderation result:', {
      isAppropriate: moderationResult.isAppropriate,
      language: moderationResult.language,
      toxicityScore: moderationResult.toxicityScore,
      flags: moderationResult.flags?.length || 0
    });
    
    return moderationResult;
    
  } catch (error) {
    console.error('Gemini moderation error:', error);
    
    // Fallback to a safer approach - flag for manual review
    return {
      isAppropriate: true, // Allow but mark for review
      toxicityScore: 0.5,
      language: 'unknown',
      detectedLanguages: ['unknown'],
      flags: [{
        category: 'moderation_error',
        confidence: 1,
        text: 'Moderation system error',
        language: 'system'
      }],
      inappropriateTerms: [],
      hasGalli: false,
      threatLevel: 'unknown',
      requiresReview: true,
      error: error.message,
      moderatedAt: new Date()
    };
  }
};

// @desc    Submit contact form with Gemini moderation
// @route   POST /api/contact
// @access  Public
const submitContact = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, subject, message } = req.body;

    // Check for empty or spammy content
    if (!message || message.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Message is too short'
      });
    }

    // Moderate content with Gemini (multi-language support)
    const moderationResult = await moderateContent({ subject, message });

    // More lenient filtering - only block clearly inappropriate content
    const isToxic = (!moderationResult.isAppropriate && moderationResult.toxicityScore > 0.6) || 
                    moderationResult.hasGalli === true;

    // Check for high-risk categories with higher confidence threshold
    const hasHighRiskFlags = moderationResult.flags?.some(flag => 
      ['hate_speech', 'threats', 'violence', 'sexual'].includes(flag.category) && 
      flag.confidence > 0.7 // Increased from 0.4 to 0.7 for stricter filtering
    );

    if (isToxic || hasHighRiskFlags) {
      // Store as spam with detailed moderation results
      const contact = new Contact({
        name,
        email,
        subject,
        message,
        status: 'spam',
        moderationResult: {
          ...moderationResult,
          moderatedAt: new Date(),
          blockedReason: 'Inappropriate content detected'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          blockedAt: new Date(),
          threatLevel: moderationResult.threatLevel || 'medium'
        }
      });

      await contact.save();

      // Return appropriate message based on content type
      let userMessage = 'Your message contains inappropriate content and cannot be sent.';
      
      if (moderationResult.hasGalli) {
        userMessage = 'आपके संदेश में अभद्र भाषा है। कृपया सभ्य भाषा का प्रयोग करें। (Your message contains inappropriate language. Please use respectful language.)';
      } else if (moderationResult.flags?.some(f => f.category === 'hate_speech')) {
        userMessage = 'Hate speech is not allowed on our platform.';
      } else if (moderationResult.flags?.some(f => f.category === 'threats')) {
        userMessage = 'Threatening content is strictly prohibited.';
      }

      return res.status(400).json({
        success: false,
        message: userMessage,
        requiresReview: moderationResult.requiresReview || false
      });
    }

    // Create contact entry for appropriate content
    const contact = new Contact({
      name,
      email,
      subject,
      message,
      status: moderationResult.requiresReview ? 'pending' : 'pending', // Always pending for initial review
      moderationResult: {
        ...moderationResult,
        moderatedAt: new Date()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        submittedAt: new Date(),
        language: moderationResult.language,
        detectedLanguages: moderationResult.detectedLanguages
      }
    });

    await contact.save();

    // Log successful submission
    console.log(`Contact submitted: ${contact._id} - Language: ${moderationResult.language}`);

    // Send confirmation email to user
    try {
      await sendContactConfirmation({
        email: contact.email,
        name: contact.name,
        subject: contact.subject,
        message: contact.message
      });
      console.log('Contact confirmation email sent to:', contact.email);
    } catch (emailError) {
      console.error('Contact confirmation email sending failed:', emailError);
      // Continue even if email fails
    }

    // Send notification email to admin
    try {
      await sendAdminNotification({
        type: 'contact',
        application: {
          id: contact._id,
          applicantName: contact.name,
          applicantEmail: contact.email,
          subject: contact.subject,
          message: contact.message,
          appliedAt: contact.createdAt,
          language: moderationResult.language,
          threatLevel: moderationResult.threatLevel
        }
      });
      console.log('Admin notification for contact sent');
    } catch (emailError) {
      console.error('Admin notification for contact failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        status: contact.status,
        createdAt: contact.createdAt
      }
    });

  } catch (error) {
    console.error('Contact submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all contacts with advanced filtering
// @route   GET /api/contact
// @access  Private/Admin
const getContacts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search, language, threatLevel, fromDate, toDate } = req.query;

    const query = {};
    if (status) query.status = status;
    if (language) query['moderationResult.language'] = language;
    if (threatLevel) query['metadata.threatLevel'] = threatLevel;
    
    // Date range filter
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { 'moderationResult.inappropriateTerms': { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (page - 1) * limit;

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(query);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single contact
// @route   GET /api/contact/:id
// @access  Private/Admin
const getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Mark as read if it was pending
    if (contact.status === 'pending') {
      contact.status = 'read';
      contact.readAt = new Date();
      await contact.save();
    }

    res.json({
      success: true,
      data: contact
    });

  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update contact status
// @route   PATCH /api/contact/:id/status
// @access  Private/Admin
const updateContactStatus = async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    
    if (!['pending', 'read', 'replied', 'spam'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    contact.status = status;
    if (status === 'replied') {
      contact.repliedAt = new Date();
    }
    if (status === 'read') {
      contact.readAt = new Date();
    }
    
    // Add review notes if provided
    if (reviewNotes) {
      contact.metadata = contact.metadata || {};
      contact.metadata.reviewNotes = reviewNotes;
      contact.metadata.reviewedAt = new Date();
      contact.metadata.reviewedBy = req.user?.id || 'admin';
    }

    await contact.save();

    res.json({
      success: true,
      message: 'Contact status updated',
      data: contact
    });

  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete contact
// @route   DELETE /api/contact/:id
// @access  Private/Admin
const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await contact.deleteOne();

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get contact statistics with language breakdown
// @route   GET /api/contact/stats
// @access  Private/Admin
const getContactStats = async (req, res) => {
  try {
    const total = await Contact.countDocuments();
    const pending = await Contact.countDocuments({ status: 'pending' });
    const read = await Contact.countDocuments({ status: 'read' });
    const replied = await Contact.countDocuments({ status: 'replied' });
    const spam = await Contact.countDocuments({ status: 'spam' });
    
    // Get recent activity
    const recent = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email subject status createdAt moderationResult.language');

    // Get moderation stats
    const flaggedMessages = await Contact.countDocuments({
      'moderationResult.isAppropriate': false
    });

    const avgToxicity = await Contact.aggregate([
      { $match: { 'moderationResult.toxicityScore': { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$moderationResult.toxicityScore' } } }
    ]);

    // Language breakdown
    const languageBreakdown = await Contact.aggregate([
      { $group: { 
        _id: '$moderationResult.language', 
        count: { $sum: 1 } 
      }},
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Threat level breakdown
    const threatLevels = await Contact.aggregate([
      { $match: { 'metadata.threatLevel': { $exists: true } } },
      { $group: { 
        _id: '$metadata.threatLevel', 
        count: { $sum: 1 } 
      }}
    ]);

    // Flag categories breakdown
    const flagCategories = await Contact.aggregate([
      { $unwind: '$moderationResult.flags' },
      { $group: { 
        _id: '$moderationResult.flags.category', 
        count: { $sum: 1 } 
      }},
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        byStatus: {
          pending,
          read,
          replied,
          spam
        },
        moderation: {
          flagged: flaggedMessages,
          averageToxicity: avgToxicity[0]?.avg || 0,
          flagCategories: flagCategories
        },
        languageBreakdown,
        threatLevels,
        recent
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Bulk update contacts status
// @route   POST /api/contact/bulk-update
// @access  Private/Admin
const bulkUpdateContacts = async (req, res) => {
  try {
    const { contactIds, status } = req.body;
    
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide contact IDs'
      });
    }

    if (!['pending', 'read', 'replied', 'spam'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const result = await Contact.updateMany(
      { _id: { $in: contactIds } },
      { 
        status,
        ...(status === 'replied' && { repliedAt: new Date() }),
        ...(status === 'read' && { readAt: new Date() })
      }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} contacts`,
      data: result
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update contacts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get moderation report
// @route   GET /api/contact/moderation-report
// @access  Private/Admin
const getModerationReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    
    const matchStage = {};
    if (fromDate || toDate) {
      matchStage.createdAt = {};
      if (fromDate) matchStage.createdAt.$gte = new Date(fromDate);
      if (toDate) matchStage.createdAt.$lte = new Date(toDate);
    }

    const report = await Contact.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          blockedMessages: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'spam'] }, 1, 0] 
            } 
          },
          avgToxicity: { $avg: '$moderationResult.toxicityScore' },
          languages: { $addToSet: '$moderationResult.language' },
          topFlaggedWords: { $push: '$moderationResult.inappropriateTerms' }
        }
      },
      {
        $project: {
          _id: 0,
          totalMessages: 1,
          blockedMessages: 1,
          blockedPercentage: {
            $multiply: [
              { $divide: ['$blockedMessages', '$totalMessages'] },
              100
            ]
          },
          avgToxicity: 1,
          uniqueLanguages: { $size: '$languages' },
          topFlaggedWords: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: report[0] || {
        totalMessages: 0,
        blockedMessages: 0,
        blockedPercentage: 0,
        avgToxicity: 0,
        uniqueLanguages: 0,
        topFlaggedWords: []
      }
    });

  } catch (error) {
    console.error('Moderation report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate moderation report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  submitContact,
  getContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  getContactStats,
  bulkUpdateContacts,
  getModerationReport
};