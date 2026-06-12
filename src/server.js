import { createApp } from './app.js';
import { createDb } from './db.js';

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || 'links.db';

const app = createApp(createDb(DB_PATH));

app.listen(PORT, () => {
  console.log(`url-shortener-api listening on http://localhost:${PORT}`);
});
