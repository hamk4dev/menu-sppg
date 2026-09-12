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

  // Reset nilai gizi menjadi object kosong, tetapi pertahankan data menu lainnya
  const { error } = await supabase
    .from('menus')
    .update({
      gizi_kecil: {},
      gizi_besar: {},
      updated_at: new Date().toISOString()
    })
    .eq('date', date);

  if (error) {
    return res.status(500).json({ ok: false, msg: 'Gagal menghapus nilai gizi.' });
  }

  res.status(200).json({ ok: true, msg: 'Nilai gizi berhasil dihapus.' });
}
