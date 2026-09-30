import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgres://boodschappen:boodschappen@localhost:5432/boodschappen',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: '30d',
  adminEmail: process.env.ADMIN_EMAIL || 'jorn.vandermaat@blueprintautomation.nl',
  adminPassword: process.env.ADMIN_PASSWORD || 'boodschappen',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
