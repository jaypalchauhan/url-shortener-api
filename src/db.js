import Database from 'better-sqlite3';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS links (
    code TEXT PRIMARY KEY,
    long_url TEXT NOT NULL,
    clicks INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

export function createDb(path = 'links.db') {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);

  return {
    insert(code, longUrl) {
      db.prepare('INSERT INTO links (code, long_url) VALUES (?, ?)').run(code, longUrl);
    },

    find(code) {
      return db.prepare('SELECT * FROM links WHERE code = ?').get(code);
    },

    recordClick(code) {
      db.prepare('UPDATE links SET clicks = clicks + 1 WHERE code = ?').run(code);
    },

    list() {
      return db.prepare('SELECT * FROM links ORDER BY created_at DESC').all();
    },

    remove(code) {
      return db.prepare('DELETE FROM links WHERE code = ?').run(code).changes > 0;
    },

    close() {
      db.close();
    },
  };
}
