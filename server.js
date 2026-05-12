require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// ── Security ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,    // Allow inline scripts & CDN loads for face-api.js
  crossOriginEmbedderPolicy: false // Allow loading CDN resources
}));
app.use(cors());
app.use(express.json({ limit: '2mb' }));  // Face descriptors can be large
app.set('trust proxy', 1);                // Required for Render — gets real client IP

// ── Rate Limiting ─────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/', apiLimiter);

// ── Serve Frontend ────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/attendance', require('./routes/attendance'));

// ── Geo config endpoint ──
app.get('/api/config/geo', (req, res) => {
  res.json({
    lat: parseFloat(process.env.OFFICE_LAT),
    lng: parseFloat(process.env.OFFICE_LNG),
    radius: parseInt(process.env.OFFICE_RADIUS_METERS, 10) || 100
  });
});

// ── Connect DB & Start Server ─────────────────────────────
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    // Drop the old unique index if it exists to allow multiple shifts per day
    try {
      await mongoose.connection.collection('attendances').dropIndex('userId_1_date_1');
      console.log('✅ Legacy unique index dropped');
    } catch (e) {
      // Index might already be gone, which is fine
    }
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
