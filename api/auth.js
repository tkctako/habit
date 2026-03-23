const { pool, jwt, bcrypt, JWT_SECRET, cors, getUser } = require('./db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, email, password, newPassword } = req.body || {};

  if (action === 'login') {
    const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email)=LOWER($1)', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, couple_id: user.couple_id }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token, user: { id: user.id, email: user.email, display_name: user.display_name, emoji: user.emoji, couple_id: user.couple_id } });
  }

  if (action === 'me') {
    const u = getUser(req);
    if (!u) return res.status(401).json({ error: 'Not authenticated' });
    const { rows } = await pool.query('SELECT id,email,display_name,emoji,couple_id FROM users WHERE id=$1', [u.id]);
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    const me = rows[0];
    // Get partner
    let partner = null;
    if (me.couple_id) {
      const p = await pool.query('SELECT id,email,display_name,emoji,couple_id FROM users WHERE couple_id=$1 AND id!=$2', [me.couple_id, me.id]);
      partner = p.rows[0] || null;
    }
    return res.json({ me, partner });
  }

  if (action === 'updateName') {
    const u = getUser(req);
    if (!u) return res.status(401).json({ error: 'Not authenticated' });
    const { name } = req.body;
    await pool.query('UPDATE users SET display_name=$1 WHERE id=$2', [name, u.id]);
    return res.json({ ok: true });
  }

  if (action === 'updatePassword') {
    const u = getUser(req);
    if (!u) return res.status(401).json({ error: 'Not authenticated' });
    const hash = bcrypt.hashSync(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, u.id]);
    return res.json({ ok: true });
  }

  res.status(400).json({ error: 'Unknown action' });
};
