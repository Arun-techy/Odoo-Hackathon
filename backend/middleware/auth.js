'use strict';

/**
 * middleware/auth.js
 * JWT verification + role-based access control helpers.
 */

const jwt = require('jsonwebtoken');

/* ──────────────────────────────────────────────────────────────────────────
   verifyToken
   Reads  Authorization: Bearer <token>  header, verifies the JWT, and
   attaches the decoded payload to  req.user  { id, email, role }.
   Returns 401 on missing / invalid / expired tokens.
────────────────────────────────────────────────────────────────────────── */
function verifyToken(req, res, next) {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required — no token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      const msg = err.name === 'TokenExpiredError'
        ? 'Token expired — please log in again'
        : 'Invalid token';
      return res.status(401).json({ error: msg });
    }
    req.user = decoded; // { id, email, role }
    next();
  });
}

/* ──────────────────────────────────────────────────────────────────────────
   requireAdmin
   Must be placed AFTER verifyToken in the middleware chain.
   Returns 403 for non-admin callers.
────────────────────────────────────────────────────────────────────────── */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { verifyToken, requireAdmin };
