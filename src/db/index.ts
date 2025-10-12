import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Create the database connection
const sql = neon(process.env.NEON_DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Export schema for use in other files
export * from './schema';
export type Database = typeof db;
