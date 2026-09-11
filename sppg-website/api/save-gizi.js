import { supabase } from './_lib/supabase.js';
import { requireAdmin } from './_lib/auth.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NUM_RE = /^\d{1,5}(\.\d{1,2})?$/;

function cleanGizi(g, maxVal) {
  const out = {};
  for (const k of ['e', 'p', 'l', 'k', 's']) {
    const v = g && g[k] != null ? String(g[k]).trim() : '';
    if (v === '') { out[k] = 0; continue; }
    if (!NUM_RE.test(v)) return null;
    const n = parseFloat(v);
    if (n < 0 || n > maxVal) return null;
    out[k] = n;
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, msg: 'Method tidak diizinkan.' });
  }
  if (!requireAdmin(req, res)) return;

  const { date, gizi_kecil, gizi_besar } = req.body || {};
  if (!DATE_RE.test(String(date || ''))) {
    return res.status(400).json({ ok: false, msg: 'Tanggal tidak valid.' });
  }
  // e (energi) maks 20000 kkal; komponen lain maks 2000 g.
  const gk = cleanGizi(gizi_kecil, 2000);
  const gbRaw = cleanGizi(gizi_besar, 2000);
  if (!gk || !gbRaw) {
    return res.status(400).json({ ok: false, msg: 'Nilai gizi tidak valid.' });
  }
  if (gk.e > 20000 || gbRaw.e > 20000) {
    return res.status(400).json({ ok: false, msg: 'Nilai energi tidak valid.' });
  }

  const { error } = await supabase.from('menus').upsert({
    date,
    gizi_kecil: gk,
    gizi_besar: gbRaw,
    updated_at: new Date().toISOString()
  }, { onConflict: 'date' });

  if (error) return res.status(500).json({ ok: false, msg: 'Gagal menyimpan nilai gizi.' });
  res.status(200).json({ ok: true, msg: 'Nilai gizi diterbitkan.' });
}
