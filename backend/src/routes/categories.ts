import { Router } from 'express';
import { query } from '../db.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT c.*, COUNT(p.id)::int AS product_count
     FROM categories c LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id ORDER BY c.name`
  );
  res.json(rows);
});

categoriesRouter.post('/', async (req, res) => {
  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const { rows } = await query(
    'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *',
    [name.trim().toLowerCase()]
  );
  res.status(201).json(rows[0]);
});

categoriesRouter.put('/:id', async (req, res) => {
  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const { rows } = await query('UPDATE categories SET name = $1 WHERE id = $2 RETURNING *', [
    name.trim().toLowerCase(),
    req.params.id,
  ]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

categoriesRouter.delete('/:id', async (req, res) => {
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM products WHERE category_id = $1', [
    req.params.id,
  ]);
  if (rows[0].n > 0) {
    return res.status(409).json({ error: `Categorie is in gebruik door ${rows[0].n} product(en)` });
  }
  await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
