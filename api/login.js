import { createToken, checkCredentials, loginThrottled } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, msg: 'Method tidak diizinkan.' });
  }
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (loginThrottled(ip)) {
    return res.status(429).json({ ok: false, msg: 'Terlalu banyak percobaan. Coba lagi dalam 5 menit.' });
  }
  const { user, pass } = req.body || {};
  if (!checkCredentials(user, pass)) {
    return res.status(401).json({ ok: false, msg: 'Nama pengguna atau kata sandi salah.' });
  }
  res.status(200).json({ ok: true, token: createToken(user) });
}
