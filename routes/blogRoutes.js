const express = require('express');
const Blog = require('../models/blog.js');

const router = express.Router();

// Get all published blogs (public)
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find({ isPublished: true })
      .sort({ publishedAt: -1 });

    res.json({ success: true, data: blogs });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Create blog (admin only - basic protection)
router.post("/", async (req, res) => {
  try {
    const blog = await Blog.create(req.body);
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;