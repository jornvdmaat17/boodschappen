import { Router } from 'express';
import { query, pool } from '../db.js';
import { config } from '../config.js';

export const recipesRouter = Router();

recipesRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT r.*, COALESCE(json_agg(
       json_build_object('id', p.id, 'name', p.name, 'category_id', p.category_id,
                         'quantity', ri.quantity, 'optional', ri.optional))
       FILTER (WHERE p.id IS NOT NULL), '[]') AS products
     FROM recipes r
     LEFT JOIN recipe_items ri ON ri.recipe_id = r.id
     LEFT JOIN products p ON p.id = ri.product_id
     GROUP BY r.id ORDER BY r.name`
  );
  res.json(rows);
});

type RecipeItemInput = { product_id: number; quantity?: number; optional?: boolean };

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

function isAllowedUrl(u: URL): boolean {
  if (!['http:', 'https:'].includes(u.protocol)) return false;
  const h = u.hostname;
  if (!h.includes('.') || h === 'localhost') return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':')) return false;
  if (h.endsWith('.local') || h.endsWith('.internal')) return false;
  return true;
}

function findRecipeNode(html: string): any | null {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const m of blocks) {
    try {
      const data = JSON.parse(m[1]);
      const nodes = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
      for (const n of nodes) {
        const t = n?.['@type'];
        if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) return n;
      }
    } catch {
      // ignore malformed blocks
    }
  }
  return null;
}

// Generates a recipe with Cloudflare Workers AI, steered towards the household's
// existing product names so the ingredient matching lands automatically.
recipesRouter.post('/generate', async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt required' });
  if (!config.cfAccountId || !config.cfAiToken) {
    return res.status(422).json({
      error:
        'AI is niet geconfigureerd. Zet CLOUDFLARE_ACCOUNT_ID en CLOUDFLARE_AI_TOKEN in .env en herstart.',
    });
  }

  const { rows: products } = await query('SELECT name FROM products ORDER BY name');
  const productNames = products.map((r) => r.name).join(', ');

  const system = `Je bent een Nederlandse thuiskok. Bedenk één avondmaaltijd-recept dat past bij de wens van de gebruiker (voor 2 personen).
Antwoord UITSLUITEND met geldige JSON, zonder uitleg of markdown, in dit formaat:
{"name": "korte naam van het gerecht", "ingredients": ["ingrediënt", "ingrediënt", ...]}
Regels voor ingredients: korte generieke Nederlandse namen zonder hoeveelheden (dus "rode ui", niet "2 rode uien").
Gebruik waar mogelijk exact deze bestaande productnamen: ${productNames}`;

  let aiResponse: Response;
  try {
    aiResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${config.cfAccountId}/ai/run/${config.cfAiModel}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.cfAiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: String(prompt).slice(0, 500) },
          ],
          max_tokens: 512,
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );
  } catch {
    return res.status(502).json({ error: 'Kon Cloudflare AI niet bereiken' });
  }

  const data: any = await aiResponse.json().catch(() => null);
  if (!aiResponse.ok || !data?.success) {
    const detail = data?.errors?.[0]?.message || `status ${aiResponse.status}`;
    return res.status(422).json({ error: `Cloudflare AI fout: ${detail}` });
  }

  const text: string = data.result?.response ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let parsed: any = null;
  try {
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    parsed = null;
  }
  if (!parsed?.name || !Array.isArray(parsed.ingredients)) {
    return res.status(422).json({ error: 'AI gaf geen bruikbaar recept terug, probeer opnieuw' });
  }
  res.json({
    name: String(parsed.name).slice(0, 200),
    ingredients: parsed.ingredients.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 30),
  });
});

// Fetches a recipe page and extracts name + ingredients from its schema.org data.
recipesRouter.post('/import-url', async (req, res) => {
  const { url } = req.body || {};
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Ongeldige URL' });
  }
  if (!isAllowedUrl(parsed)) return res.status(400).json({ error: 'Deze URL is niet toegestaan' });

  let response: Response;
  try {
    response = await fetch(parsed.href, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return res.status(502).json({ error: 'Kon de pagina niet ophalen' });
  }
  if (response.status === 403) {
    return res.status(422).json({
      error: 'Deze website blokkeert automatisch ophalen (o.a. ah.nl). Probeer een andere receptensite.',
    });
  }
  if (!response.ok) return res.status(422).json({ error: `Pagina gaf status ${response.status}` });

  const html = (await response.text()).slice(0, 3_000_000);
  const recipe = findRecipeNode(html);
  if (!recipe) {
    return res.status(422).json({ error: 'Geen recept gevonden op deze pagina' });
  }
  const ingredients = (recipe.recipeIngredient || []).map((s: unknown) => String(s).trim()).filter(Boolean);
  res.json({ name: String(recipe.name || '').trim() || 'Recept', source_url: parsed.href, ingredients });
});

function normalizeItems(body: any): RecipeItemInput[] {
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.product_ids)) return body.product_ids.map((id: number) => ({ product_id: id }));
  return [];
}

recipesRouter.post('/', async (req, res) => {
  const { name, source_url } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const items = normalizeItems(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO recipes (name, source_url) VALUES ($1, $2) RETURNING *',
      [name.trim(), source_url || null]
    );
    const recipe = rows[0];
    for (const item of items) {
      await client.query(
        'INSERT INTO recipe_items (recipe_id, product_id, quantity, optional) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [recipe.id, item.product_id, Math.max(1, item.quantity ?? 1), !!item.optional]
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
  const { name, source_url } = req.body || {};
  const hasItems = Array.isArray(req.body?.items) || Array.isArray(req.body?.product_ids);
  const items = normalizeItems(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (name?.trim()) {
      await client.query('UPDATE recipes SET name = $1 WHERE id = $2', [name.trim(), req.params.id]);
    }
    if (source_url !== undefined) {
      await client.query('UPDATE recipes SET source_url = $1 WHERE id = $2', [
        source_url?.trim() || null,
        req.params.id,
      ]);
    }
    if (hasItems) {
      await client.query('DELETE FROM recipe_items WHERE recipe_id = $1', [req.params.id]);
      for (const item of items) {
        await client.query(
          'INSERT INTO recipe_items (recipe_id, product_id, quantity, optional) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [req.params.id, item.product_id, Math.max(1, item.quantity ?? 1), !!item.optional]
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
