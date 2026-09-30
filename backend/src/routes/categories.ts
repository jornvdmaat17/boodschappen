import { Router } from 'express';
import { query } from '../db.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  const { rows } = await query('SELECT * FROM categories ORDER BY name');
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

categoriesRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
