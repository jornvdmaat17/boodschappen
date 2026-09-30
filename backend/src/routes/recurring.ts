import { Router } from 'express';
import { query } from '../db.js';

export const recurringRouter = Router();

recurringRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT ri.*, p.name AS product_name
     FROM recurring_items ri JOIN products p ON p.id = ri.product_id
     ORDER BY p.name`
  );
  res.json(rows);
});

recurringRouter.post('/', async (req, res) => {
  const { product_id, frequency, quantity } = req.body || {};
  if (!product_id) return res.status(400).json({ error: 'product_id required' });
  const { rows } = await query(
    `INSERT INTO recurring_items (product_id, frequency, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (product_id) DO UPDATE SET frequency = EXCLUDED.frequency, active = TRUE
     RETURNING *`,
    [product_id, frequency || 'weekly', Math.max(1, quantity ?? 1)]
  );
  res.status(201).json(rows[0]);
});

recurringRouter.put('/:id', async (req, res) => {
  const { frequency, active, quantity } = req.body || {};
  const { rows } = await query(
    `UPDATE recurring_items SET
       frequency = COALESCE($1, frequency),
       active = COALESCE($2, active),
       quantity = GREATEST(1, COALESCE($3, quantity))
     WHERE id = $4 RETURNING *`,
    [frequency ?? null, active ?? null, quantity ?? null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

recurringRouter.delete('/:id', async (req, res) => {
  await query('DELETE FROM recurring_items WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
