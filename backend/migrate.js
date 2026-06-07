import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
import { config } from 'dotenv';

const { Client } = pkg;

// Load the environment variables from the .env file
config(); 

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("❌ ERROR: DATABASE_URL is missing from your .env file!");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

async function runMigrations() {
  try {
    console.log("1. Connecting to PostgreSQL...");
    await client.connect();
    
    console.log("2. Initializing Drizzle...");
    const db = drizzle(client);
    
    console.log("3. Pushing migrations from Drizzle folder...");
    await migrate(db, { migrationsFolder: './src/db/drizzle' });
    
    console.log("✅ SUCCESS: Migrations completed!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ MIGRATION FAILED. RAW ERROR:");
    console.error(error);
    process.exit(1);
  }
}

runMigrations();