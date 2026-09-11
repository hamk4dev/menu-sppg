-- ============================================================
-- SPPG Kolaka Pomalaa Dawi-Dawi — Skema Database (Supabase)
-- Jalankan SEKALI di: Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists public.menus (
  date        date primary key,             -- kunci arsip harian
  cycle       text not null default '',
  menus       jsonb not null default '[]'::jsonb,
  gizi_kecil  jsonb not null default '{}'::jsonb,
  gizi_besar  jsonb not null default '{}'::jsonb,
  photo_url   text,                         -- URL Cloudinary (file asli)
  updated_at  timestamptz not null default now()
);

create table if not exists public.schedules (
  id      bigint generated always as identity primary key,
  name    text not null,
  jenjang text not null default 'TK',
  "time"  time not null default '10:00'
);

create index if not exists menus_date_idx on public.menus (date desc);

-- ---------- KEAMANAN: Row Level Security ----------
-- Publik/anon HANYA boleh membaca. Semua penulisan dilakukan lewat
-- API serverless (service role key) setelah login admin.
alter table public.menus enable row level security;
alter table public.schedules enable row level security;

create policy "publik_baca_menus"
  on public.menus for select using (true);

create policy "publik_baca_schedules"
  on public.schedules for select using (true);

-- Sengaja TIDAK ada policy insert/update/delete untuk anon:
-- permintaan tulis dari browser tanpa service key otomatis ditolak.

-- Data awal jadwal (boleh diubah dari dashboard admin)
insert into public.schedules (name, jenjang, "time") values
  ('TK Bright Little Muslim', 'TK', '10:00'),
  ('TK Pantai Ceria',         'TK', '10:00'),
  ('TK Tunas Terapung',       'TK', '10:00'),
  ('TK Negeri Pembina',       'TK', '10:00'),
  ('TK Aisyiyah Bustanul',    'TK', '10:00'),
  ('SDS Muhammadiyah',        'SD', '12:00'),
  ('SD Negeri 1 Pomalaa',     'SD', '12:00'),
  ('MIN 1 Kolaka',            'SD', '12:00'),
  ('SMPS Muhammadiyah',       'SMP','12:30'),
  ('SMPS Antam Pomalaa',      'SMP','12:30'),
  ('SMAN 1 Pomalaa',          'SMA','14:30'),
  ('SMA Muhammadiyah',        'SMA','15:00'),
  ('Posyandu Serba Guna',     'POSYANDU','15:00'),
  ('Posyandu Mattirowalie',   'POSYANDU','15:00'),
  ('Posyandu Bahari',         'POSYANDU','15:00')
on conflict do nothing;
