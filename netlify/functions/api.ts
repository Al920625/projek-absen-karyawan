import { Hono } from 'hono';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// ============================================================
// PT Malaka Express Line — Backend API (Netlify Functions)
// Database: Supabase (Postgres). Env vars (di Netlify dashboard):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ============================================================

const app = new Hono();

// ---------- helpers ----------

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Konfigurasi server belum lengkap (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).'
    );
  }
  _sb = createClient(url, key, { auth: { persistSession: false } });
  return _sb;
}

/** Tanggal "hari ini" dalam WIB, format YYYY-MM-DD */
function wibToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Waktu sekarang (ISO UTC) untuk kolom timestamptz */
function nowIso(): string {
  return new Date().toISOString();
}

/** Reverse-geocode di server (dipindah dari browser). */
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'Malaka-Attendance-App/1.0' }, signal: ctrl.signal }
    );
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

function err(c: any, message: string, status = 400) {
  return c.json({ error: message }, status);
}

// ---------- health ----------

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: nowIso() });
});

// ---------- auth ----------

async function loginHandler(c: any) {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return err(c, 'Permintaan tidak valid.');
  }
  const { userType, userId, password } = body ?? {};
  if (userType !== 'admin' && userType !== 'karyawan') {
    return err(c, 'Tipe pengguna tidak valid.');
  }
  if (!userId || !password) {
    return err(c, 'ID dan password wajib diisi.');
  }

  try {
    const table = userType === 'admin' ? 'admins' : 'employees';
    const { data, error } = await sb()
      .from(table)
      .select('id, user_id, name, email, password_hash, is_active')
      .eq('user_id', String(userId))
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return err(
        c,
        userType === 'admin' ? 'ID Admin atau password salah' : 'ID Karyawan atau password salah',
        401
      );
    }
    const ok = await bcrypt.compare(String(password), data.password_hash);
    if (!ok) {
      return err(
        c,
        userType === 'admin' ? 'ID Admin atau password salah' : 'ID Karyawan atau password salah',
        401
      );
    }
    const { password_hash: _ph, ...user } = data;
    return c.json({ success: true, user });
  } catch (e: any) {
    console.error('Login error:', e);
    return err(c, e.message || 'Terjadi kesalahan server.', 500);
  }
}

// Kontrak frontend: POST /api/login
app.post('/api/login', loginHandler);
// Alias sesuai spesifikasi
app.post('/api/auth/login', loginHandler);

// ---------- stats (admin dashboard) ----------

app.get('/api/stats', async (c) => {
  try {
    const today = wibToday();
    const db = sb();

    const [{ count: totalEmployees }, { data: present }, { count: pendingLeave }, { count: totalAdmins }] =
      await Promise.all([
        db.from('employees').select('id', { count: 'exact', head: true }).eq('is_active', true),
        db.from('attendance').select('employee_id').eq('date', today),
        db.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        db.from('admins').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

    const presentToday = new Set((present ?? []).map((r: any) => r.employee_id)).size;

    return c.json({
      totalEmployees: totalEmployees ?? 0,
      presentToday,
      pendingLeave: pendingLeave ?? 0,
      totalAdmins: totalAdmins ?? 0,
    });
  } catch (e: any) {
    console.error('Stats error:', e);
    return err(c, 'Gagal memuat statistik.', 500);
  }
});

// ---------- employees ----------

app.get('/api/employees', async (c) => {
  try {
    const { data, error } = await sb()
      .from('employees')
      .select('id, user_id, name, email, phone, position, department, photo_url, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    // Samakan kontrak frontend lama: employee_id = user_id (string)
    return c.json(
      (data ?? []).map((e: any) => ({ ...e, employee_id: e.user_id }))
    );
  } catch (e: any) {
    console.error('Employees list error:', e);
    return err(c, 'Gagal memuat data karyawan.', 500);
  }
});

app.post('/api/employees', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return err(c, 'Permintaan tidak valid.');
  }
  const { employee_id, user_id, name, email, phone, position, department, password } = body ?? {};
  const uid = String(employee_id ?? user_id ?? '').trim();
  if (!uid || !name || !password) {
    return err(c, 'ID, nama, dan password wajib diisi.');
  }
  try {
    const db = sb();
    const { data: existing } = await db
      .from('employees')
      .select('id')
      .eq('user_id', uid)
      .maybeSingle();
    if (existing) return err(c, 'ID karyawan sudah digunakan.');

    const password_hash = await bcrypt.hash(String(password), 10);
    const { error } = await db.from('employees').insert({
      user_id: uid,
      name: String(name).trim(),
      email: email ? String(email).trim() : null,
      phone: phone ? String(phone).trim() : null,
      position: position ? String(position).trim() : null,
      department: department ? String(department).trim() : null,
      password_hash,
    });
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Employee create error:', e);
    return err(c, 'Gagal menambah karyawan.', 500);
  }
});

app.put('/api/employees/:id', async (c) => {
  const id = c.req.param('id');
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return err(c, 'Permintaan tidak valid.');
  }
  const { name, email, phone, position, department, password } = body ?? {};
  if (!name) return err(c, 'Nama wajib diisi.');
  try {
    const db = sb();
    const patch: any = {
      name: String(name).trim(),
      email: email ? String(email).trim() : null,
      phone: phone ? String(phone).trim() : null,
      position: position ? String(position).trim() : null,
      department: department ? String(department).trim() : null,
    };
    if (password) patch.password_hash = await bcrypt.hash(String(password), 10);
    const { error } = await db.from('employees').update(patch).eq('id', id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Employee update error:', e);
    return err(c, 'Gagal memperbarui karyawan.', 500);
  }
});

// Daftarkan route spesifik SEBELUM :id agar tidak tertelan param
app.delete('/api/employees/delete-all', async (c) => {
  try {
    const db = sb();
    await db.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await db.from('leave_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await db.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error } = await db.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Employees delete-all error:', e);
    return err(c, 'Gagal menghapus semua karyawan.', 500);
  }
});

app.delete('/api/employees/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const { error } = await sb().from('employees').delete().eq('id', id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Employee delete error:', e);
    return err(c, 'Gagal menghapus karyawan.', 500);
  }
});

// ---------- admins ----------

app.get('/api/admins', async (c) => {
  try {
    const { data, error } = await sb()
      .from('admins')
      .select('id, user_id, name, email, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return c.json((data ?? []).map((a: any) => ({ ...a, admin_id: a.user_id })));
  } catch (e: any) {
    console.error('Admins list error:', e);
    return err(c, 'Gagal memuat data admin.', 500);
  }
});

app.post('/api/admins', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return err(c, 'Permintaan tidak valid.');
  }
  const { admin_id, user_id, name, email, password } = body ?? {};
  const uid = String(admin_id ?? user_id ?? '').trim();
  if (!uid || !name || !password) {
    return err(c, 'ID, nama, dan password wajib diisi.');
  }
  try {
    const db = sb();
    const { data: existing } = await db.from('admins').select('id').eq('user_id', uid).maybeSingle();
    if (existing) return err(c, 'ID admin sudah digunakan.');
    const password_hash = await bcrypt.hash(String(password), 10);
    const { error } = await db.from('admins').insert({
      user_id: uid,
      name: String(name).trim(),
      email: email ? String(email).trim() : null,
      password_hash,
    });
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Admin create error:', e);
    return err(c, 'Gagal menambah admin.', 500);
  }
});

app.put('/api/admins/:id', async (c) => {
  const id = c.req.param('id');
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return err(c, 'Permintaan tidak valid.');
  }
  const { name, email, password } = body ?? {};
  if (!name) return err(c, 'Nama wajib diisi.');
  try {
    const db = sb();
    const patch: any = {
      name: String(name).trim(),
      email: email ? String(email).trim() : null,
    };
    if (password) patch.password_hash = await bcrypt.hash(String(password), 10);
    const { error } = await db.from('admins').update(patch).eq('id', id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Admin update error:', e);
    return err(c, 'Gagal memperbarui admin.', 500);
  }
});

app.delete('/api/admins/delete-all', async (c) => {
  try {
    const { error } = await sb()
      .from('admins')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Admins delete-all error:', e);
    return err(c, 'Gagal menghapus semua admin.', 500);
  }
});

app.delete('/api/admins/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const { error } = await sb().from('admins').delete().eq('id', id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Admin delete error:', e);
    return err(c, 'Gagal menghapus admin.', 500);
  }
});

// ---------- attendance ----------

app.get('/api/attendance', async (c) => {
  try {
    const date = c.req.query('date');
    let q = sb()
      .from('attendance')
      .select(
        'id, employee_id, date, clock_in, clock_out, clock_in_photo, clock_out_photo, latitude, longitude, address, status, notes, created_at, employees!inner (user_id, name)'
      )
      .order('created_at', { ascending: false })
      .limit(100);
    if (date) q = q.eq('date', date);
    const { data, error } = await q;
    if (error) throw error;
    return c.json(
      (data ?? []).map((r: any) => ({
        ...r,
        employee_id: r.employees?.user_id,
        employee_name: r.employees?.name,
      }))
    );
  } catch (e: any) {
    console.error('Attendance list error:', e);
    return err(c, 'Gagal memuat data absensi.', 500);
  }
});

app.get('/api/attendance/status', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return err(c, 'User ID wajib diisi.');
  try {
    const db = sb();
    const { data: emp } = await db
      .from('employees')
      .select('id')
      .eq('user_id', String(userId))
      .maybeSingle();
    if (!emp) return err(c, 'Karyawan tidak ditemukan.', 404);

    const { data: att } = await db
      .from('attendance')
      .select('*')
      .eq('employee_id', emp.id)
      .eq('date', wibToday())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const isClockedIn = !!(att && att.clock_in && !att.clock_out);
    return c.json({ isClockedIn, attendance: att ?? null });
  } catch (e: any) {
    console.error('Attendance status error:', e);
    return err(c, 'Gagal memeriksa status absensi.', 500);
  }
});

app.post('/api/attendance/clock', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return err(c, 'Permintaan tidak valid.');
  }
  const { userId, action, photo, latitude, longitude, address } = body ?? {};
  if (!userId || (action !== 'in' && action !== 'out')) {
    return err(c, 'Permintaan tidak valid.');
  }
  try {
    const db = sb();
    const { data: emp } = await db
      .from('employees')
      .select('id, is_active')
      .eq('user_id', String(userId))
      .maybeSingle();
    if (!emp || !emp.is_active) return err(c, 'Karyawan tidak ditemukan.', 404);

    const today = wibToday();

    if (action === 'in') {
      const { data: open } = await db
        .from('attendance')
        .select('id')
        .eq('employee_id', emp.id)
        .eq('date', today)
        .is('clock_out', null)
        .limit(1)
        .maybeSingle();
      if (open) return err(c, 'Anda sudah clock in hari ini.');

      let addr: string | null = address ? String(address) : null;
      const lat = typeof latitude === 'number' ? latitude : null;
      const lon = typeof longitude === 'number' ? longitude : null;
      if (!addr && lat !== null && lon !== null) {
        addr = await reverseGeocode(lat, lon);
      }

      const { error } = await db.from('attendance').insert({
        employee_id: emp.id,
        date: today,
        clock_in: nowIso(),
        clock_in_photo: photo ? String(photo) : null,
        latitude: lat,
        longitude: lon,
        address: addr,
        status: 'present',
      });
      if (error) throw error;
      return c.json({ success: true });
    }

    // clock out
    const { data: open } = await db
      .from('attendance')
      .select('id')
      .eq('employee_id', emp.id)
      .eq('date', today)
      .is('clock_out', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!open) return err(c, 'Belum ada clock in hari ini.');
    const { error } = await db
      .from('attendance')
      .update({ clock_out: nowIso(), clock_out_photo: photo ? String(photo) : null })
      .eq('id', open.id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Clock error:', e);
    return err(c, 'Gagal memproses absensi.', 500);
  }
});

// ---------- leave requests ----------

app.get('/api/leave-requests', async (c) => {
  try {
    const { data, error } = await sb()
      .from('leave_requests')
      .select(
        'id, leave_type, reason, start_date, end_date, status, created_at, employees!inner (user_id, name)'
      )
      .order('created_at', { ascending: false });
    if (error) throw error;
    // employee_id dikembalikan sebagai STRING user_id agar filter
    // frontend (req.employee_id === userId) tetap cocok.
    return c.json(
      (data ?? []).map((r: any) => ({
        ...r,
        employee_id: r.employees?.user_id,
        employee_name: r.employees?.name,
      }))
    );
  } catch (e: any) {
    console.error('Leave list error:', e);
    return err(c, 'Gagal memuat permohonan izin.', 500);
  }
});

app.post('/api/leave-requests', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return err(c, 'Permintaan tidak valid.');
  }
  const { userId, leave_type, reason, start_date, end_date } = body ?? {};
  if (!userId || !leave_type || !start_date || !end_date) {
    return err(c, 'Data permohonan belum lengkap.');
  }
  try {
    const db = sb();
    const { data: emp } = await db
      .from('employees')
      .select('id')
      .eq('user_id', String(userId))
      .maybeSingle();
    if (!emp) return err(c, 'Karyawan tidak ditemukan.', 404);
    const { error } = await db.from('leave_requests').insert({
      employee_id: emp.id,
      leave_type: String(leave_type),
      reason: reason ? String(reason) : null,
      start_date: String(start_date),
      end_date: String(end_date),
      status: 'pending',
    });
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Leave create error:', e);
    return err(c, 'Gagal mengajukan izin.', 500);
  }
});

app.post('/api/leave-requests/:id/approve', async (c) => {
  try {
    const { error } = await sb()
      .from('leave_requests')
      .update({ status: 'approved' })
      .eq('id', c.req.param('id'));
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Leave approve error:', e);
    return err(c, 'Gagal menyetujui izin.', 500);
  }
});

app.post('/api/leave-requests/:id/reject', async (c) => {
  try {
    const { error } = await sb()
      .from('leave_requests')
      .update({ status: 'rejected' })
      .eq('id', c.req.param('id'));
    if (error) throw error;
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Leave reject error:', e);
    return err(c, 'Gagal menolak izin.', 500);
  }
});

// ---------- backup ----------

app.get('/api/backup', async (c) => {
  try {
    const db = sb();
    const [employees, admins, attendance, leaveRequests] = await Promise.all([
      db.from('employees').select('id, user_id, name, email, phone, position, department, is_active, created_at'),
      db.from('admins').select('id, user_id, name, email, is_active, created_at'),
      db.from('attendance').select('*'),
      db.from('leave_requests').select('*'),
    ]);
    if (employees.error) throw employees.error;
    return c.json({
      timestamp: nowIso(),
      employees: employees.data ?? [],
      admins: admins.data ?? [],
      attendance: attendance.data ?? [],
      leave_requests: leaveRequests.data ?? [],
    });
  } catch (e: any) {
    console.error('Backup error:', e);
    return err(c, 'Gagal membuat backup.', 500);
  }
});

// ---------- 404 & error ----------

app.notFound((c) => c.json({ error: 'Not Found' }, 404));
app.onError((e, c) => {
  console.error(e);
  return c.json({ error: 'Terjadi kesalahan server.' }, 500);
});

// ============================================================
// Netlify Function handler (v1, event-based).
// - Normalisasi event.path: Netlify bisa mengirim path hasil rewrite
//   (/.netlify/functions/api/...) — ubah ke /api/... agar route
//   Hono selalu cocok, apa pun bentuk redirect-nya.
// - Konversi event -> Request dan Response -> format Netlify.
// ============================================================

function normalizePath(p: string): string {
  const m = p.match(/^\/\.netlify\/functions\/[^/]+(\/.*)?$/);
  if (m) p = m[1] || '/';
  if (!p.startsWith('/api')) p = p === '/' ? '/api' : '/api' + p;
  return p;
}

function eventToRequest(event: any): Request {
  const headers = event.headers || {};
  const host = headers.host || headers.Host || 'localhost';
  const proto = headers['x-forwarded-proto'] || 'https';
  const path = normalizePath(event.path || '/');
  let url = `${proto}://${host}${path}`;
  const qsp = event.queryStringParameters;
  if (qsp && Object.keys(qsp).length > 0) {
    url += '?' + new URLSearchParams(qsp).toString();
  }
  const reqHeaders = new Headers();
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === 'string') reqHeaders.set(k, v);
  }
  const method = (event.httpMethod || 'GET').toUpperCase();
  let body: BodyInit | undefined;
  if (event.body && method !== 'GET' && method !== 'HEAD') {
    body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
  }
  return new Request(url, { method, headers: reqHeaders, body });
}

async function toNetlifyResult(res: Response) {
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    headers[k] = v;
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    statusCode: res.status,
    headers,
    body: buf.toString('base64'),
    isBase64Encoded: true,
  };
}

export const handler = async (event: any, _context: any) => {
  try {
    const req = eventToRequest(event);
    const res = await app.fetch(req);
    return await toNetlifyResult(res);
  } catch (e: any) {
    console.error('Handler error:', e);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Terjadi kesalahan server.' }),
      isBase64Encoded: false,
    };
  }
};
