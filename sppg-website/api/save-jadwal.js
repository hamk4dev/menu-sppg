import { supabase } from './_lib/supabase.js';
import { requireAdmin } from './_lib/auth.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const JENJANG = ['TK', 'SD', 'SMP', 'SMA', 'POSYANDU'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, msg: 'Method tidak diizinkan.' });
  }
  if (!requireAdmin(req, res)) return;

  const { schedules } = req.body || {};
  if (!Array.isArray(schedules) || schedules.length === 0 || schedules.length > 100) {
    return res.status(400).json({ ok: false, msg: 'Daftar jadwal tidak valid (maks. 100 satuan).' });
  }
  const rows = [];
  for (const s of schedules) {
    const name = String(s.name || '').trim().slice(0, 120);
    const time = String(s.time || '').slice(0, 5);
    const jenjang = JENJANG.includes(s.jenjang) ? s.jenjang : 'TK';
    if (!name || !TIME_RE.test(time)) {
      return res.status(400).json({ ok: false, msg: 'Ada nama satuan kosong atau jam tidak valid.' });
    }
    rows.push({ name, jenjang, time });
  }

  // Ganti seluruh isi tabel (service role, dalam urutan: hapus lalu sisip).
  const { error: delErr } = await supabase.from('schedules').delete().gte('id', 0);
  if (delErr) return res.status(500).json({ ok: false, msg: 'Gagal memperbarui jadwal.' });
  const { error: insErr } = await supabase.from('schedules').insert(rows);
  if (insErr) return res.status(500).json({ ok: false, msg: 'Gagal memperbarui jadwal.' });

  res.status(200).json({ ok: true, msg: 'Jadwal diterbitkan.' });
}
