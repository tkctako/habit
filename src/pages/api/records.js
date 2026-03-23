import { pool, getUser, json } from './_db.js';

export async function POST({ request }) {
  const u = getUser(request);
  if (!u) return json({ error: 'Not authenticated' }, 401);
  const body = await request.json();
  const { action } = body;

  if (action === 'today') {
    const today = body.date || new Date().toISOString().split('T')[0];
    const { rows: habits } = await pool.query('SELECT * FROM habits WHERE couple_id=$1 ORDER BY created_at', [u.couple_id]);
    const habitIds = habits.map(h => h.id);
    const { rows: records } = await pool.query(
      'SELECT r.*, u.display_name, u.emoji FROM records r JOIN users u ON r.user_id=u.id WHERE r.habit_id=ANY($1) AND r.date=$2 ORDER BY r.created_at DESC',
      [habitIds, today]
    );
    const { rows: checkIns } = await pool.query(
      'SELECT * FROM check_ins WHERE habit_id=ANY($1) AND date=$2',
      [habitIds, today]
    );
    return json({ habits, records, checkIns, today });
  }

  if (action === 'list') {
    const { habitId } = body;
    const { rows } = await pool.query('SELECT r.*, u.display_name, u.emoji FROM records r JOIN users u ON r.user_id=u.id WHERE r.habit_id=$1 ORDER BY r.date DESC', [habitId]);
    const { rows: cks } = await pool.query('SELECT * FROM check_ins WHERE habit_id=$1', [habitId]);
    return json({ records: rows, checkIns: cks });
  }

  if (action === 'add') {
    const { habitId, date, content } = body;
    await pool.query('INSERT INTO records (habit_id,user_id,date,content) VALUES ($1,$2,$3,$4)', [habitId, u.id, date, JSON.stringify(content)]);
    // Create check-in entry (unchecked) so it shows on calendar, but don't auto-mark done
    const { rows } = await pool.query('SELECT * FROM check_ins WHERE habit_id=$1 AND user_id=$2 AND date=$3', [habitId, u.id, date]);
    if (!rows.length) {
      await pool.query('INSERT INTO check_ins (habit_id,user_id,date,done) VALUES ($1,$2,$3,false)', [habitId, u.id, date]);
    }
    return json({ ok: true });
  }

  if (action === 'update') {
    const { id, date, content } = body;
    // Get old record to know old date and habit_id
    const { rows: old } = await pool.query('SELECT * FROM records WHERE id=$1 AND user_id=$2', [id, u.id]);
    if (!old.length) return json({ error: 'Not found' }, 404);
    const oldRec = old[0];
    await pool.query('UPDATE records SET date=$1,content=$2 WHERE id=$3 AND user_id=$4', [date, JSON.stringify(content), id, u.id]);

    // If date changed, move check_in from old date to new date
    if (oldRec.date !== date) {
      // Remove old check_in if no other records exist on that date for this habit+user
      const { rows: remaining } = await pool.query(
        'SELECT id FROM records WHERE habit_id=$1 AND user_id=$2 AND date=$3 AND id!=$4',
        [oldRec.habit_id, u.id, oldRec.date, id]
      );
      if (!remaining.length) {
        await pool.query('DELETE FROM check_ins WHERE habit_id=$1 AND user_id=$2 AND date=$3', [oldRec.habit_id, u.id, oldRec.date]);
      }
      // Create check_in on new date (unchecked)
      const { rows: existing } = await pool.query(
        'SELECT id FROM check_ins WHERE habit_id=$1 AND user_id=$2 AND date=$3',
        [oldRec.habit_id, u.id, date]
      );
      if (!existing.length) {
        await pool.query('INSERT INTO check_ins (habit_id,user_id,date,done) VALUES ($1,$2,$3,false)', [oldRec.habit_id, u.id, date]);
      }
    }
    return json({ ok: true });
  }

  if (action === 'delete') {
    const { id } = body;
    // Get record info before deleting
    const { rows: rec } = await pool.query('SELECT * FROM records WHERE id=$1 AND user_id=$2', [id, u.id]);
    await pool.query('DELETE FROM records WHERE id=$1 AND user_id=$2', [id, u.id]);
    // Remove check_in if no other records exist on that date for this habit+user
    if (rec.length) {
      const r = rec[0];
      const { rows: remaining } = await pool.query(
        'SELECT id FROM records WHERE habit_id=$1 AND user_id=$2 AND date=$3',
        [r.habit_id, u.id, r.date]
      );
      if (!remaining.length) {
        await pool.query('DELETE FROM check_ins WHERE habit_id=$1 AND user_id=$2 AND date=$3', [r.habit_id, u.id, r.date]);
      }
    }
    return json({ ok: true });
  }

  return json({ error: 'Unknown action' }, 400);
}
