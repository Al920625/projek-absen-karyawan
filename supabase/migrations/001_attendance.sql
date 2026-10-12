-- ============================================================
-- PT Malaka Express Line — Sistem Absensi
-- Migration 001: tabel + seed data
-- Jalankan di Supabase SQL Editor (project baru).
-- ============================================================

-- ---------- employees ----------
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null,
  name text not null,
  email text,
  phone text,
  position text,
  department text,
  photo_url text,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_employees_user_id on public.employees (user_id);

-- ---------- admins ----------
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null,
  name text not null,
  email text,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_admins_user_id on public.admins (user_id);

-- ---------- attendance ----------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  clock_in_photo text,
  clock_out_photo text,
  latitude double precision,
  longitude double precision,
  address text,
  status text not null default 'present',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_attendance_employee_date
  on public.attendance (employee_id, date desc);

-- ---------- leave_requests ----------
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type text not null,
  reason text,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists idx_leave_requests_employee
  on public.leave_requests (employee_id, created_at desc);
create index if not exists idx_leave_requests_status
  on public.leave_requests (status);

-- ---------- notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees (id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_employee
  on public.notifications (employee_id, created_at desc);

-- ============================================================
-- SEED: hanya akun admin default.
-- user_id=admin / password=admin123
-- Karyawan dibuat manual via dashboard admin.
-- ============================================================

insert into public.admins (user_id, name, email, password_hash)
values (
  'admin',
  'Administrator',
  'admin@malakaexpress.id',
  '$2b$10$6HTlkfK0nbjOtqxTmwKvF.7qsLg1QwHuxKHqtgbIvQdmcq.dIkJOG'
)
on conflict (user_id) do nothing;
