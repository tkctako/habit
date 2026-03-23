const { pool, cors, getUser } = require('./db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: 'Not authenticated' });

  const { action } = req.body || {};

  if (action === 'list') {
    const { habitId } = req.body;
    const { rows } = await pool.query('SELECT r.*, u.display_name, u.emoji FROM records r JOIN users u ON r.user_id=u.id WHERE r.habit_id=$1 ORDER BY r.date DESC', [habitId]);
    // Also get check_ins for this habit
    const { rows: cks } = await pool.query('SELECT * FROM check_ins WHERE habit_id=$1', [habitId]);
    return res.json({ records: rows, checkIns: cks });
  }

  if (action === 'add') {
    const { habitId, date, content } = req.body;
    await pool.query('INSERT INTO records (habit_id,user_id,date,content) VALUES ($1,$2,$3,$4)', [habitId, u.id, date, JSON.stringify(content)]);
    // Auto check-in for today
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      const { rows } = await pool.query('SELECT * FROM check_ins WHERE habit_id=$1 AND user_id=$2 AND date=$3', [habitId, u.id, today]);
      if (!rows.length) {
        await pool.query('INSERT INTO check_ins (habit_id,user_id,date,done) VALUES ($1,$2,$3,true)', [habitId, u.id, today]);
      } else if (!rows[0].done) {
        await pool.query('UPDATE check_ins SET done=true WHERE id=$1', [rows[0].id]);
      }
    }
    return res.json({ ok: true });
  }

  if (action === 'update') {
    const { id, date, content } = req.body;
    await pool.query('UPDATE records SET date=$1,content=$2 WHERE id=$3 AND user_id=$4', [date, JSON.stringify(content), id, u.id]);
    return res.json({ ok: true });
  }

  if (action === 'delete') {
    const { id } = req.body;
    await pool.query('DELETE FROM records WHERE id=$1 AND user_id=$2', [id, u.id]);
    return res.json({ ok: true });
  }

  res.status(400).json({ error: 'Unknown action' });
};
