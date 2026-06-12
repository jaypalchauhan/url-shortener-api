# url-shortener-api

A minimal URL shortener REST API built with **Express** and **SQLite**
(better-sqlite3). Supports custom short codes, click tracking and link stats.

## Features

- Shorten any http/https URL to a 6-character code
- Optional custom codes (`/my-link` instead of `/x7Bq2k`)
- 302 redirect with per-link click counting
- Stats endpoint (clicks, created date) and full link listing
- SQLite storage in WAL mode — single file, no database server needed
- Tested with Node's built-in test runner + supertest

## Run it with Docker (GitHub Packages)

Every push to `main` runs the tests and publishes an image to GitHub Container
Registry via GitHub Actions:

```bash
docker run -p 3000:3000 -v shortener-data:/data ghcr.io/jaypalchauhan/url-shortener-api:latest
```

The SQLite database lives on the `shortener-data` volume, so your links survive
container restarts.

## Getting started (from source)

Requires Node.js 18+.

```bash
git clone https://github.com/jaypalchauhan/url-shortener-api.git
cd url-shortener-api
npm install
npm start
```

The API listens on `http://localhost:3000` (override with the `PORT` env var).
Links are stored in `links.db` (override with `DB_PATH`).

## API

### Shorten a URL

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/jaypalchauhan"}'
```

```json
{
  "code": "x7Bq2k",
  "shortUrl": "http://localhost:3000/x7Bq2k",
  "longUrl": "https://github.com/jaypalchauhan"
}
```

Pass `"code": "my-link"` in the body for a custom code (4-20 chars, letters,
digits, `-`, `_`). Returns `409` if the code is taken.

### Follow a short link

```
GET /:code  ->  302 redirect to the original URL (click is counted)
```

### Stats and management

| Method | Endpoint            | Description                          |
| ------ | ------------------- | ------------------------------------ |
| GET    | `/api/stats/:code`  | Clicks, original URL, created date   |
| GET    | `/api/links`        | List all links, newest first         |
| DELETE | `/api/links/:code`  | Delete a link (204 on success)       |

All errors return JSON: `{ "error": "..." }` with a proper status code
(400 invalid input, 404 unknown code, 409 code taken).

## Running tests

```bash
npm test
```

## License

MIT — see [LICENSE](LICENSE).
