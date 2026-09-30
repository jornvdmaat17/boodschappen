import { Router } from 'express';
import type { PoolClient } from 'pg';
import { query, pool } from '../db.js';
import { emitToList } from '../socket.js';

export const listsRouter = Router();

// Recompute the auto-generated items (recipes on the meal plan + active recurring
// items) for a weekly list, preserving checked state and manual items.
async function syncAutoItems(client: PoolClient, listId: number) {
  const { rows: autoProducts } = await client.query(
    `SELECT DISTINCT ri.product_id FROM meal_plan_days mpd
       JOIN weekly_meal_plans wmp ON wmp.id = mpd.meal_plan_id
       JOIN recipe_items ri ON ri.recipe_id = mpd.recipe_id
     WHERE wmp.shopping_list_id = $1
     UNION
     SELECT product_id FROM recurring_items WHERE active = TRUE`,
    [listId]
  );
  const ids = autoProducts.map((r) => r.product_id);
  await client.query(
    `DELETE FROM shopping_list_items
     WHERE shopping_list_id = $1 AND source = 'auto' AND NOT (product_id = ANY($2::int[]))`,
    [listId, ids]
  );
  for (const pid of ids) {
    await client.query(
      `INSERT INTO shopping_list_items (shopping_list_id, product_id, source)
       VALUES ($1, $2, 'auto') ON CONFLICT (shopping_list_id, product_id) DO NOTHING`,
      [listId, pid]
    );
  }
}

listsRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT sl.*, s.name AS store_name,
       (SELECT COUNT(*) FROM shopping_list_items WHERE shopping_list_id = sl.id) AS item_count,
       (SELECT COUNT(*) FROM shopping_list_items WHERE shopping_list_id = sl.id AND checked) AS checked_count
     FROM shopping_lists sl JOIN stores s ON s.id = sl.store_id
     ORDER BY sl.created_at DESC LIMIT 50`
  );
  res.json(rows);
});

listsRouter.post('/', async (req, res) => {
  const { type, store_id, days } = req.body || {};
  if (!['weekly', 'quick'].includes(type)) return res.status(400).json({ error: 'type must be weekly or quick' });
  if (!store_id) return res.status(400).json({ error: 'store_id required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO shopping_lists (store_id, type) VALUES ($1, $2) RETURNING *',
      [store_id, type]
    );
    const list = rows[0];

    if (type === 'weekly') {
      const { rows: planRows } = await client.query(
        'INSERT INTO weekly_meal_plans (shopping_list_id) VALUES ($1) RETURNING id',
        [list.id]
      );
      const planId = planRows[0].id;
      for (const day of days || []) {
        await client.query(
          'INSERT INTO meal_plan_days (meal_plan_id, day_of_week, recipe_id) VALUES ($1, $2, $3)',
          [planId, day.day_of_week, day.recipe_id || null]
        );
      }
      await syncAutoItems(client, list.id);
    }
    await client.query('COMMIT');
    res.status(201).json(list);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

listsRouter.get('/:id', async (req, res) => {
  const { rows: listRows } = await query(
    'SELECT sl.*, s.name AS store_name FROM shopping_lists sl JOIN stores s ON s.id = sl.store_id WHERE sl.id = $1',
    [req.params.id]
  );
  if (listRows.length === 0) return res.status(404).json({ error: 'Not found' });
  const list = listRows[0];

  const { rows: items } = await query(
    `SELECT sli.id, sli.product_id, sli.checked, sli.source,
            p.name AS product_name, c.id AS category_id, c.name AS category_name,
            sco.order_position
     FROM shopping_list_items sli
     JOIN products p ON p.id = sli.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN store_category_order sco ON sco.category_id = c.id AND sco.store_id = $2
     WHERE sli.shopping_list_id = $1
     ORDER BY sco.order_position NULLS LAST, c.name NULLS LAST, p.name`,
    [req.params.id, list.store_id]
  );

  let mealPlan = null;
  if (list.type === 'weekly') {
    const { rows: planDays } = await query(
      `SELECT mpd.day_of_week, mpd.recipe_id, r.name AS recipe_name
       FROM weekly_meal_plans wmp
       JOIN meal_plan_days mpd ON mpd.meal_plan_id = wmp.id
       LEFT JOIN recipes r ON r.id = mpd.recipe_id
       WHERE wmp.shopping_list_id = $1 ORDER BY mpd.day_of_week`,
      [req.params.id]
    );
    mealPlan = planDays;
  }

  res.json({ ...list, items, meal_plan: mealPlan });
});

listsRouter.put('/:id', async (req, res) => {
  const { completed, store_id } = req.body || {};
  const { rows } = await query(
    `UPDATE shopping_lists SET
       completed_at = CASE WHEN $1::boolean IS NULL THEN completed_at WHEN $1 THEN NOW() ELSE NULL END,
       store_id = COALESCE($2, store_id)
     WHERE id = $3 RETURNING *`,
    [completed ?? null, store_id ?? null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  emitToList(req.params.id, 'list:updated', { listId: Number(req.params.id) });
  res.json(rows[0]);
});

listsRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM shopping_lists WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

listsRouter.post('/:id/items', async (req, res) => {
  const { product_id } = req.body || {};
  if (!product_id) return res.status(400).json({ error: 'product_id required' });
  const { rows } = await query(
    `INSERT INTO shopping_list_items (shopping_list_id, product_id, source) VALUES ($1, $2, 'manual')
     ON CONFLICT (shopping_list_id, product_id) DO UPDATE SET checked = shopping_list_items.checked
     RETURNING *`,
    [req.params.id, product_id]
  );
  emitToList(req.params.id, 'list:updated', { listId: Number(req.params.id) });
  res.status(201).json(rows[0]);
});

// Add all products of a recipe as manual items (used on quick lists).
listsRouter.post('/:id/recipes', async (req, res) => {
  const { recipe_id } = req.body || {};
  if (!recipe_id) return res.status(400).json({ error: 'recipe_id required' });
  await query(
    `INSERT INTO shopping_list_items (shopping_list_id, product_id, source)
     SELECT $1, product_id, 'manual' FROM recipe_items WHERE recipe_id = $2
     ON CONFLICT (shopping_list_id, product_id) DO NOTHING`,
    [req.params.id, recipe_id]
  );
  emitToList(req.params.id, 'list:updated', { listId: Number(req.params.id) });
  res.json({ ok: true });
});

listsRouter.delete('/:id/items/:productId', async (req, res) => {
  await query('DELETE FROM shopping_list_items WHERE shopping_list_id = $1 AND product_id = $2', [
    req.params.id,
    req.params.productId,
  ]);
  emitToList(req.params.id, 'list:updated', { listId: Number(req.params.id) });
  res.status(204).end();
});

listsRouter.put('/:id/items/:productId', async (req, res) => {
  const { checked } = req.body || {};
  const { rows } = await query(
    'UPDATE shopping_list_items SET checked = $1 WHERE shopping_list_id = $2 AND product_id = $3 RETURNING *',
    [!!checked, req.params.id, req.params.productId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  emitToList(req.params.id, 'list:item_toggled', {
    listId: Number(req.params.id),
    productId: Number(req.params.productId),
    checked: !!checked,
  });
  res.json(rows[0]);
});

listsRouter.put('/:id/meal-plan/:day', async (req, res) => {
  const { recipe_id } = req.body || {};
  const day = Number(req.params.day);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: planRows } = await client.query(
      'SELECT id FROM weekly_meal_plans WHERE shopping_list_id = $1',
      [req.params.id]
    );
    if (planRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No meal plan for this list' });
    }
    await client.query(
      `INSERT INTO meal_plan_days (meal_plan_id, day_of_week, recipe_id) VALUES ($1, $2, $3)
       ON CONFLICT (meal_plan_id, day_of_week) DO UPDATE SET recipe_id = EXCLUDED.recipe_id`,
      [planRows[0].id, day, recipe_id || null]
    );
    await syncAutoItems(client, Number(req.params.id));
    await client.query('COMMIT');
    emitToList(req.params.id, 'list:updated', { listId: Number(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
