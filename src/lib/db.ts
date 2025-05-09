import Database from "better-sqlite3";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config();

// Initialize SQLite database
const dbPath =
  process.env.DB_PATH || path.join(process.cwd(), "database", "notes.db");
const verbose = process.env.NODE_ENV === "production" ? undefined : console.log;

let db: Database.Database;

try {
  db = new Database(dbPath, { verbose });
  // Enable Write-Ahead Logging for concurrency
  db.pragma("journal_mode = WAL");

  // Create notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastSyncedAt TEXT,
      synced INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_updatedAt ON notes (updatedAt);
    CREATE INDEX IF NOT EXISTS idx_notes_lastSyncedAt ON notes (lastSyncedAt);
  `);
} catch (error) {
  console.error("Failed to initialize database:", error);
  throw error;
}

/**
 * Close the database connection.
 */
export function close(): void {
  try {
    db.close();
  } catch (error) {
    console.error("Failed to close database:", error);
  }
}

export default db;
