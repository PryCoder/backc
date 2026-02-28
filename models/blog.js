const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [500, 'Excerpt cannot exceed 500 characters']
  },
  coverImage: {
    type: String,
    default: null
  },
  author: {
    type: String,
    default: 'Admin'
  },
  tags: [{
    type: String,
    trim: true
  }],
  readTime: {
    type: Number,
    default: 5 // in minutes
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create text index for search functionality
blogSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.models.Blog || mongoose.model('Blog', blogSchema);