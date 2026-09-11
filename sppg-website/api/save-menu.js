import { supabase } from './_lib/supabase.js';
import { requireAdmin } from './_lib/auth.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, msg: 'Method tidak diizinkan.' });
  }
  if (!requireAdmin(req, res)) return;

  const { date, cycle, menus, photo_url } = req.body || {};

  if (!DATE_RE.test(String(date || ''))) {
    return res.status(400).json({ ok: false, msg: 'Tanggal tidak valid.' });
  }
  if (!Array.isArray(menus) || menus.length === 0 || menus.length > 30) {
    return res.status(400).json({ ok: false, msg: 'Daftar menu tidak valid (maks. 30 item).' });
  }
  const cleanMenus = menus.map(m => String(m).trim().slice(0, 120)).filter(Boolean);
  if (cleanMenus.length === 0) {
    return res.status(400).json({ ok: false, msg: 'Daftar menu kosong.' });
  }
  // Hanya terima URL foto dari Cloudinary milik kita.
  if (photo_url && !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(photo_url)) {
    return res.status(400).json({ ok: false, msg: 'URL foto tidak valid.' });
  }

  const { error } = await supabase.from('menus').upsert({
    date,
    cycle: String(cycle || '').trim().slice(0, 30),
    menus: cleanMenus,
    photo_url: photo_url || null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'date' });

  if (error) return res.status(500).json({ ok: false, msg: 'Gagal menyimpan menu.' });
  res.status(200).json({ ok: true, msg: 'Menu diterbitkan & diarsipkan.' });
}
