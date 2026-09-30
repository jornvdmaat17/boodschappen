INSERT INTO categories (name) VALUES
  ('groenten & fruit'),
  ('brood'),
  ('vlees & vis'),
  ('zuivel'),
  ('vleeswaren/broodsalades'),
  ('kaas'),
  ('pasta & rijst'),
  ('conserven'),
  ('kruiden'),
  ('sauzen'),
  ('ontbijt'),
  ('snacks'),
  ('diepvries'),
  ('dranken'),
  ('bakken'),
  ('non-food')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (name, category_id)
SELECT v.name, c.id
FROM (VALUES
  -- groenten
  ('tomaten'), ('cherrytomaten'), ('komkommer'), ('paprika'), ('ui'), ('rode ui'),
  ('knoflook'), ('wortels'), ('aardappelen'), ('zoete aardappel'), ('broccoli'),
  ('bloemkool'), ('courgette'), ('aubergine'), ('spinazie'), ('sla'), ('ijsbergsla'),
  ('rucola'), ('prei'), ('champignons'), ('sperziebonen'), ('spruitjes'), ('witlof'),
  ('rode kool'), ('boerenkool'), ('andijvie'), ('mais'), ('avocado'), ('paksoi'),
  ('bosui'), ('radijs'), ('pompoen'), ('bleekselderij'), ('venkel'), ('doperwten'),
  -- fruit
  ('appels'), ('bananen'), ('sinaasappels'), ('mandarijnen'), ('citroen'), ('limoen'),
  ('druiven'), ('aardbeien'), ('blauwe bessen'), ('frambozen'), ('ananas'), ('mango'),
  ('kiwi'), ('peren'), ('perziken'), ('nectarines'), ('watermeloen'), ('meloen'),
  ('pruimen'), ('kersen'), ('grapefruit')
) AS v(name)
CROSS JOIN (SELECT id FROM categories WHERE name = 'groenten & fruit') AS c
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE LOWER(p.name) = v.name
);

INSERT INTO products (name, category_id)
SELECT v.name, c.id
FROM (VALUES
  ('eieren', 'conserven'),
  ('kookroom', 'zuivel'),
  ('griekse yoghurt', 'zuivel'),
  ('drinkyoghurt', 'zuivel'),
  ('margarine', 'zuivel'),
  ('slagroom', 'zuivel'),
  ('cottage cheese', 'kaas'),
  ('kwark', 'zuivel'),
  ('geitenkaas', 'kaas'),
  ('gouda plakken', 'kaas'),
  ('feta', 'kaas'),
  ('gerookte kipfilet', 'vlees & vis'),
  ('kipschnitzel', 'vlees & vis'),
  ('cervelaat', 'vleeswaren/broodsalades'),
  ('achterham', 'vleeswaren/broodsalades'),
  ('slavinken', 'vlees & vis'),
  ('gehakt', 'vlees & vis'),
  ('tomatenblokjes', 'pasta & rijst'),
  ('gezeefde tomaten', 'pasta & rijst'),
  ('kokosmelk', 'pasta & rijst'),
  ('kidneybonen', 'conserven'),
  ('kikkererwten', 'conserven'),
  ('chilibonen', 'conserven'),
  ('zwarte bonen', 'conserven'),
  ('kurkuma', 'kruiden'),
  ('komijn', 'kruiden'),
  ('kruidenmix', 'kruiden'),
  ('currykruiden', 'kruiden'),
  ('olijfolie', 'sauzen'),
  ('pesto', 'pasta & rijst'),
  ('citroensap', 'bakken'),
  ('penne', 'pasta & rijst'),
  ('risottorijst', 'pasta & rijst'),
  ('couscous', 'pasta & rijst'),
  ('tortellini', 'pasta & rijst'),
  ('prikwater', 'dranken'),
  ('koffiecups', 'dranken'),
  ('bier', 'dranken'),
  ('frisdrank', 'dranken'),
  ('siroop', 'dranken'),
  ('suikerwafels', 'snacks'),
  ('koekjes', 'snacks'),
  ('chocolade', 'snacks'),
  ('knäckebröd', 'ontbijt'),
  ('jam', 'ontbijt'),
  ('ontbijtkoek', 'ontbijt'),
  ('winterpeen', 'groenten & fruit'),
  ('vleeswaren', 'vleeswaren/broodsalades')
) AS v(name, cat)
JOIN categories c ON c.name = v.cat
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE LOWER(p.name) = v.name
);
