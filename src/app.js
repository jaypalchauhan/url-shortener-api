import { randomBytes } from 'node:crypto';
import express from 'express';

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CUSTOM_CODE_PATTERN = /^[A-Za-z0-9_-]{4,20}$/;

function generateCode(length = 6) {
  const bytes = randomBytes(length);
  let code = '';
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function createApp(db) {
  const app = express();
  app.use(express.json());

  app.post('/api/shorten', (req, res) => {
    const { url, code: customCode } = req.body ?? {};

    if (!url || !isValidHttpUrl(url)) {
      return res.status(400).json({ error: 'A valid http(s) "url" field is required' });
    }
    if (customCode !== undefined && !CUSTOM_CODE_PATTERN.test(customCode)) {
      return res.status(400).json({
        error: 'Custom code must be 4-20 characters: letters, digits, "-" or "_"',
      });
    }
    if (customCode && db.find(customCode)) {
      return res.status(409).json({ error: `Code "${customCode}" is already taken` });
    }

    let code = customCode;
    if (!code) {
      do {
        code = generateCode();
      } while (db.find(code));
    }

    db.insert(code, url);
    res.status(201).json({
      code,
      shortUrl: `${req.protocol}://${req.get('host')}/${code}`,
      longUrl: url,
    });
  });

  app.get('/api/links', (req, res) => {
    const links = db.list().map((row) => ({
      code: row.code,
      longUrl: row.long_url,
      clicks: row.clicks,
      createdAt: row.created_at,
    }));
    res.json(links);
  });

  app.get('/api/stats/:code', (req, res) => {
    const row = db.find(req.params.code);
    if (!row) {
      return res.status(404).json({ error: 'Short link not found' });
    }
    res.json({
      code: row.code,
      longUrl: row.long_url,
      clicks: row.clicks,
      createdAt: row.created_at,
    });
  });

  app.delete('/api/links/:code', (req, res) => {
    if (!db.remove(req.params.code)) {
      return res.status(404).json({ error: 'Short link not found' });
    }
    res.status(204).end();
  });

  app.get('/:code', (req, res) => {
    const row = db.find(req.params.code);
    if (!row) {
      return res.status(404).json({ error: 'Short link not found' });
    }
    db.recordClick(row.code);
    res.redirect(302, row.long_url);
  });

  return app;
}
