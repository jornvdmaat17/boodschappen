CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INT REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE store_category_order (
  id SERIAL PRIMARY KEY,
  store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  order_position INT NOT NULL,
  UNIQUE(store_id, category_id)
);
CREATE INDEX idx_sco_store ON store_category_order(store_id);

CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  source_url TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recipe_items (
  id SERIAL PRIMARY KEY,
  recipe_id INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  optional BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(recipe_id, product_id)
);

CREATE TABLE recurring_items (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  frequency VARCHAR(50) NOT NULL DEFAULT 'weekly',
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id)
);

CREATE TABLE shopping_lists (
  id SERIAL PRIMARY KEY,
  store_id INT NOT NULL REFERENCES stores(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('weekly', 'quick')),
  shopping_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE weekly_meal_plans (
  id SERIAL PRIMARY KEY,
  shopping_list_id INT NOT NULL UNIQUE REFERENCES shopping_lists(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE meal_plan_days (
  id SERIAL PRIMARY KEY,
  meal_plan_id INT NOT NULL REFERENCES weekly_meal_plans(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  recipe_id INT REFERENCES recipes(id) ON DELETE SET NULL,
  UNIQUE(meal_plan_id, day_of_week)
);

CREATE TABLE shopping_list_items (
  id SERIAL PRIMARY KEY,
  shopping_list_id INT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  checked BOOLEAN DEFAULT FALSE,
  source VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shopping_list_id, product_id)
);
CREATE INDEX idx_sli_list ON shopping_list_items(shopping_list_id);
