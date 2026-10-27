const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const config = require('./config/env');
const apiLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Route modules
const authRoutes = require('./routes/authRoutes');
const pickupRoutes = require('./routes/pickupRoutes');
const collectorRoutes = require('./routes/collectorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app = express();

// Security: Helmet with tailored Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to allow CDN styles, fonts, and inline scripts from existing frontend
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Demo-User']
  })
);

// Body Parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Rate Limiting on API routes
app.use('/api', apiLimiter);

// API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'EcoCircuit Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/collector', collectorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);

// Serve Existing Frontend Files
const frontendDir = path.resolve(__dirname, '../../');
app.use(express.static(frontendDir));

// Fallback to code.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'code.html'));
});

// 404 Handler for undefined API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route '${req.method} ${req.originalUrl}' not found.`
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
