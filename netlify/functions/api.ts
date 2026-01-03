import { Hono } from 'hono';
import { handle } from 'hono/netlify';

// Create Hono app instance
const app = new Hono();

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Welcome endpoint
app.get('/api', (c) => {
  return c.json({ 
    message: 'Welcome to Projek Absen Karyawan API',
    version: '1.0.0'
  });
});

// Example endpoint structure - add your routes here
app.get('/api/employees', (c) => {
  return c.json({ employees: [] });
});

app.post('/api/attendance', (c) => {
  return c.json({ success: true, message: 'Attendance recorded' });
});

// Error handling
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Export handler for Netlify Functions
export const handler = handle(app);
