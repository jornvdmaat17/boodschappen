# Boodschappen App - Complete Implementation Prompt

## Project Overview

Build a shared grocery shopping list web application for two users that eliminates in-store search time by organizing products by store location. The app supports weekly meal planning with automatic shopping list generation, recurring items, recipes, and real-time synchronization across devices.

**Purpose:** Make grocery shopping efficient by sorting shopping lists according to each store's layout and category ordering.

**Users:** Shared account for 2 people (jorn and girlfriend)

**Core Value Prop:** Plan meals → generate shopping list → shop organized by store layout instead of searching the whole store

---

## Tech Stack

- **Frontend:** React 18+ with TypeScript, Vite
- **State Management:** TanStack Query (React Query) for server state
- **Real-time:** Socket.io client
- **Backend:** Node.js with Express.js
- **Real-time Server:** Socket.io server
- **Database:** PostgreSQL
- **Auth:** JWT tokens with 30+ day expiration
- **Styling:** Tailwind CSS (or equivalent)
- **Hosting:** Frontend (Vercel), Backend (Railway/Fly.io), Database (Railway/Neon)

---

## Complete Data Model

### Core Tables

#### 1. **Users**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```
- Shared account for both users
- Single password, both use same credentials

#### 2. **Categories** (Global)
```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```
- Examples: "produce", "dairy", "meat", "frozen", "pantry", "beverages", etc.
- Predefined, global list
- Can be seeded initially or added by admin

#### 3. **Products**
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INT REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```
- Global product database
- One entry per unique product (e.g., one "tomato" entry)
- Each product belongs to one global category

#### 4. **Stores**
```sql
CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```
- Examples: "Lidl", "Aldi", "Albert Heijn"
- Stores define their own category ordering

#### 5. **StoreCategoryOrder**
```sql
CREATE TABLE store_category_order (
  id SERIAL PRIMARY KEY,
  store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  order_position INT NOT NULL,
  UNIQUE(store_id, category_id)
);
```
- Defines which categories exist in each store and their order
- `order_position`: 1, 2, 3... (lower number = earlier in the list)
- A category can have position 1 in one store and position 10 in another
- If a category isn't in `store_category_order`, it doesn't exist for that store

#### 6. **Recipes**
```sql
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```
- Named collections of products
- Used for meals and reusable shopping combinations

#### 7. **RecipeItems**
```sql
CREATE TABLE recipe_items (
  id SERIAL PRIMARY KEY,
  recipe_id INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(recipe_id, product_id)
);
```
- Links products to recipes
- No quantities (just "this recipe includes this product")

#### 8. **RecurringItems**
```sql
CREATE TABLE recurring_items (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  frequency VARCHAR(50) NOT NULL, -- "weekly", "bi-weekly", "monthly", or custom (e.g., "every_3_days")
  created_at TIMESTAMP DEFAULT NOW()
);
```
- Auto-populates weekly shopping lists
- Frequency options: "weekly", "bi-weekly", "monthly", or a number (days between)

#### 9. **ShoppingLists**
```sql
CREATE TABLE shopping_lists (
  id SERIAL PRIMARY KEY,
  store_id INT NOT NULL REFERENCES stores(id),
  type VARCHAR(20) NOT NULL, -- "weekly" or "quick"
  meal_plan_id INT REFERENCES weekly_meal_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```
- Two types:
  - **weekly:** tied to a meal plan, includes recurring items
  - **quick:** standalone, no recurring items, no meal plan

#### 10. **WeeklyMealPlans**
```sql
CREATE TABLE weekly_meal_plans (
  id SERIAL PRIMARY KEY,
  shopping_list_id INT NOT NULL UNIQUE REFERENCES shopping_lists(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);
```
- Stores the meal plan for a weekly shopping list
- One meal plan per weekly list

#### 11. **MealPlanDays**
```sql
CREATE TABLE meal_plan_days (
  id SERIAL PRIMARY KEY,
  meal_plan_id INT NOT NULL REFERENCES weekly_meal_plans(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL, -- 0 (Sunday) to 6 (Saturday)
  recipe_id INT REFERENCES recipes(id) ON DELETE SET NULL, -- NULL if no meal for this day
  UNIQUE(meal_plan_id, day_of_week)
);
```
- One row per day of the week
- `recipe_id` is NULL if that day has no meal

#### 12. **ShoppingListItems**
```sql
CREATE TABLE shopping_list_items (
  id SERIAL PRIMARY KEY,
  shopping_list_id INT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shopping_list_id, product_id)
);
```
- Items in a shopping list
- `checked`: true when the user checks off the item while shopping
- Real-time sync via Socket.io when checked status changes

---

## Features & Workflows

### 1. Authentication
- **Single shared account:** Both users log in with same email/password
- **JWT tokens:** 30+ day expiration
- **Session persistence:** Token stored in localStorage/httpOnly cookie
- **Login page:** Simple email + password form
- **Logout:** Clear token and redirect to login
- **Protected routes:** All app pages require valid token

### 2. Weekly Shopping List Creation

**Flow:**
1. Click "Create Weekly List" button
2. User is shown a week agenda (Sunday–Saturday)
3. For each day, user can:
   - **Select an existing recipe** from a dropdown
   - **Create a new recipe on the fly** (opens quick recipe creation modal)
   - **Leave the day empty** (no meal)
4. Click "Generate List" → creates a shopping list:
   - Adds all products from selected recipes
   - Adds all active recurring items
   - Sorted by the store's category order
   - Tied to the meal plan (can be viewed/edited later)
5. User can now:
   - Check off items while shopping
   - Add/remove individual products
   - Click any day to change/swap recipes (list updates automatically)

### 3. Quick Shopping List Creation

**Flow:**
1. Click "Create Quick List" button
2. List starts empty
3. User can:
   - **Add recipes:** select one or more recipes, all products added
   - **Add individual products:** search and add by name
   - Remove items as needed
4. No recurring items auto-populated
5. No meal plan attached

### 4. Shopping List Display & Interaction

**View:**
- Select a store (if list doesn't have one, user picks)
- Products sorted by store's category order
- Each item shows:
  - Product name
  - Category badge (visual indicator)
  - Checkbox for checking off
- Grouped by category (optional visual grouping)

**Real-time Sync:**
- When one user checks off "tomato", the other user's screen updates instantly
- When one user adds a product, both see it immediately
- Uses Socket.io for live updates

**List Completion:**
- Mark list as "completed" when done shopping
- Completed lists can be viewed but not edited

### 5. Products Management

**Add Products:**
- Search for existing product or create new
- Assign to a category
- Once added, available globally

**Edit Products:**
- Change name or category

**Delete Products:**
- Soft delete or hard delete (implementation choice)

### 6. Recipes Management

**Create Recipe:**
- Name the recipe
- Search and add products
- Remove products
- Save

**Edit Recipe:**
- Update name
- Add/remove products

**Delete Recipe:**
- Soft or hard delete

**Reuse Across Stores:**
- Recipes are global, not store-specific
- But their products' locations vary per store

### 7. Stores & Category Management

**Add Store:**
- Name the store (e.g., "Lidl Den Haag")
- Define which categories exist in this store
- Set their order (1 = first in list, 2 = second, etc.)

**Edit Store:**
- Change name
- Add/remove categories
- Reorder categories

**View Store Layout:**
- See category order for verification

### 8. Recurring Items Management

**Add Recurring Item:**
- Select product
- Choose frequency: "weekly", "bi-weekly", "monthly", or custom days
- Saves

**View/Edit:**
- List of all recurring items
- Toggle on/off for next list
- Edit frequency
- Delete

**Auto-population:**
- When creating a weekly list, all active recurring items automatically added
- Quick lists never include recurring items

---

## Real-time Synchronization (Socket.io)

### Events

**From Client:**
- `shopping_list:toggle_item` → User checks/unchecks an item
- `shopping_list:add_item` → User adds a new product to list
- `shopping_list:remove_item` → User removes a product from list
- `meal_plan:update_day` → User changes a meal for a day

**From Server:**
- `shopping_list:item_toggled` → Broadcast to all connected users on this list
- `shopping_list:item_added` → Broadcast
- `shopping_list:item_removed` → Broadcast
- `meal_plan:day_updated` → Broadcast
- `shopping_list:completed` → Broadcast

**Connection Management:**
- User joins a room for their current shopping list when opening it
- Leaves the room when navigating away
- Disconnect on logout
- Reconnect on network recovery

**Conflict Resolution:**
- Last write wins (user A and user B toggle same item simultaneously → last action wins)
- Server is the source of truth; client updates are optimistic then confirmed

---

## UI/UX Guidelines

### Layout
- **Header:** Logo, current store selector, user menu (logout), notifications (if any)
- **Sidebar/Navigation:** Dashboard, Shopping Lists, Recipes, Products, Stores, Recurring Items
- **Main Content:** Context-aware, changes based on current view

### Key Pages

**Dashboard:**
- Quick stats (if desired: items in current list, upcoming meals, etc.)
- Button to create weekly list
- Button to create quick list
- List of recent/active shopping lists

**Weekly List Creation:**
- Week view (Sun-Sat) with recipe selectors per day
- "Generate List" button at bottom
- Real-time preview of products being added

**Shopping List View:**
- Store selector (if not locked to a store)
- Category grouping (optional visual aid)
- Checkbox per item
- Add product button
- For weekly lists: days panel showing which meals are selected (clickable to change)

**Recipes:**
- List of all recipes
- Create new button
- Edit/delete buttons per recipe
- View products in recipe

**Products:**
- Search bar
- List of products with categories
- Add new button
- Edit/delete buttons

**Stores:**
- List of stores with category ordering
- Create new button
- Edit/view button per store

**Settings/Stores & Categories:**
- Manage stores
- Manage global categories
- Add stores, define their layout

### Design Notes
- Mobile-first, responsive design
- Clear visual hierarchy
- Checkboxes for shopping list items (satisfying UX)
- Category badges/colors for visual scanning
- Animations on item check (subtle, not annoying)
- Dark mode support (optional but nice)

---

## API Endpoints

### Authentication
- `POST /auth/login` → (email, password) → returns JWT
- `POST /auth/logout` → invalidates token (optional, if using refresh tokens)
- `GET /auth/verify` → checks if token is valid

### Products
- `GET /products` → list all products (with search query param)
- `POST /products` → create new product (name, category_id)
- `PUT /products/:id` → update product
- `DELETE /products/:id` → delete product

### Recipes
- `GET /recipes` → list all recipes
- `POST /recipes` → create recipe (name, product_ids)
- `GET /recipes/:id` → get recipe with products
- `PUT /recipes/:id` → update recipe
- `DELETE /recipes/:id` → delete recipe
- `POST /recipes/:id/items` → add product to recipe
- `DELETE /recipes/:id/items/:product_id` → remove product from recipe

### Stores
- `GET /stores` → list all stores
- `POST /stores` → create store (name)
- `GET /stores/:id` → get store with category order
- `PUT /stores/:id` → update store (name)
- `DELETE /stores/:id` → delete store
- `GET /stores/:id/categories` → get category order for a store
- `POST /stores/:id/categories` → set category order (array of {category_id, order_position})

### Categories
- `GET /categories` → list all categories
- `POST /categories` → create category (name) [admin only, or seed only]

### Recurring Items
- `GET /recurring-items` → list all recurring items
- `POST /recurring-items` → create (product_id, frequency)
- `PUT /recurring-items/:id` → update frequency
- `DELETE /recurring-items/:id` → delete

### Shopping Lists
- `GET /shopping-lists` → list all lists (paginated, sorted by created_at desc)
- `POST /shopping-lists` → create list (type: "weekly" | "quick", store_id, meal_plan_data if weekly)
- `GET /shopping-lists/:id` → get full list with items
- `PUT /shopping-lists/:id` → update (mark completed, change store, etc.)
- `DELETE /shopping-lists/:id` → delete list
- `POST /shopping-lists/:id/items` → add item (product_id)
- `DELETE /shopping-lists/:id/items/:product_id` → remove item
- `PUT /shopping-lists/:id/items/:product_id` → toggle checked status (via REST or Socket.io)

### Meal Plans
- `POST /meal-plans` → create meal plan (days array: [{day_of_week, recipe_id}, ...])
- `GET /meal-plans/:id` → get meal plan
- `PUT /meal-plans/:id/days/:day` → update meal for a specific day
- `GET /shopping-lists/:id/meal-plan` → get meal plan for a weekly list

---

## Project File Structure

```
boodschappen/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ShoppingListView.tsx
│   │   │   ├── WeeklyListCreator.tsx
│   │   │   ├── QuickListCreator.tsx
│   │   │   ├── RecipeManager.tsx
│   │   │   ├── ProductManager.tsx
│   │   │   ├── StoreManager.tsx
│   │   │   ├── RecurringItemsManager.tsx
│   │   │   └── Auth/
│   │   │       └── LoginPage.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ShoppingListPage.tsx
│   │   │   ├── RecipesPage.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── StoresPage.tsx
│   │   │   ├── RecurringPage.tsx
│   │   │   └── LoginPage.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useSocket.ts
│   │   │   ├── useShoppingList.ts
│   │   │   └── (other React Query hooks)
│   │   ├── api/
│   │   │   ├── auth.ts
│   │   │   ├── products.ts
│   │   │   ├── recipes.ts
│   │   │   ├── stores.ts
│   │   │   ├── shoppingLists.ts
│   │   │   ├── recurringItems.ts
│   │   │   └── client.ts (axios/fetch config)
│   │   ├── types/
│   │   │   └── index.ts (TypeScript interfaces)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── server.ts (main entry)
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── products.ts
│   │   │   ├── recipes.ts
│   │   │   ├── stores.ts
│   │   │   ├── shoppingLists.ts
│   │   │   ├── recurringItems.ts
│   │   │   └── categories.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── productController.ts
│   │   │   ├── recipeController.ts
│   │   │   ├── storeController.ts
│   │   │   ├── shoppingListController.ts
│   │   │   ├── mealPlanController.ts
│   │   │   └── recurringItemController.ts
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   ├── shoppingListService.ts
│   │   │   └── (other business logic)
│   │   ├── socket/
│   │   │   ├── events.ts (Socket.io event handlers)
│   │   │   └── handlers.ts
│   │   ├── db/
│   │   │   ├── migrations/ (Knex or Flyway)
│   │   │   └── pool.ts (PostgreSQL connection)
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   └── password.ts
│   │   └── config.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── db/
│   ├── migrations/
│   │   ├── 001_create_users.sql
│   │   ├── 002_create_categories.sql
│   │   ├── 003_create_products.sql
│   │   ├── 004_create_stores.sql
│   │   ├── 005_create_recipes.sql
│   │   ├── 006_create_shopping_lists.sql
│   │   ├── 007_create_meal_plans.sql
│   │   └── 008_seed_categories.sql
│   └── schema.sql (full schema)
├── IMPLEMENTATION_PROMPT.md (this file)
└── README.md
```

---

## Implementation Priorities

### Phase 1: Core Foundation (MVP)
1. Set up project structure, auth, database
2. Product & category management
3. Store setup & category ordering
4. Basic shopping list creation (quick list)
5. Check off items
6. Real-time sync (Socket.io)
7. Deploy

### Phase 2: Advanced Features
1. Weekly list creation with meal planning
2. Recipes
3. Recurring items
4. Weekly list editing (change meals, add/remove items)

### Phase 3: Polish & Enhancements
1. UI refinements
2. Dark mode
3. Mobile optimizations
4. Performance tuning
5. Advanced search/filters

---

## Technical Considerations

### Authentication & Sessions
- Use JWT with 30-day expiration
- Store token in httpOnly cookie (more secure than localStorage)
- Refresh token rotation (optional but recommended)
- Logout should invalidate token server-side if using refresh tokens

### Real-time Architecture
- Socket.io rooms: one room per shopping list
- User joins room on list open, leaves on navigation
- Server broadcasts changes to all connected users in the room
- Optimistic updates on client, confirmed by server

### Database Queries
- Index on `shopping_list_id` and `product_id` for fast lookups
- Index on `store_id` for category ordering queries
- Prepare for pagination on lists (future scale)

### Error Handling
- Graceful Socket.io disconnection/reconnection
- Form validation on client & server
- Clear error messages to user
- 404s for missing resources
- 401 for auth failures

### Performance
- Lazy load recipes/products lists
- Cache frequently accessed data (categories, stores) on client
- Pagination for shopping lists
- Database connection pooling

### Testing
- Unit tests for services (authService, shoppingListService, etc.)
- Integration tests for API endpoints
- E2E tests for critical flows (login, create list, check items)
- Socket.io event testing

---

## Deployment

### Overview
- **Frontend & Backend:** Node.js + Express running on small AWS EC2 instance (t3.micro or t3.small)
- **Database:** PostgreSQL in Docker Compose on same EC2 instance
- **DNS & CDN:** Cloudflare (points to EC2 public IP, provides caching, DDoS protection, SSL)
- **Containers:** Docker & Docker Compose for reproducible deployment

### Docker Compose Setup

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: boodschappen-db
    environment:
      POSTGRES_USER: boodschappen
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: boodschappen
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U boodschappen"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: boodschappen-backend
    environment:
      DATABASE_URL: postgres://boodschappen:${DB_PASSWORD}@postgres:5432/boodschappen
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
      PORT: 5000
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend:/app
    networks:
      - app-network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: boodschappen-frontend
    environment:
      VITE_API_URL: ${VITE_API_URL}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
```

### Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "dist/server.js"]
```

Build the backend before running compose: `npm run build` in the backend directory.

### Frontend Dockerfile

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
```

Create `frontend/nginx.conf`:

```nginx
events {
  worker_connections 1024;
}

http {
  server {
    listen 3000;
    location / {
      root /usr/share/nginx/html;
      index index.html;
      try_files $uri $uri/ /index.html;
    }
    location /api {
      proxy_pass http://backend:5000;
    }
  }
}
```

### AWS EC2 Setup

1. **Launch EC2 Instance:**
   - Instance type: t3.micro or t3.small
   - OS: Ubuntu 22.04 LTS
   - Security group: Allow ports 80 (HTTP), 443 (HTTPS), 22 (SSH)
   - Key pair: Download and save securely

2. **SSH into instance:**
   ```bash
   ssh -i your-key.pem ubuntu@<your-ec2-public-ip>
   ```

3. **Install Docker & Docker Compose:**
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose -y
   sudo usermod -aG docker ubuntu
   ```

4. **Clone repo and deploy:**
   ```bash
   git clone <your-repo> /home/ubuntu/boodschappen
   cd /home/ubuntu/boodschappen
   # Create .env file with secrets
   sudo docker-compose up -d
   ```

5. **Database migrations:**
   - Place migration SQL files in `db/migrations/` folder
   - Docker will run them on first container startup
   - Or manually run migrations after containers are up

### Cloudflare Setup

1. **DNS:**
   - Add your domain to Cloudflare
   - Update nameservers at registrar
   - Create A record: `@` (or subdomain) → EC2 public IP

2. **SSL/TLS:**
   - Set SSL mode to "Full" or "Full (strict)"
   - Redirect HTTP to HTTPS
   - Consider Cloudflare managed certificate

3. **Caching:**
   - Cache static assets (frontend build files)
   - API endpoints: No caching (or very short TTL for real-time features)

4. **Security:**
   - Enable DDoS protection
   - Rate limiting rules (optional)
   - Web Application Firewall (optional, free tier has some rules)

### Environment Variables (.env on EC2)

```env
# Database
DB_PASSWORD=your_secure_password_here

# Backend
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=production

# Frontend
VITE_API_URL=https://your-domain.com/api
```

### Monitoring & Logs

```bash
# View logs for all containers
docker-compose logs -f

# View specific service
docker-compose logs -f backend

# Restart services
docker-compose restart

# Stop and remove containers
docker-compose down
```

### Backups

Create a backup script (`backup.sh`):

```bash
#!/bin/bash
docker-compose exec -T postgres pg_dump -U boodschappen boodschappen > backup_$(date +%Y%m%d_%H%M%S).sql
```

Run periodically via cron:
```bash
0 2 * * * /home/ubuntu/boodschappen/backup.sh
```

### Domain & SSL

- Cloudflare provides free SSL, but if you want it on the backend directly:
  - Use Let's Encrypt with Certbot
  - Renew automatically
  - Restart services on renewal

### Cost Estimate

- **EC2 t3.micro:** ~$5/month (free tier eligible first 12 months)
- **Data transfer:** Varies, usually <$1/month for personal use
- **Cloudflare:** Free tier is sufficient
- **Domain:** $10-15/year (external registrar)

### Maintenance

- SSH into instance periodically
- Check disk space: `df -h`
- Monitor Docker logs: `docker-compose logs`
- Update application: `git pull` → `docker-compose build` → `docker-compose up -d`
- Database backups: Schedule via cron

### Troubleshooting

- **Port already in use:** Check `netstat -tlnp | grep :5000`
- **Container won't start:** Check logs: `docker-compose logs backend`
- **Database connection refused:** Ensure `postgres` service is healthy first
- **Cloudflare SSL mismatch:** Set SSL mode to "Flexible" temporarily if debugging

---

## Getting Started Checklist

- [ ] Set up GitHub repo (if not done)
- [ ] Create Vite React project (frontend)
- [ ] Create Node/Express project (backend)
- [ ] Set up PostgreSQL locally for development
- [ ] Install dependencies: Express, Socket.io, pg, jsonwebtoken, bcryptjs, cors, dotenv, etc.
- [ ] Create database migrations/schema
- [ ] Seed initial categories
- [ ] Build authentication flow
- [ ] Test Socket.io real-time events
- [ ] Deploy to Vercel/Railway
- [ ] Test end-to-end

---

## Questions & Ambiguities to Resolve During Implementation

1. **Product deletion:** Hard delete or soft delete?
2. **Recipe duplication:** Can users see/use other users' recipes? (Likely no for single-account, but clarify)
3. **List sharing:** If multiple household accounts exist in future, should lists be shareable?
4. **Notifications:** Should completed lists send a notification? (Nice-to-have, not MVP)
5. **Undo:** Should there be undo for accidental deletes? (Nice-to-have)
6. **Analytics:** Should the app track shopping history/patterns? (Future feature, not MVP)

---

## Success Criteria

- ✅ Two users can log in with shared account
- ✅ Both see real-time updates on shopping lists
- ✅ Can create weekly lists with meal planning
- ✅ Can create quick lists
- ✅ Shopping list displays sorted by store location
- ✅ Can check off items while shopping
- ✅ Can manage products, recipes, stores, recurring items
- ✅ App is responsive on mobile
- ✅ No data loss on disconnect/reconnect
- ✅ Session persists for 30+ days

---

## Notes for Implementation

- This is a personal/household app, so security is moderate (not banking-level)
- UX should prioritize speed: minimal clicks to check items
- Start with a single store, test thoroughly, then add multi-store support
- Socket.io is heavier than needed for some features, but the real-time shopping experience is worth it
- Don't over-engineer; stick to the spec, avoid feature creep
- Test real-time sync heavily (the core differentiator)
