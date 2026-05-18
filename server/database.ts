import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'cognapse.db');

const db = new Database(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS intelligence_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    query TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    data JSON,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_stats (
    user_id TEXT PRIMARY KEY,
    xp INTEGER DEFAULT 0,
    search_count INTEGER DEFAULT 0,
    rank TEXT DEFAULT 'NOVICE',
    game_scores JSON DEFAULT '{}',
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notebook (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    content TEXT,
    source_query TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

export default db;
