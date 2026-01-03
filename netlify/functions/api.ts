import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { handle } from 'hono/netlify';

const app = new Hono().basePath('/api');

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Example: GET endpoint
app.get('/employees', async (c) => {
  try {
    // TODO: Implement database query to fetch employees
    const employees = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];
    return c.json({ success: true, data: employees });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch employees' }, 500);
  }
});

// Example: GET endpoint with ID parameter
app.get('/employees/:id', (c) => {
  const id = c.req.param('id');
  try {
    // TODO: Implement database query to fetch employee by ID
    const employee = { id, name: 'John Doe', email: 'john@example.com' };
    return c.json({ success: true, data: employee });
  } catch (error) {
    return c.json({ success: false, error: 'Employee not found' }, 404);
  }
});

// Example: POST endpoint for creating attendance record
app.post('/attendance', async (c) => {
  try {
    const body = await c.req.json();
    const { employeeId, checkInTime, checkOutTime, date } = body;

    // Validation
    if (!employeeId || !date) {
      return c.json(
        { success: false, error: 'Missing required fields' },
        400
      );
    }

    // TODO: Implement database insert for attendance record
    const attendance = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId,
      checkInTime,
      checkOutTime,
      date,
      createdAt: new Date().toISOString(),
    };

    return c.json({ success: true, data: attendance }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create attendance record' }, 500);
  }
});

// Example: GET endpoint to retrieve attendance records
app.get('/attendance/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const { startDate, endDate } = c.req.query();

    // TODO: Implement database query to fetch attendance records
    const attendanceRecords = [
      {
        id: '1',
        employeeId,
        checkInTime: '08:00:00',
        checkOutTime: '17:00:00',
        date: '2026-01-03',
      },
    ];

    return c.json({ success: true, data: attendanceRecords });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch attendance records' }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json(
    { success: false, error: 'Internal Server Error' },
    500
  );
});

export const handler = handle(app);
