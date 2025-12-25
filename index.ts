import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

type Env = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Login endpoint
app.post(
  "/api/login",
  zValidator(
    "json",
    z.object({
      userType: z.enum(["admin", "karyawan"]),
      userId: z.string(),
      password: z.string(),
    })
  ),
  async (c) => {
    const { userType, userId, password } = c.req.valid("json");

    try {
      if (userType === "admin") {
        const admin = await c.env.DB.prepare(
          "SELECT * FROM admins WHERE admin_id = ? AND password = ? AND is_active = 1"
        )
          .bind(userId, password)
          .first();

        if (!admin) {
          return c.json({ error: "ID Admin atau password salah" }, 401);
        }

        return c.json({ success: true, user: admin });
      } else {
        const employee = await c.env.DB.prepare(
          "SELECT * FROM employees WHERE employee_id = ? AND password = ? AND is_active = 1"
        )
          .bind(userId, password)
          .first();

        if (!employee) {
          return c.json({ error: "ID Karyawan atau password salah" }, 401);
        }

        return c.json({ success: true, user: employee });
      }
    } catch (error) {
      console.error("Login error:", error);
      return c.json({ error: "Terjadi kesalahan server" }, 500);
    }
  }
);

// Get stats
app.get("/api/stats", async (c) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const totalEmployees = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM employees WHERE is_active = 1"
    ).first();

    const presentToday = await c.env.DB.prepare(
      "SELECT COUNT(DISTINCT employee_id) as count FROM attendance WHERE DATE(created_at) = ?"
    )
      .bind(today)
      .first();

    const pendingLeave = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'"
    ).first();

    const totalAdmins = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM admins WHERE is_active = 1"
    ).first();

    return c.json({
      totalEmployees: totalEmployees?.count || 0,
      presentToday: presentToday?.count || 0,
      pendingLeave: pendingLeave?.count || 0,
      totalAdmins: totalAdmins?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

// Employees endpoints
app.get("/api/employees", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT id, employee_id, name, email, phone, position, is_active, created_at FROM employees ORDER BY created_at DESC"
    ).all();

    return c.json(results);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return c.json({ error: "Failed to fetch employees" }, 500);
  }
});

app.post(
  "/api/employees",
  zValidator(
    "json",
    z.object({
      employee_id: z.string(),
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      position: z.string().optional(),
      password: z.string(),
    })
  ),
  async (c) => {
    const data = c.req.valid("json");

    try {
      const existing = await c.env.DB.prepare(
        "SELECT id FROM employees WHERE employee_id = ?"
      )
        .bind(data.employee_id)
        .first();

      if (existing) {
        return c.json({ error: "ID karyawan sudah digunakan" }, 400);
      }

      const now = new Date().toISOString();

      await c.env.DB.prepare(
        "INSERT INTO employees (employee_id, name, email, phone, position, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(
          data.employee_id,
          data.name,
          data.email || null,
          data.phone || null,
          data.position || null,
          data.password,
          now,
          now
        )
        .run();

      return c.json({ success: true });
    } catch (error) {
      console.error("Error creating employee:", error);
      return c.json({ error: "Failed to create employee" }, 500);
    }
  }
);

app.put(
  "/api/employees/:id",
  zValidator(
    "json",
    z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      position: z.string().optional(),
      password: z.string().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");

    try {
      const now = new Date().toISOString();

      if (data.password) {
        await c.env.DB.prepare(
          "UPDATE employees SET name = ?, email = ?, phone = ?, position = ?, password = ?, updated_at = ? WHERE id = ?"
        )
          .bind(
            data.name,
            data.email || null,
            data.phone || null,
            data.position || null,
            data.password,
            now,
            id
          )
          .run();
      } else {
        await c.env.DB.prepare(
          "UPDATE employees SET name = ?, email = ?, phone = ?, position = ?, updated_at = ? WHERE id = ?"
        )
          .bind(data.name, data.email || null, data.phone || null, data.position || null, now, id)
          .run();
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("Error updating employee:", error);
      return c.json({ error: "Failed to update employee" }, 500);
    }
  }
);

app.delete("/api/employees/:id", async (c) => {
  const id = c.req.param("id");

  try {
    // Delete all related data first (cascade delete)
    await c.env.DB.prepare("DELETE FROM attendance WHERE employee_id = ?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM leave_requests WHERE employee_id = ?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM notifications WHERE recipient_id = ?").bind(id).run();
    
    // Then delete the employee
    await c.env.DB.prepare("DELETE FROM employees WHERE id = ?").bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return c.json({ error: "Failed to delete employee" }, 500);
  }
});

app.delete("/api/employees/delete-all", async (c) => {
  try {
    // Delete all related data first (cascade delete)
    await c.env.DB.prepare("DELETE FROM attendance").run();
    await c.env.DB.prepare("DELETE FROM leave_requests").run();
    await c.env.DB.prepare("DELETE FROM notifications WHERE recipient_type = 'employee'").run();
    
    // Then delete all employees
    await c.env.DB.prepare("DELETE FROM employees").run();
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting all employees:", error);
    return c.json({ error: "Failed to delete all employees" }, 500);
  }
});

// Admins endpoints
app.get("/api/admins", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT id, admin_id, name, email, is_active, created_at FROM admins ORDER BY created_at DESC"
    ).all();

    return c.json(results);
  } catch (error) {
    console.error("Error fetching admins:", error);
    return c.json({ error: "Failed to fetch admins" }, 500);
  }
});

app.post(
  "/api/admins",
  zValidator(
    "json",
    z.object({
      admin_id: z.string(),
      name: z.string(),
      email: z.string().optional(),
      password: z.string(),
    })
  ),
  async (c) => {
    const data = c.req.valid("json");

    try {
      const existing = await c.env.DB.prepare("SELECT id FROM admins WHERE admin_id = ?")
        .bind(data.admin_id)
        .first();

      if (existing) {
        return c.json({ error: "ID admin sudah digunakan" }, 400);
      }

      const now = new Date().toISOString();

      await c.env.DB.prepare(
        "INSERT INTO admins (admin_id, name, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
        .bind(data.admin_id, data.name, data.email || null, data.password, now, now)
        .run();

      return c.json({ success: true });
    } catch (error) {
      console.error("Error creating admin:", error);
      return c.json({ error: "Failed to create admin" }, 500);
    }
  }
);

app.put(
  "/api/admins/:id",
  zValidator(
    "json",
    z.object({
      name: z.string(),
      email: z.string().optional(),
      password: z.string().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");

    try {
      const now = new Date().toISOString();

      if (data.password) {
        await c.env.DB.prepare(
          "UPDATE admins SET name = ?, email = ?, password = ?, updated_at = ? WHERE id = ?"
        )
          .bind(data.name, data.email || null, data.password, now, id)
          .run();
      } else {
        await c.env.DB.prepare("UPDATE admins SET name = ?, email = ?, updated_at = ? WHERE id = ?")
          .bind(data.name, data.email || null, now, id)
          .run();
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("Error updating admin:", error);
      return c.json({ error: "Failed to update admin" }, 500);
    }
  }
);

app.delete("/api/admins/:id", async (c) => {
  const id = c.req.param("id");

  try {
    await c.env.DB.prepare("DELETE FROM admins WHERE id = ?").bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return c.json({ error: "Failed to delete admin" }, 500);
  }
});

app.delete("/api/admins/delete-all", async (c) => {
  try {
    await c.env.DB.prepare("DELETE FROM admins").run();
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting all admins:", error);
    return c.json({ error: "Failed to delete all admins" }, 500);
  }
});

// Attendance endpoints
app.get("/api/attendance", async (c) => {
  try {
    const date = c.req.query("date");
    let query = `SELECT 
        a.*,
        e.employee_id,
        e.name as employee_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id`;

    if (date) {
      query += ` WHERE DATE(a.created_at) = ?`;
    }

    query += ` ORDER BY a.created_at DESC LIMIT 100`;

    const stmt = c.env.DB.prepare(query);
    const { results } = date ? await stmt.bind(date).all() : await stmt.all();

    return c.json(results);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return c.json({ error: "Failed to fetch attendance" }, 500);
  }
});

app.get("/api/attendance/status", async (c) => {
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ error: "User ID required" }, 400);
  }

  try {
    const employee = await c.env.DB.prepare("SELECT id FROM employees WHERE employee_id = ?")
      .bind(userId)
      .first();

    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    const today = new Date().toISOString().split("T")[0];

    const attendance = await c.env.DB.prepare(
      "SELECT * FROM attendance WHERE employee_id = ? AND DATE(created_at) = ? ORDER BY created_at DESC LIMIT 1"
    )
      .bind(employee.id, today)
      .first();

    const isClockedIn = attendance && attendance.clock_in_at && !attendance.clock_out_at;

    return c.json({ isClockedIn, attendance });
  } catch (error) {
    console.error("Error checking attendance status:", error);
    return c.json({ error: "Failed to check status" }, 500);
  }
});

app.post(
  "/api/attendance/clock",
  zValidator(
    "json",
    z.object({
      userId: z.string(),
      action: z.enum(["in", "out"]),
      photo: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      address: z.string().optional(),
    })
  ),
  async (c) => {
    const { userId, action, photo, latitude, longitude, address } = c.req.valid("json");

    try {
      const employee = await c.env.DB.prepare("SELECT id FROM employees WHERE employee_id = ?")
        .bind(userId)
        .first();

      if (!employee) {
        return c.json({ error: "Employee not found" }, 404);
      }

      const now = new Date().toISOString();

      if (action === "in") {
        await c.env.DB.prepare(
          "INSERT INTO attendance (employee_id, clock_in_at, clock_in_photo, location_latitude, location_longitude, location_address, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'present', ?, ?)"
        )
          .bind(employee.id, now, photo || null, latitude || null, longitude || null, address || null, now, now)
          .run();
      } else {
        const today = new Date().toISOString().split("T")[0];
        const attendance = await c.env.DB.prepare(
          "SELECT id FROM attendance WHERE employee_id = ? AND DATE(created_at) = ? AND clock_out_at IS NULL ORDER BY created_at DESC LIMIT 1"
        )
          .bind(employee.id, today)
          .first();

        if (!attendance) {
          return c.json({ error: "No active clock in found" }, 400);
        }

        await c.env.DB.prepare(
          "UPDATE attendance SET clock_out_at = ?, clock_out_photo = ?, updated_at = ? WHERE id = ?"
        )
          .bind(now, photo || null, now, attendance.id)
          .run();
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("Clock action error:", error);
      return c.json({ error: "Failed to process clock action" }, 500);
    }
  }
);

// Leave requests endpoints
app.get("/api/leave-requests", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT 
        lr.*,
        e.employee_id,
        e.name as employee_name
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      ORDER BY lr.created_at DESC`
    ).all();

    return c.json(results);
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    return c.json({ error: "Failed to fetch leave requests" }, 500);
  }
});

app.post(
  "/api/leave-requests",
  zValidator(
    "json",
    z.object({
      userId: z.string(),
      leave_type: z.string(),
      reason: z.string(),
      start_date: z.string(),
      end_date: z.string(),
    })
  ),
  async (c) => {
    const data = c.req.valid("json");

    try {
      const employee = await c.env.DB.prepare("SELECT id FROM employees WHERE employee_id = ?")
        .bind(data.userId)
        .first();

      if (!employee) {
        return c.json({ error: "Employee not found" }, 404);
      }

      const now = new Date().toISOString();

      await c.env.DB.prepare(
        "INSERT INTO leave_requests (employee_id, leave_type, reason, start_date, end_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)"
      )
        .bind(employee.id, data.leave_type, data.reason, data.start_date, data.end_date, now, now)
        .run();

      return c.json({ success: true });
    } catch (error) {
      console.error("Error creating leave request:", error);
      return c.json({ error: "Failed to create leave request" }, 500);
    }
  }
);

app.post("/api/leave-requests/:id/approve", async (c) => {
  const id = c.req.param("id");

  try {
    const now = new Date().toISOString();

    await c.env.DB.prepare("UPDATE leave_requests SET status = 'approved', updated_at = ? WHERE id = ?")
      .bind(now, id)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error approving leave request:", error);
    return c.json({ error: "Failed to approve leave request" }, 500);
  }
});

app.post("/api/leave-requests/:id/reject", async (c) => {
  const id = c.req.param("id");

  try {
    const now = new Date().toISOString();

    await c.env.DB.prepare("UPDATE leave_requests SET status = 'rejected', updated_at = ? WHERE id = ?")
      .bind(now, id)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error rejecting leave request:", error);
    return c.json({ error: "Failed to reject leave request" }, 500);
  }
});

// Backup endpoint
app.get("/api/backup", async (c) => {
  try {
    const employees = await c.env.DB.prepare("SELECT * FROM employees").all();
    const admins = await c.env.DB.prepare("SELECT * FROM admins").all();
    const attendance = await c.env.DB.prepare("SELECT * FROM attendance").all();
    const leaveRequests = await c.env.DB.prepare("SELECT * FROM leave_requests").all();

    const backup = {
      timestamp: new Date().toISOString(),
      employees: employees.results,
      admins: admins.results,
      attendance: attendance.results,
      leave_requests: leaveRequests.results,
    };

    return c.json(backup);
  } catch (error) {
    console.error("Error creating backup:", error);
    return c.json({ error: "Failed to create backup" }, 500);
  }
});

// Notifications endpoint
app.get("/api/notifications", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50"
    ).all();

    return c.json(results);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return c.json({ error: "Failed to fetch notifications" }, 500);
  }
});

export default app;
