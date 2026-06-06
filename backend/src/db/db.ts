import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { config } from 'dotenv';
import * as schema from './schema.ts'; // Adjust this path to where your urls schema lives

// load environment variables
config();

const { Pool } = pkg;

// initialize the pg Connection Pool using the existing DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// export the Drizzle DB instance so the controllers can import it
export const db = drizzle(pool, { schema });