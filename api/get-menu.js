import { supabase } from './_lib/supabase.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, msg: 'Method tidak diizinkan.' });
  }
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  if (!DATE_RE.test(date)) {
    return res.status(400).json({ ok: false, msg: 'Format tanggal tidak valid.' });
  }

  const { data: menu, error } = await supabase
    .from('menus').select('*').eq('date', date).maybeSingle();
  if (error) return res.status(500).json({ ok: false, msg: 'Kesalahan database.' });

  const { data: schedules } = await supabase
    .from('schedules').select('*').order('time', { ascending: true }).order('id', { ascending: true });

  res.status(200).json({ ok: true, menu: menu || null, schedules: schedules || [] });
}
