'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const dbModule = require('./db'); // sql.js wrapper

const app = express();

app.use(cors());
app.use(express.json());

// ── Health check ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status : 'Dayflow HRMS API is running',
    version: '1.0.0',
    docs   : 'See README.md for full API reference'
  });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/employees',  require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leave',      require('./routes/leave'));
app.use('/api/assistant',  require('./routes/assistant'));

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {  // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    // Wait for sql.js (pure-JS SQLite) to initialise + seed the DB
    await dbModule.ready;
    console.log('✅  Database ready');

    app.listen(PORT, () => {
      console.log(`🚀  Dayflow backend running on http://localhost:${PORT}`);
      console.log(`    Admin login → admin@dayflow.com / Admin@123`);
    });
  } catch (err) {
    console.error('❌  Failed to initialise database:', err);
    process.exit(1);
  }
})();
