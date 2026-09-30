INSERT INTO categories (name) VALUES
  ('groenten & fruit'),
  ('brood'),
  ('vlees & vis'),
  ('zuivel'),
  ('kaas'),
  ('pasta & rijst'),
  ('conserven'),
  ('sauzen & kruiden'),
  ('ontbijt'),
  ('snacks'),
  ('diepvries'),
  ('dranken'),
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
  ('eieren', 'zuivel'),
  ('kookroom', 'zuivel'),
  ('griekse yoghurt', 'zuivel'),
  ('drinkyoghurt', 'zuivel'),
  ('margarine', 'zuivel'),
  ('slagroom', 'zuivel'),
  ('cottage cheese', 'zuivel'),
  ('kwark', 'zuivel'),
  ('geitenkaas', 'kaas'),
  ('gouda plakken', 'kaas'),
  ('feta', 'kaas'),
  ('kipfilet', 'vlees & vis'),
  ('gerookte kipfilet', 'vlees & vis'),
  ('kipschnitzel', 'vlees & vis'),
  ('cervelaat', 'vlees & vis'),
  ('achterham', 'vlees & vis'),
  ('slavinken', 'vlees & vis'),
  ('gehakt', 'vlees & vis'),
  ('tomatenblokjes', 'conserven'),
  ('gezeefde tomaten', 'conserven'),
  ('kokosmelk', 'conserven'),
  ('kidneybonen', 'conserven'),
  ('kikkererwten', 'conserven'),
  ('chilibonen', 'conserven'),
  ('zwarte bonen', 'conserven'),
  ('kurkuma', 'sauzen & kruiden'),
  ('komijn', 'sauzen & kruiden'),
  ('kruidenmix', 'sauzen & kruiden'),
  ('currykruiden', 'sauzen & kruiden'),
  ('olijfolie', 'sauzen & kruiden'),
  ('pesto', 'sauzen & kruiden'),
  ('citroensap', 'sauzen & kruiden'),
  ('penne', 'pasta & rijst'),
  ('risottorijst', 'pasta & rijst'),
  ('couscous', 'pasta & rijst'),
  ('tortellini', 'pasta & rijst'),
  ('mineraalwater', 'dranken'),
  ('koffiecups', 'dranken'),
  ('bier', 'dranken'),
  ('frisdrank', 'dranken'),
  ('siroop', 'dranken'),
  ('suikerwafels', 'snacks'),
  ('koekjes', 'snacks'),
  ('chocolade', 'snacks'),
  ('knäckebröd', 'brood'),
  ('jam', 'ontbijt'),
  ('ontbijtkoek', 'ontbijt'),
  ('winterpeen', 'groenten & fruit')
) AS v(name, cat)
JOIN categories c ON c.name = v.cat
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE LOWER(p.name) = v.name
);
