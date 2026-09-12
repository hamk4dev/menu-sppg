/* ============================================================
 * SPPG Kolaka Pomalaa — Konfigurasi Klien
 * Hanya berisi data yang AMAN dipublikasikan (bukan rahasia).
 * ============================================================ */
window.SPPG_CONFIG = {
  // Nama cloud Cloudinary Anda (bukan rahasia — terlihat di URL foto).
  // Contoh: jika URL dashboard https://console.cloudinary.com/.../dAbCdEfGh ...,
  // maka cloud name = "dAbCdEfGh".
  CLOUDINARY_CLOUD_NAME: 'g0nulg1f',

  // Batas ukuran foto yang diizinkan di sisi browser (MB).
  PHOTO_MAX_MB: 10,

  // Lebar tampilan default (px) saat foto disajikan ke pengunjung.
  // File ASLI tetap tersimpan di Cloudinary tanpa diubah.
  PHOTO_THUMB_WIDTH: 1400
};

/* ------------------------------------------------------------
 * Helper transformasi URL Cloudinary.
 * Menyisipkan parameter di antara /image/upload/ dan path file:
 *   f_auto        → pilih format terbaik (WebP/AVIF) otomatis
 *   q_auto:good   → kompresi cerdas tanpa penurunan kasat mata
 *   w_<width>     → perkecil dimensi untuk tampilan
 *
 * File asli TIDAK tersentuh — hanya URL yang dipakai untuk
 * menampilkan yang ditransformasi.
 *
 * Contoh:
 *   cloudinaryDisplay('https://res.cloudinary.com/x/image/upload/v1/sppg-menu/menu_2026-01-15.jpg', 900)
 *   → https://res.cloudinary.com/x/image/upload/f_auto,q_auto:good,w_900/v1/sppg-menu/menu_2026-01-15.jpg
 * ------------------------------------------------------------ */
window.cloudinaryDisplay = function(url, w){
  if(!url) return url;
  const width = w
    || (window.SPPG_CONFIG && window.SPPG_CONFIG.PHOTO_THUMB_WIDTH)
    || 1400;
  return String(url).replace('/image/upload/', `/image/upload/f_auto,q_auto:good,w_${width}/`);
};
