const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import configurations
const connectDB = require('./config/db');
// Import routes
const applicationRoutes = require('./routes/appRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const contactRoutes = require('./routes/contactRoutes');
const blogRoutes = require('./routes/blogRoutes.js');

// Connect to MongoDB
connectDB();

const app = express();

// ---------------------
// CORS Configuration
// ---------------------
const allowedOrigins = [
  'https://avx-delta.vercel.app',
  'http://localhost:5173', // for local development
  'http://localhost:3000', // for local development
  'http://localhost:5000', // for local development
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Preflight for all routes
app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
}));

// ---------------------
// Middleware
// ---------------------
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // allow cross-origin static resources
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ---------------------
// Static files
// ---------------------
app.use('/uploads', express.static('uploads'));

// ---------------------
// Routes
// ---------------------
app.use('/api/applications', applicationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/contacts', contactRoutes);
app.use("/api/blogs", blogRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Job Application API',
    version: '1.0.0',
    endpoints: {
      applications: '/api/applications',
      upload: '/api/upload',
      health: '/health',
    },
  });
});

// ---------------------
// Error handling middleware
// ---------------------
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message),
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry found',
    });
  }

  if (err.message === 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large. Maximum size is 5MB.',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ---------------------
// Start server
// ---------------------
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;
