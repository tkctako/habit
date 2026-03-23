import { pool, jwt, bcrypt, JWT_SECRET, getUser, json } from './_db.js';

export async function POST({ request }) {
  const body = await request.json();
  const { action, email, password, newPassword, name } = body;

  if (action === 'login') {
    const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email)=LOWER($1)', [email]);
    if (!rows.length) return json({ error: 'Invalid credentials' }, 401);
    const user = rows[0];
    if (!bcrypt.compareSync(password, user.password_hash)) return json({ error: 'Invalid credentials' }, 401);
    const token = jwt.sign({ id: user.id, email: user.email, couple_id: user.couple_id }, JWT_SECRET, { expiresIn: '30d' });
    return json({ token, user: { id: user.id, email: user.email, display_name: user.display_name, emoji: user.emoji, couple_id: user.couple_id } });
  }

  if (action === 'me') {
    const u = getUser(request);
    if (!u) return json({ error: 'Not authenticated' }, 401);
    const { rows } = await pool.query('SELECT id,email,display_name,emoji,couple_id FROM users WHERE id=$1', [u.id]);
    if (!rows.length) return json({ error: 'User not found' }, 401);
    const me = rows[0];
    let partner = null;
    if (me.couple_id) {
      const p = await pool.query('SELECT id,email,display_name,emoji,couple_id FROM users WHERE couple_id=$1 AND id!=$2', [me.couple_id, me.id]);
      partner = p.rows[0] || null;
    }
    return json({ me, partner });
  }

  if (action === 'updateName') {
    const u = getUser(request);
    if (!u) return json({ error: 'Not authenticated' }, 401);
    await pool.query('UPDATE users SET display_name=$1 WHERE id=$2', [name, u.id]);
    return json({ ok: true });
  }

  if (action === 'updatePassword') {
    const u = getUser(request);
    if (!u) return json({ error: 'Not authenticated' }, 401);
    const hash = bcrypt.hashSync(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, u.id]);
    return json({ ok: true });
  }

  return json({ error: 'Unknown action' }, 400);
}
