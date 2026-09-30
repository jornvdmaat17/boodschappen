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
