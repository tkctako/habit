const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = 'habits-app-secret-2026';

const pool = new Pool({
  connectionString: 'postgresql://root:I9t6lo83apJd7EvNB1nP0RfAwy45K2br@hnd1.clusters.zeabur.com:27116/zeabur',
  max: 5,
  idleTimeoutMillis: 30000,
});

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function getUser(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  try {
    return jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
  } catch { return null; }
}

module.exports = { pool, jwt, bcrypt, JWT_SECRET, cors, getUser };
