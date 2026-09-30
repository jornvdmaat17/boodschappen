import { Router } from 'express';
import { query, pool } from '../db.js';

export const recipesRouter = Router();

recipesRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT r.*, COALESCE(json_agg(
       json_build_object('id', p.id, 'name', p.name, 'category_id', p.category_id, 'quantity', ri.quantity))
       FILTER (WHERE p.id IS NOT NULL), '[]') AS products
     FROM recipes r
     LEFT JOIN recipe_items ri ON ri.recipe_id = r.id
     LEFT JOIN products p ON p.id = ri.product_id
     GROUP BY r.id ORDER BY r.name`
  );
  res.json(rows);
});

type RecipeItemInput = { product_id: number; quantity?: number };

function normalizeItems(body: any): RecipeItemInput[] {
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.product_ids)) return body.product_ids.map((id: number) => ({ product_id: id }));
  return [];
}

recipesRouter.post('/', async (req, res) => {
  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const items = normalizeItems(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('INSERT INTO recipes (name) VALUES ($1) RETURNING *', [name.trim()]);
    const recipe = rows[0];
    for (const item of items) {
      await client.query(
        'INSERT INTO recipe_items (recipe_id, product_id, quantity) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [recipe.id, item.product_id, Math.max(1, item.quantity ?? 1)]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(recipe);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

recipesRouter.put('/:id', async (req, res) => {
  const { name } = req.body || {};
  const hasItems = Array.isArray(req.body?.items) || Array.isArray(req.body?.product_ids);
  const items = normalizeItems(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (name?.trim()) {
      await client.query('UPDATE recipes SET name = $1 WHERE id = $2', [name.trim(), req.params.id]);
    }
    if (hasItems) {
      await client.query('DELETE FROM recipe_items WHERE recipe_id = $1', [req.params.id]);
      for (const item of items) {
        await client.query(
          'INSERT INTO recipe_items (recipe_id, product_id, quantity) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [req.params.id, item.product_id, Math.max(1, item.quantity ?? 1)]
        );
      }
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

recipesRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM recipes WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
