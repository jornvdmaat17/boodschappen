import { Router } from 'express';
import { query, pool } from '../db.js';

export const storesRouter = Router();

storesRouter.get('/', async (_req, res) => {
  const { rows } = await query('SELECT * FROM stores ORDER BY name');
  res.json(rows);
});

storesRouter.post('/', async (req, res) => {
  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const { rows } = await query('INSERT INTO stores (name) VALUES ($1) RETURNING *', [name.trim()]);
  res.status(201).json(rows[0]);
});

storesRouter.put('/:id', async (req, res) => {
  const { name } = req.body || {};
  const { rows } = await query('UPDATE stores SET name = $1 WHERE id = $2 RETURNING *', [
    name?.trim(),
    req.params.id,
  ]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

storesRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM stores WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

storesRouter.get('/:id/categories', async (req, res) => {
  const { rows } = await query(
    `SELECT sco.category_id, sco.order_position, c.name
     FROM store_category_order sco JOIN categories c ON c.id = sco.category_id
     WHERE sco.store_id = $1 ORDER BY sco.order_position`,
    [req.params.id]
  );
  res.json(rows);
});

// Replaces the full category ordering for a store.
storesRouter.post('/:id/categories', async (req, res) => {
  const items: { category_id: number; order_position: number }[] = req.body?.categories;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'categories array required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM store_category_order WHERE store_id = $1', [req.params.id]);
    for (const item of items) {
      await client.query(
        'INSERT INTO store_category_order (store_id, category_id, order_position) VALUES ($1, $2, $3)',
        [req.params.id, item.category_id, item.order_position]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
