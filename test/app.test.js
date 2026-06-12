import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { createDb } from '../src/db.js';

describe('url-shortener-api', () => {
  let db;
  let app;

  before(() => {
    db = createDb(':memory:');
    app = createApp(db);
  });

  after(() => {
    db.close();
  });

  beforeEach(() => {
    for (const link of db.list()) {
      db.remove(link.code);
    }
  });

  it('shortens a URL and returns a generated code', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com/some/long/path' });

    assert.equal(res.status, 201);
    assert.match(res.body.code, /^[A-Za-z0-9]{6}$/);
    assert.equal(res.body.longUrl, 'https://example.com/some/long/path');
    assert.ok(res.body.shortUrl.endsWith(`/${res.body.code}`));
  });

  it('accepts a custom code', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com', code: 'my-link' });

    assert.equal(res.status, 201);
    assert.equal(res.body.code, 'my-link');
  });

  it('rejects an invalid URL', async () => {
    const res = await request(app).post('/api/shorten').send({ url: 'not a url' });
    assert.equal(res.status, 400);

    const ftp = await request(app).post('/api/shorten').send({ url: 'ftp://example.com' });
    assert.equal(ftp.status, 400);
  });

  it('rejects a malformed custom code', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com', code: 'a!' });

    assert.equal(res.status, 400);
  });

  it('returns 409 when a custom code is taken', async () => {
    await request(app).post('/api/shorten').send({ url: 'https://example.com', code: 'taken' });
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://other.com', code: 'taken' });

    assert.equal(res.status, 409);
  });

  it('redirects and counts clicks', async () => {
    const { body } = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com/target' });

    const redirect = await request(app).get(`/${body.code}`);
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.location, 'https://example.com/target');

    await request(app).get(`/${body.code}`);

    const stats = await request(app).get(`/api/stats/${body.code}`);
    assert.equal(stats.status, 200);
    assert.equal(stats.body.clicks, 2);
  });

  it('returns 404 for unknown codes', async () => {
    assert.equal((await request(app).get('/nope01')).status, 404);
    assert.equal((await request(app).get('/api/stats/nope01')).status, 404);
    assert.equal((await request(app).delete('/api/links/nope01')).status, 404);
  });

  it('lists all links', async () => {
    await request(app).post('/api/shorten').send({ url: 'https://one.com' });
    await request(app).post('/api/shorten').send({ url: 'https://two.com' });

    const res = await request(app).get('/api/links');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
  });

  it('deletes a link', async () => {
    const { body } = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com', code: 'bye-bye' });

    const del = await request(app).delete(`/api/links/${body.code}`);
    assert.equal(del.status, 204);

    const stats = await request(app).get(`/api/stats/${body.code}`);
    assert.equal(stats.status, 404);
  });
});
