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
