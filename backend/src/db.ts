import pg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]) {
  return pool.query<T>(text, params);
}

export async function ensureAdminUser() {
  const { rows } = await query('SELECT id FROM users LIMIT 1');
  if (rows.length === 0) {
    const hash = await bcrypt.hash(config.adminPassword, 10);
    await query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [config.adminEmail, hash]);
    console.log(`Created shared account: ${config.adminEmail}`);
  }
}
