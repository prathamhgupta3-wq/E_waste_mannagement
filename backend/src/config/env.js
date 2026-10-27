const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ecocircuit_db?schema=public',
  supabase: {
    url: process.env.SUPABASE_URL || 'https://demo.supabase.co',
    jwtSecret: process.env.SUPABASE_JWT_SECRET || 'demo-supabase-jwt-secret'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'ecocircuit_secure_super_secret_jwt_key_2026_dev',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200
  }
};

module.exports = config;
