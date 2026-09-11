import crypto from 'crypto';
import { requireAdmin } from './_lib/auth.js';

// Tanda tangan upload Cloudinary (SIGNED) — hanya admin yang bisa upload.
// Browser meminta signature di sini, lalu upload langsung ke Cloudinary.
const PUBLIC_ID_RE = /^[\w\-]{3,100}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, msg: 'Method tidak diizinkan.' });
  }
  if (!requireAdmin(req, res)) return;

  const { public_id } = req.body || {};
  if (!PUBLIC_ID_RE.test(String(public_id || ''))) {
    return res.status(400).json({ ok: false, msg: 'Nama foto tidak valid.' });
  }

  const folder = 'sppg-menu';
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&public_id=${public_id}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(toSign + process.env.CLOUDINARY_API_SECRET)
    .digest('hex');

  res.status(200).json({
    ok: true,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    folder,
    public_id,
    timestamp,
    signature
  });
}
