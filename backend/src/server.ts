import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config.js';
import { ensureAdminUser } from './db.js';
import { requireAuth } from './auth.js';
import { initSocket } from './socket.js';
import { authRouter } from './routes/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { productsRouter } from './routes/products.js';
import { storesRouter } from './routes/stores.js';
import { recipesRouter } from './routes/recipes.js';
import { recurringRouter } from './routes/recurring.js';
import { listsRouter } from './routes/lists.js';

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/categories', requireAuth, categoriesRouter);
app.use('/api/products', requireAuth, productsRouter);
app.use('/api/stores', requireAuth, storesRouter);
app.use('/api/recipes', requireAuth, recipesRouter);
app.use('/api/recurring-items', requireAuth, recurringRouter);
app.use('/api/shopping-lists', requireAuth, listsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const httpServer = createServer(app);
initSocket(httpServer);

async function start() {
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      await ensureAdminUser();
      break;
    } catch (err) {
      if (attempt === 15) throw err;
      console.log(`Database not ready (attempt ${attempt}), retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  httpServer.listen(config.port, () => {
    console.log(`Backend listening on :${config.port}`);
  });
}

start();
