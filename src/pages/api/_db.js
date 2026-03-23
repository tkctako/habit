import pg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = 'habits-app-secret-2026';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://root:I9t6lo83apJd7EvNB1nP0RfAwy45K2br@hnd1.clusters.zeabur.com:27116/zeabur',
  max: 5,
  idleTimeoutMillis: 30000,
});

export function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth) return null;
  try {
    return jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
  } catch { return null; }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export { pool, jwt, bcrypt, JWT_SECRET };
