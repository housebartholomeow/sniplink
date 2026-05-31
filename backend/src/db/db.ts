import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { config } from 'dotenv';
import * as schema from './schema.ts'; // Adjust this path to where your urls schema lives

// Load environment variables
config();

const { Pool } = pkg;

// Initialize the pg Connection Pool using your existing DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Export the Drizzle DB instance so your controllers can import it
export const db = drizzle(pool, { schema });