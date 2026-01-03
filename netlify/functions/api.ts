import { Hono } from 'hono';
import { handle } from 'hono/netlify';

const app = new Hono();

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Example endpoint
app.get('/api/hello', (c) => {
  const name = c.req.query('name') || 'World';
  return c.json({ message: `Hello, ${name}!` });
});

// POST example endpoint
app.post('/api/data', async (c) => {
  const body = await c.req.json();
  return c.json({ received: body, timestamp: new Date().toISOString() });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

export const handler = handle(app);
