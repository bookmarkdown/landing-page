import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/worker.js';

for (const path of ['/', '/landing', '/landing.html']) {
  test(`${path} serves the landing page and preserves query parameters`, async () => {
    let received;
    const env = {
      ASSETS: {
        fetch: async (request) => {
          received = request;
          return new Response('BMD', { headers: { 'Content-Type': 'text/html' } });
        }
      }
    };
    const response = await worker.fetch(new Request(`https://bmd.example${path}?ref=chrome&lang=en`), env);
    assert.equal(received.url, 'https://bmd.example/?ref=chrome&lang=en');
    assert.equal(await response.text(), 'BMD');
    assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(response.headers.get('Content-Type'), 'text/html');
  });
}

test('asset paths and missing-page status are preserved', async () => {
  let received;
  const env = {
    ASSETS: {
      fetch: async (request) => {
        received = request;
        return new Response('Not found', { status: 404 });
      }
    }
  };
  const response = await worker.fetch(new Request('https://bmd.example/missing.css'), env);
  assert.equal(received.url, 'https://bmd.example/missing.css');
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
});