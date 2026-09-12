import crypto from 'crypto';
import { supabase } from './_lib/supabase.js';
import { requireAdmin } from './_lib/auth.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* Hapus file foto di Cloudinary berdasarkan URL yang tersimpan.
 * Fire-and-forget: kegagalan tidak menggagalkan penghapusan row database. */
async function destroyPhoto(url){
  if(!url) return;
  try{
    // Ambil public_id dari URL Cloudinary:
    // .../image/upload/[v123/][folder/]public_id.ext
    const m = String(url).match(/\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
    if(!m) return;
    const public_id = m[1];

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHash('sha1')
      .update(`public_id=${public_id}&timestamp=${timestamp}` + process.env.CLOUDINARY_API_SECRET)
      .digest('hex');

    const body = new URLSearchParams({
      public_id,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      signature
    });

    await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
      { method: 'POST', body }
    );
  }catch{ /* diabaikan — bukan blocker */ }
}

export default async function handler(req, res){
  if(req.method !== 'POST'){
    return res.status(405).json({ ok:false, msg:'Method tidak diizinkan.' });
  }
  if(!requireAdmin(req, res)) return;

  const { date } = req.body || {};
  if(!DATE_RE.test(String(date || ''))){
    return res.status(400).json({ ok:false, msg:'Tanggal tidak valid.' });
  }

  // Ambil URL foto lama dulu (untuk dibersihkan di Cloudinary)
  const { data: prev } = await supabase
    .from('menus')
    .select('photo_url')
    .eq('date', date)
    .maybeSingle();

  if(prev?.photo_url){
    destroyPhoto(prev.photo_url).catch(()=>{});
  }

  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('date', date);

  if(error){
    return res.status(500).json({ ok:false, msg:'Gagal menghapus menu.' });
  }

  res.status(200).json({ ok:true, msg:`Menu tanggal ${date} dihapus.` });
}
