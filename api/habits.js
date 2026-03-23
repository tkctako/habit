const { pool, cors, getUser } = require('./db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: 'Not authenticated' });

  const { action } = req.body || {};

  if (req.method === 'GET' || action === 'list') {
    const { rows: habits } = await pool.query('SELECT * FROM habits WHERE couple_id=$1 ORDER BY created_at', [u.couple_id]);
    const today = new Date().toISOString().split('T')[0];
    const { rows: cks } = await pool.query('SELECT * FROM check_ins WHERE date=$1 AND habit_id=ANY($2)', [today, habits.map(h => h.id)]);
    
    // Get partner
    const { rows: users } = await pool.query('SELECT id,display_name,emoji FROM users WHERE couple_id=$1', [u.couple_id]);
    const me = users.find(x => x.id === u.id);
    const partner = users.find(x => x.id !== u.id);
    
    const result = habits.map(h => {
      if (h.type === 'shared') {
        const myC = cks.find(c => c.habit_id === h.id && c.user_id === u.id);
        const bfC = cks.find(c => c.habit_id === h.id && c.user_id === partner?.id);
        return { id: h.id, name: h.name, type: 'shared', category: h.category,
          users: [
            { name: '我', emoji: me?.emoji || '👩', streak: 0, done: !!myC?.done },
            { name: '男友', emoji: partner?.emoji || '👦', streak: 0, done: !!bfC?.done }
          ] };
      } else {
        const isMe = h.created_by === u.id;
        const ck = cks.find(c => c.habit_id === h.id && c.user_id === h.created_by);
        return { id: h.id, name: h.name, type: 'personal', owner: isMe ? 'me' : 'bf', category: h.category, streak: 0, done: !!ck?.done };
      }
    });
    return res.json(result);
  }

  if (action === 'add') {
    const { name, type, category } = req.body;
    await pool.query('INSERT INTO habits (name,type,category,couple_id,created_by) VALUES ($1,$2,$3,$4,$5)', [name, type || 'shared', category || '', u.couple_id, u.id]);
    return res.json({ ok: true });
  }

  if (action === 'update') {
    const { id, name, type, category } = req.body;
    await pool.query('UPDATE habits SET name=$1,type=$2,category=$3 WHERE id=$4 AND couple_id=$5', [name, type, category, id, u.couple_id]);
    return res.json({ ok: true });
  }

  if (action === 'delete') {
    const { id } = req.body;
    await pool.query('DELETE FROM habits WHERE id=$1 AND couple_id=$2', [id, u.couple_id]);
    return res.json({ ok: true });
  }

  if (action === 'toggleCheckIn') {
    const { habitId, date } = req.body;
    const d = date || new Date().toISOString().split('T')[0];
    const { rows } = await pool.query('SELECT * FROM check_ins WHERE habit_id=$1 AND user_id=$2 AND date=$3', [habitId, u.id, d]);
    if (rows.length) {
      await pool.query('UPDATE check_ins SET done=NOT done WHERE id=$1', [rows[0].id]);
    } else {
      await pool.query('INSERT INTO check_ins (habit_id,user_id,date,done) VALUES ($1,$2,$3,true)', [habitId, u.id, d]);
    }
    return res.json({ ok: true });
  }

  if (action === 'monthCheckIns') {
    const { year, month, habitIds } = req.body;
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const { rows } = await pool.query('SELECT * FROM check_ins WHERE habit_id=ANY($1) AND date>=$2 AND date<=$3', [habitIds, start, end]);
    return res.json(rows);
  }

  res.status(400).json({ error: 'Unknown action' });
};
