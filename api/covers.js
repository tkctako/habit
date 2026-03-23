const { pool, cors, getUser } = require('./db');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: 'Not authenticated' });

  const { action } = req.body || {};

  if (action === 'load') {
    const { coverId } = req.body;
    const { rows } = await pool.query('SELECT * FROM covers WHERE id=$1 AND couple_id=$2', [coverId, u.couple_id]);
    return res.json(rows[0] || null);
  }

  if (action === 'save') {
    const { coverId, imageUrl, zoom, posX, posY } = req.body;
    await pool.query(`
      INSERT INTO covers (id,couple_id,image_url,zoom,pos_x,pos_y) VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (id) DO UPDATE SET image_url=$3,zoom=$4,pos_x=$5,pos_y=$6
    `, [coverId, u.couple_id, imageUrl, zoom || 100, posX || 0, posY || 0]);
    return res.json({ ok: true });
  }

  res.status(400).json({ error: 'Unknown action' });
};
