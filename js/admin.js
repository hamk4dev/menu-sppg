/* ============================================================
 * SPPG Kolaka Pomalaa — Dashboard Admin
 * Foto diupload SIGNED ke Cloudinary (resolusi asli),
 * seluruh data teks disimpan ke Supabase lewat API terauntikasi.
 * ============================================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const token = () => sessionStorage.getItem('sppg_token');

  let CURRENT_MENU = null;   // menu terbaru yang dimuat
  let SCHEDULES = [];        // jadwal terbaru
  let ARCHIVE = [];          // daftar tanggal terarsip
  let pendingPhoto = null;   // File foto yang belum diterbitkan
  let photoDirty = false;    // true jika foto lama harus dihapus/diganti

  const btnBusy = (btn, busy, label) => {
    btn.disabled = busy;
    btn.textContent = busy ? 'Memproses…' : label;
  };

  async function apiPost(path, body, isForm){
    const r = await fetch(path, {
      method: 'POST',
      headers: isForm ? { 'Authorization': 'Bearer ' + token() }
                      : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
      body: isForm ? body : JSON.stringify(body || {})
    });
    if(r.status === 401){
      sessionStorage.removeItem('sppg_token');
      window.show('view-login');
      window.toast('Sesi berakhir. Silakan masuk kembali.');
      throw new Error('unauthorized');
    }
    return r.json();
  }

  /* ==================== BUKA DASHBOARD ==================== */
  window.openAdmin = async function(){
    if(!token()){ window.show('view-login'); return; }
    window.show('view-admin');
    try{
      const [m, d] = await Promise.all([
        fetch('/api/get-menu?date=' + new Date().toISOString().slice(0,10)).then(r=>r.json()),
        fetch('/api/list-dates').then(r=>r.json())
      ]);
      CURRENT_MENU = (m && m.menu) || null;
      SCHEDULES = (m && m.schedules) || [];
      ARCHIVE = (d && d.dates) || [];
      fillAdmin();
    }catch(e){
      window.toast('Gagal memuat data dashboard.');
    }
  };

  /* ==================== ISI FORM ADMIN ==================== */
  function fillAdmin(){
    const menu = CURRENT_MENU;
    $('adDate').value = (menu && menu.date) || new Date().toISOString().slice(0,10);
    $('adCycle').value = (menu && menu.cycle) || '';

    // foto: tampilkan yang tersimpan, reset foto baru
    pendingPhoto = null;
    photoDirty = false;
    if(menu && menu.photo_url){
      $('upPreviewImg').src = menu.photo_url;
      $('upPreview').classList.add('on');
    }else{
      $('upPreview').classList.remove('on');
      $('upPreviewImg').removeAttribute('src');
    }

    // daftar menu
    const ml = $('menuEditList');
    ml.innerHTML = '';
    const items = (menu && Array.isArray(menu.menus) && menu.menus.length) ? menu.menus : [''];
    items.forEach((m,i)=> ml.appendChild(menuRow(m, i)));

    // gizi
    const gk = (menu && menu.gizi_kecil) || {};
    const gb = (menu && menu.gizi_besar) || {};
    $('gkE').value = gk.e ?? ''; $('gkP').value = gk.p ?? '';
    $('gkL').value = gk.l ?? ''; $('gkK').value = gk.k ?? ''; $('gkS').value = gk.s ?? '';
    $('gbE').value = gb.e ?? ''; $('gbP').value = gb.p ?? '';
    $('gbL').value = gb.l ?? ''; $('gbK').value = gb.k ?? ''; $('gbS').value = gb.s ?? '';

    renderSchedEdit();

    // statistik
    const menuCount = (menu && Array.isArray(menu.menus)) ? menu.menus.length : 0;
    const energy = (gb.e != null) ? Math.round(Number(gb.e)).toLocaleString('id-ID') : '0';
    $('stMenu').textContent = menuCount;
    $('stEnergy').textContent = energy;
    $('stSch').textContent = SCHEDULES.length;
    $('stArchive').textContent = ARCHIVE.length;
    $('stUpdated').textContent = (menu && menu.updated_at)
      ? new Date(menu.updated_at).toLocaleString('id-ID', {dateStyle:'medium', timeStyle:'short'})
      : 'Belum pernah diterbitkan';
    $('cntMenu').textContent = menuCount;
    $('cntSch').textContent = SCHEDULES.length;
  }

  /* ==================== ROW BUILDERS ==================== */
  function menuRow(val, idx){
    const div = document.createElement('div');
    div.className = 'menu-edit-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 120;
    input.placeholder = 'Komponen menu ' + (idx + 1);
    input.value = val;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn';
    btn.title = 'Hapus';
    btn.setAttribute('aria-label', 'Hapus komponen menu');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    btn.onclick = ()=> div.remove();
    div.appendChild(input); div.appendChild(btn);
    return div;
  }
  $('btnAddMenu').onclick = ()=>{
    $('menuEditList').appendChild(menuRow('', $('menuEditList').children.length));
  };

  function schedRow(name, time){
    const tr = document.createElement('tr');
    const tdNo = document.createElement('td');
    tdNo.style.cssText = 'color:var(--sky);font-family:var(--font-display);font-weight:700';
    tdNo.textContent = String($('schedEdit').children.length + 1).padStart(2,'0');
    const tdName = document.createElement('td');
    const inName = document.createElement('input');
    inName.type = 'text'; inName.className = 'sch-name-in'; inName.maxLength = 120;
    inName.value = name || '';
    tdName.appendChild(inName);
    const tdTime = document.createElement('td');
    const inTime = document.createElement('input');
    inTime.type = 'time'; inTime.className = 'sch-time-in';
    inTime.value = (time || '10:00').slice(0,5);
    tdTime.appendChild(inTime);
    const tdDel = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'icon-btn'; btn.title = 'Hapus';
    btn.setAttribute('aria-label', 'Hapus satuan');
    btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    btn.onclick = ()=>{ tr.remove(); renumberSched(); };
    tdDel.appendChild(btn);
    tr.appendChild(tdNo); tr.appendChild(tdName); tr.appendChild(tdTime); tr.appendChild(tdDel);
    return tr;
  }
  function renumberSched(){
    [...$('schedEdit').children].forEach((tr,i)=>{
      tr.firstElementChild.textContent = String(i+1).padStart(2,'0');
    });
  }
  function renderSchedEdit(){
    const tb = $('schedEdit');
    tb.innerHTML = '';
    if(!SCHEDULES.length){
      tb.appendChild(schedRow('', '10:00'));
    }else{
      SCHEDULES.forEach(s=> tb.appendChild(schedRow(s.name, s.time)));
    }
    renumberSched();
  }
  $('btnAddSch').onclick = ()=>{
    $('schedEdit').appendChild(schedRow('', '10:00'));
    renumberSched();
  };

  /* ==================== FOTO ==================== */
  $('upZone').onclick = ()=>$('adPhoto').click();
  $('upZone').addEventListener('keydown', e=>{
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); $('adPhoto').click(); }
  });
  $('adPhoto').addEventListener('change', e=>{
    const f = e.target.files[0];
    if(!f) return;
    const maxMb = (window.SPPG_CONFIG && window.SPPG_CONFIG.PHOTO_MAX_MB) || 10;
    if(!['image/jpeg','image/png','image/webp'].includes(f.type)){
      window.toast('Format harus JPG, PNG, atau WebP.');
      e.target.value = '';
      return;
    }
    if(f.size > maxMb * 1024 * 1024){
      window.toast('Berkas terlalu besar (maks. ' + maxMb + ' MB).');
      e.target.value = '';
      return;
    }
    pendingPhoto = f;
    photoDirty = true;
    $('upPreviewImg').src = URL.createObjectURL(f);
    $('upPreview').classList.add('on');
    window.toast('Foto terlampir. Klik "Simpan & Terbitkan Menu".');
  });

  // Upload foto ASLI ke Cloudinary via SIGNED upload (admin saja).
  async function uploadFoto(file, date){
    const publicId = 'menu_' + date;
    const sign = await apiPost('/api/upload-sign', { public_id: publicId });
    if(!sign.ok) throw new Error(sign.msg || 'Gagal meminta izin unggah.');

    const fd = new FormData();
    fd.append('file', file);                    // file mentah → tersimpan asli/HD
    fd.append('api_key', sign.api_key);
    fd.append('timestamp', sign.timestamp);
    fd.append('folder', sign.folder);
    fd.append('public_id', sign.public_id);
    fd.append('signature', sign.signature);

    const r = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloud_name}/image/upload`, {
      method: 'POST', body: fd
    });
    const out = await r.json();
    if(!r.ok || !out.secure_url) throw new Error('Gagal mengunggah foto ke Cloudinary.');
    return out.secure_url;
  }

  /* ==================== SIMPAN: MENU ==================== */
  $('saveMenu').onclick = async ()=>{
    const btn = $('saveMenu');
    const date = $('adDate').value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){
      window.toast('Tanggal menu tidak valid.');
      return;
    }
    const items = [...document.querySelectorAll('#menuEditList input')]
      .map(i=>i.value.trim()).filter(Boolean);
    if(!items.length){
      window.toast('Daftar menu masih kosong.');
      return;
    }
    btnBusy(btn, true, 'Memproses…');
    try{
      let photoUrl = null;
      if(pendingPhoto){
        photoUrl = await uploadFoto(pendingPhoto, date);
      }else if(CURRENT_MENU && CURRENT_MENU.photo_url && CURRENT_MENU.date === date && !photoDirty){
        photoUrl = CURRENT_MENU.photo_url; // pertahankan foto lama
      }
      const out = await apiPost('/api/save-menu', {
        date,
        cycle: $('adCycle').value.trim(),
        menus: items,
        photo_url: photoUrl
      });
      if(!out.ok) throw new Error(out.msg || 'Gagal menyimpan.');
      pendingPhoto = null;
      window.toast('Menu diterbitkan & diarsipkan ke riwayat.');
      await window.openAdmin();       // segarkan dashboard
      await window.loadPublic();      // segarkan situs publik
    }catch(err){
      if(err.message !== 'unauthorized') window.toast(err.message || 'Gagal menyimpan menu.');
    }finally{
      btnBusy(btn, false, 'Simpan & Terbitkan Menu');
    }
  };

  /* ==================== SIMPAN: GIZI ==================== */
  $('saveGizi').onclick = async ()=>{
    const btn = $('saveGizi');
    const date = $('adDate').value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){
      window.toast('Tanggal menu tidak valid.');
      return;
    }
    const g = id => $(id).value;
    btnBusy(btn, true, 'Memproses…');
    try{
      const out = await apiPost('/api/save-gizi', {
        date,
        gizi_kecil: { e:g('gkE'), p:g('gkP'), l:g('gkL'), k:g('gkK'), s:g('gkS') },
        gizi_besar: { e:g('gbE'), p:g('gbP'), l:g('gbL'), k:g('gbK'), s:g('gbS') }
      });
      if(!out.ok) throw new Error(out.msg || 'Gagal menyimpan.');
      window.toast('Nilai gizi diterbitkan ke situs publik.');
      await window.openAdmin();
      await window.loadPublic();
    }catch(err){
      if(err.message !== 'unauthorized') window.toast(err.message || 'Gagal menyimpan nilai gizi.');
    }finally{
      btnBusy(btn, false, 'Simpan & Terbitkan Nilai Gizi');
    }
  };

  /* ==================== SIMPAN: JADWAL ==================== */
  function guessJenjang(name){
    const n = String(name).toLowerCase();
    if(n.includes('posyandu')) return 'POSYANDU';
    if(n.includes('sman') || n.includes('sma ')) return 'SMA';
    if(n.includes('smp') || n.includes('smps')) return 'SMP';
    if(n.includes('sd') || n.includes('min')) return 'SD';
    return 'TK';
  }
  $('saveJadwal').onclick = async ()=>{
    const btn = $('saveJadwal');
    const rows = [...document.querySelectorAll('#schedEdit tr')].map(tr=>{
      const name = tr.querySelector('.sch-name-in').value.trim();
      const time = tr.querySelector('.sch-time-in').value || '10:00';
      return { name, time, jenjang: guessJenjang(name) };
    }).filter(s=>s.name);
    if(!rows.length){
      window.toast('Daftar jadwal kosong.');
      return;
    }
    btnBusy(btn, true, 'Memproses…');
    try{
      const out = await apiPost('/api/save-jadwal', { schedules: rows });
      if(!out.ok) throw new Error(out.msg || 'Gagal menyimpan.');
      window.toast('Jadwal konsumsi diterbitkan ke situs publik.');
      await window.openAdmin();
      await window.loadPublic();
    }catch(err){
      if(err.message !== 'unauthorized') window.toast(err.message || 'Gagal menyimpan jadwal.');
    }finally{
      btnBusy(btn, false, 'Simpan & Terbitkan Jadwal');
    }
  };

  /* ==================== NAVIGASI PANEL ==================== */
  document.querySelectorAll('.side button').forEach(b=>{
    b.onclick = ()=>{
      document.querySelectorAll('.side button').forEach(x=>x.classList.remove('on'));
      document.querySelectorAll('.a-panel').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      $('ap-' + b.dataset.panel).classList.add('on');
    };
  });
})();
