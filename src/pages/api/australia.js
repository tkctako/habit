import { pool, getUser, json } from './_db.js';

export async function POST({ request }) {
  const u = getUser(request);
  if (!u) return json({ error: 'Not authenticated' }, 401);
  const body = await request.json();
  const { action } = body;

  if (action === 'list') {
    const { rows } = await pool.query('SELECT * FROM australia_items WHERE couple_id=$1 ORDER BY created_at', [u.couple_id]);
    return json(rows);
  }

  if (action === 'add') {
    const { title, category, priority, description, reference, notes } = body;
    await pool.query(
      'INSERT INTO australia_items (couple_id,title,category,priority,description,reference,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [u.couple_id, title, category || '行前準備', priority || '中優先', description || '', reference || '', notes || '', u.id]
    );
    return json({ ok: true });
  }

  if (action === 'update') {
    const { id, title, category, priority, description, reference, notes } = body;
    await pool.query(
      'UPDATE australia_items SET title=$1,category=$2,priority=$3,description=$4,reference=$5,notes=$6 WHERE id=$7 AND couple_id=$8',
      [title, category, priority, description || '', reference || '', notes || '', id, u.couple_id]
    );
    return json({ ok: true });
  }

  if (action === 'toggle') {
    const { id } = body;
    await pool.query('UPDATE australia_items SET done=NOT done WHERE id=$1 AND couple_id=$2', [id, u.couple_id]);
    return json({ ok: true });
  }

  if (action === 'delete') {
    const { id } = body;
    await pool.query('DELETE FROM australia_items WHERE id=$1 AND couple_id=$2', [id, u.couple_id]);
    return json({ ok: true });
  }

  return json({ error: 'Unknown action' }, 400);
}
