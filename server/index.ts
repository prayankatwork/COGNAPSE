import express from 'express';
import cors from 'cors';
import db from './database';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = 3001;

// --- HARDENED SECURITY MIDDLEWARE ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME-sniffing
  res.setHeader('X-Frame-Options', 'DENY'); // Prevent clickjacking
  res.setHeader('X-XSS-Protection', '1; mode=block'); // Cross-site scripting filter
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // HSTS
  res.removeHeader('X-Powered-By'); // Obscure server tech
  next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- AUTH ROUTES ---

app.post('/api/auth/register', (req, res) => {
  const username = req.body.username?.trim();
  const { password } = req.body;
  console.log(`[VAULT] Registry request for: ${username}`);
  const id = uuidv4();
  try {
    const trimmedName = username.trim();
    const stmt = db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)');
    stmt.run(id, trimmedName.toLowerCase(), password);
    
    // Initialize stats for new user
    const statsStmt = db.prepare('INSERT INTO user_stats (user_id) VALUES (?)');
    statsStmt.run(id);

    res.json({ success: true, user: { id, username: trimmedName } });
  } catch (error) {
    res.status(400).json({ error: "Username already registered or system error." });
  }
});

app.post('/api/auth/login', (req, res) => {
  const username = req.body.username?.trim();
  const { password } = req.body;
  
  try {
    const lowerUser = username.toLowerCase();
    const userExists = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(lowerUser);
    if (!userExists) {
      console.warn(`[VAULT] Identification Failure: Operative '${username}' not found in registry.`);
      const allUsers = db.prepare('SELECT username FROM users').all();
      console.log(`[VAULT] Current Registry: ${allUsers.map(u => u.username).join(', ')}`);
      return res.status(401).json({ error: "Operative not found in registry." });
    }

    const user = db.prepare('SELECT id, username FROM users WHERE LOWER(username) = ? AND password = ?').get(lowerUser, password);
    if (user) {
      console.log(`[VAULT] Identification Successful: Operative '${username}' authorized.`);
      res.json({ success: true, user });
    } else {
      console.warn(`[VAULT] Identification Failure: Incorrect security key for operative '${username}'.`);
      res.status(401).json({ error: "Incorrect security key for this operative." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DATA ROUTES (User Specific) ---

app.post('/api/reports', (req, res) => {
  const { id, userId, query, data } = req.body;
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO intelligence_reports (id, user_id, query, data) VALUES (?, ?, ?, ?)');
    stmt.run(id, userId, query, JSON.stringify(data));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const reports = db.prepare('SELECT * FROM intelligence_reports WHERE user_id = ? ORDER BY timestamp DESC').all(userId);
    res.json(reports.map(r => ({ ...r, data: JSON.parse(r.data) })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId);
    if (stats) {
      res.json({ ...stats, game_scores: JSON.parse(stats.game_scores) });
    } else {
      res.status(404).json({ error: "Stats not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stats', (req, res) => {
  const { userId, xp, search_count, rank, game_scores } = req.body;
  try {
    const stmt = db.prepare('UPDATE user_stats SET xp = ?, search_count = ?, rank = ?, game_scores = ? WHERE user_id = ?');
    stmt.run(xp, search_count, rank, JSON.stringify(game_scores), userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- NOTEBOOK ROUTES ---

app.get('/api/notebook/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const notes = db.prepare('SELECT * FROM notebook WHERE user_id = ? ORDER BY timestamp DESC').all(userId);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notebook', (req, res) => {
  const { id, userId, content, sourceQuery } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO notebook (id, user_id, content, source_query) VALUES (?, ?, ?, ?)');
    stmt.run(id, userId, content, sourceQuery);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notebook/:noteId', (req, res) => {
  const { noteId } = req.params;
  try {
    db.prepare('DELETE FROM notebook WHERE id = ?').run(noteId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notebook/user/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    db.prepare('DELETE FROM notebook WHERE user_id = ?').run(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`[SECURE] COGNAPSE Intelligence Vault bound to local loopback at http://127.0.0.1:${port}`);
});
