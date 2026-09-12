import { supabase } from './_lib/supabase.js';
import { requireAdmin } from './_lib/auth.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, msg: 'Method tidak diizinkan.' });
  }
  if (!requireAdmin(req, res)) return;

  const { date } = req.body || {};

  if (!DATE_RE.test(String(date || ''))) {
    return res.status(400).json({ ok: false, msg: 'Tanggal tidak valid.' });
  }

  // Hapus record menu sepenuhnya dari tabel menus
  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('date', date);

  if (error) {
    return res.status(500).json({ ok: false, msg: 'Gagal menghapus menu.' });
  }

  res.status(200).json({ ok: true, msg: 'Menu berhasil dihapus dari arsip.' });
}
