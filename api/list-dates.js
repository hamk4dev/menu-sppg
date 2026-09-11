import { supabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, msg: 'Method tidak diizinkan.' });
  }
  const { data, error } = await supabase
    .from('menus').select('date').order('date', { ascending: false });
  if (error) return res.status(500).json({ ok: false, msg: 'Kesalahan database.' });
  res.status(200).json({ ok: true, dates: (data || []).map(r => r.date) });
}
