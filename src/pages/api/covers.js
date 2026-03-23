import { pool, getUser, json } from './_db.js';

export async function POST({ request }) {
  const u = getUser(request);
  if (!u) return json({ error: 'Not authenticated' }, 401);
  const body = await request.json();
  const { action } = body;

  if (action === 'load') {
    const { coverId } = body;
    const { rows } = await pool.query('SELECT * FROM covers WHERE id=$1 AND couple_id=$2', [coverId, u.couple_id]);
    return json(rows[0] || null);
  }

  if (action === 'saveQuotes') {
    const { quotes } = body;
    const quotesJson = JSON.stringify(quotes || []);
    await pool.query(`
      INSERT INTO covers (id,couple_id,image_url,zoom,pos_x,pos_y) VALUES ($1,$2,$3,100,0,0)
      ON CONFLICT (id) DO UPDATE SET image_url=$3
    `, ['quotes', u.couple_id, quotesJson]);
    return json({ ok: true });
  }

  if (action === 'save') {
    const { coverId, imageUrl, zoom, posX, posY } = body;
    await pool.query(`
      INSERT INTO covers (id,couple_id,image_url,zoom,pos_x,pos_y) VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (id) DO UPDATE SET image_url=$3,zoom=$4,pos_x=$5,pos_y=$6
    `, [coverId, u.couple_id, imageUrl, zoom || 100, posX || 0, posY || 0]);
    return json({ ok: true });
  }

  return json({ error: 'Unknown action' }, 400);
}
