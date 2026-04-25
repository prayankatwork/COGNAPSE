const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'cognapse.db');
const db = new Database(dbPath);

console.log("--- USERS REGISTRY ---");
const users = db.prepare('SELECT * FROM users').all();
console.table(users);

console.log("\n--- USER STATS ---");
const stats = db.prepare('SELECT * FROM user_stats').all();
console.table(stats);
