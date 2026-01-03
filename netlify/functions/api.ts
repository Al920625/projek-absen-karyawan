import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Routes
app.get("/", (c) => {
  return c.json({
    message: "Welcome to Absen Karyawan API",
    version: "1.0.0",
    status: "OK",
  });
});

app.get("/api/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Example: Get all employees
app.get("/api/employees", (c) => {
  return c.json({
    data: [],
    message: "Employees retrieved successfully",
  });
});

// Example: Create new employee
app.post("/api/employees", async (c) => {
  try {
    const body = await c.req.json();
    return c.json(
      {
        data: body,
        message: "Employee created successfully",
      },
      201
    );
  } catch (error) {
    return c.json(
      {
        error: "Invalid request body",
      },
      400
    );
  }
});

// Example: Get attendance records
app.get("/api/attendance", (c) => {
  return c.json({
    data: [],
    message: "Attendance records retrieved successfully",
  });
});

// Example: Create attendance record
app.post("/api/attendance", async (c) => {
  try {
    const body = await c.req.json();
    return c.json(
      {
        data: body,
        message: "Attendance record created successfully",
      },
      201
    );
  } catch (error) {
    return c.json(
      {
        error: "Invalid request body",
      },
      400
    );
  }
});

// 404 Handler
app.notFound((c) => {
  return c.json(
    {
      error: "Not Found",
      message: "The requested endpoint does not exist",
    },
    404
  );
});

// Error Handler
app.onError((err, c) => {
  console.error(err);
  return c.json(
    {
      error: "Internal Server Error",
      message: err.message,
    },
    500
  );
});

export default app;
