import { Router } from 'express';
import { query } from '../db.js';

export const productsRouter = Router();

productsRouter.get('/', async (req, res) => {
  const search = (req.query.search as string) || '';
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE ($1 = '' OR p.name ILIKE '%' || $1 || '%')
     ORDER BY p.name`,
    [search]
  );
  res.json(rows);
});

productsRouter.post('/', async (req, res) => {
  const { name, category_id } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const { rows } = await query(
    'INSERT INTO products (name, category_id) VALUES ($1, $2) RETURNING *',
    [name.trim(), category_id || null]
  );
  res.status(201).json(rows[0]);
});

productsRouter.put('/:id', async (req, res) => {
  const { name, category_id } = req.body || {};
  const { rows } = await query(
    'UPDATE products SET name = COALESCE($1, name), category_id = $2 WHERE id = $3 RETURNING *',
    [name?.trim() || null, category_id || null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

productsRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM products WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
