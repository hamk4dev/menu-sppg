import { createClient } from '@supabase/supabase-js';

// Koneksi server-side memakai SERVICE ROLE KEY (bypass RLS).
// Key ini hanya ada di environment Vercel — tidak pernah dikirim ke browser.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
