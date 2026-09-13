/* ============================================================
 * SPPG Kolaka Pomalaa — Sisi Publik + Login
 * Sumber data: /api/get-menu (Supabase via serverless Vercel)
 * ============================================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const bulan = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
  const bulanCap = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  function fmtDate(iso){
    if(!iso) return '—';
    const d = new Date(String(iso).slice(0,10) + 'T00:00:00');
    if(isNaN(d)) return '—';
    return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
  }
  const fmtNum = n => (Math.round((Number(n)||0)*10)/10).toLocaleString('id-ID');

  // Waktu Indonesia Tengah (UTC+8) — zona operasional SPPG
  function witaNow(){
    const n = new Date();
    return new Date(n.getTime() + (n.getTimezoneOffset() + 480) * 60000);
  }
  function isoDate(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  const todayISO = () => isoDate(witaNow());

  window.toast = function(msg){
    $('toastMsg').textContent = msg;
    $('toast').classList.add('show');
    clearTimeout(window._tt);
    window._tt = setTimeout(()=>$('toast').classList.remove('show'), 3200);
  };

  async function apiGet(path){
    const r = await fetch(path, { headers: { 'Accept': 'application/json' } });
    return r.json();
  }

  /* ==================== VIEW SWITCHING ==================== */
  window.show = function(view){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    $(view).classList.add('active');
    window.scrollTo({top:0, behavior:'instant'});
  };
  $('btnOpenLogin').onclick = ()=>show('view-login');
  $('btnBackPublic').onclick = ()=>show('view-public');
  $('btnPreview').onclick = ()=>{ loadPublic(); show('view-public'); };
  $('btnLogout').onclick = ()=>{
    sessionStorage.removeItem('sppg_token');
    show('view-public');
    toast('Anda telah keluar.');
  };

  /* ==================== RENDER PUBLIC ==================== */
  let SCHEDULES = [];

  function renderPublic(menu){
    $('menuDateChip').textContent = 'MENU HARI INI, ' + fmtDate(menu ? menu.date : todayISO());

    // foto — disajikan versi optimal via Cloudinary, file asli tetap utuh
    if(menu && menu.photo_url){
      $('menuPhotoImg').src = window.cloudinaryDisplay(menu.photo_url, 1400);
      $('menuPhotoImg').style.display = 'block';
      $('menuPhotoPh').style.display = 'none';
    }else{
      $('menuPhotoImg').style.display = 'none';
      $('menuPhotoImg').removeAttribute('src');
      $('menuPhotoPh').style.display = 'block';
    }

    // Stempel BGN hanya tampil kalau menu benar-benar terbit
    const stampEl = $('menuStamp');
    const hasMenu = !!(menu && menu.photo_url && Array.isArray(menu.menus) && menu.menus.length);
    stampEl.style.display = hasMenu ? 'inline-flex' : 'none';

    // daftar menu
    const ol = $('menuList');
    ol.innerHTML = '';
    if(menu && Array.isArray(menu.menus) && menu.menus.length){
      menu.menus.forEach((m,i)=>{
        const li = document.createElement('li');
        li.innerHTML = `<span class="no">${String(i+1).padStart(2,'0')}</span><span></span>`;
        li.lastElementChild.textContent = m; // aman dari XSS
        ol.appendChild(li);
      });
    }else{
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Menu hari ini belum diterbitkan oleh admin.';
      ol.appendChild(li);
    }

    // gizi
    const gk = (menu && menu.gizi_kecil) || {};
    const gb = (menu && menu.gizi_besar) || {};
    $('gKE').textContent = gk.e != null ? fmtNum(gk.e) : '—';
    $('gKP').textContent = gk.p != null ? fmtNum(gk.p) : '—';
    $('gKL').textContent = gk.l != null ? fmtNum(gk.l) : '—';
    $('gKK').textContent = gk.k != null ? fmtNum(gk.k) : '—';
    $('gKS').textContent = gk.s != null ? fmtNum(gk.s) : '—';
    $('gBE').textContent = gb.e != null ? fmtNum(gb.e) : '—';
    $('gBP').textContent = gb.p != null ? fmtNum(gb.p) : '—';
    $('gBL').textContent = gb.l != null ? fmtNum(gb.l) : '—';
    $('gBK').textContent = gb.k != null ? fmtNum(gb.k) : '—';
    $('gBS').textContent = gb.s != null ? fmtNum(gb.s) : '—';

    // hero stats
    $('hcMenu').textContent = (menu && Array.isArray(menu.menus)) ? menu.menus.length : 0;
    $('hcKkal').textContent = gb.e != null ? Math.round(Number(gb.e)).toLocaleString('id-ID') : '0';
    $('hcSatuan').textContent = SCHEDULES.length;

    renderSchedPublic();
  }

  function jenjangClass(j){
    return {TK:'j-tk', SD:'j-sd', SMP:'j-smp', SMA:'j-sma', POSYANDU:'j-pos'}[j] || 'j-tk';
  }
  function statusFor(timeStr){
    const tStr = String(timeStr || '23:59').slice(0,5);
    const now = witaNow();
    const [h,m] = tStr.split(':').map(Number);
    const t = h*60 + m, n = now.getHours()*60 + now.getMinutes();
    if(n < t) return {cls:'st-wait', txt:'MENUNGGU'};
    if(n <= t + 45) return {cls:'st-live', txt:'SEDANG BERLANGSUNG'};
    return {cls:'st-done', txt:'SELESAI'};
  }
  function renderSchedPublic(){
    const tb = $('schedBody');
    tb.innerHTML = '';
    if(!SCHEDULES.length){
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.style.textAlign = 'center';
      td.style.color = 'var(--ink-soft)';
      td.textContent = 'Belum ada data jadwal.';
      tr.appendChild(td);
      tb.appendChild(tr);
      return;
    }
    SCHEDULES.forEach((s,i)=>{
      const st = statusFor(s.time);
      const tr = document.createElement('tr');
      const tdNo = document.createElement('td');
      tdNo.className = 'sched-no';
      tdNo.textContent = String(i+1).padStart(2,'0');
      const tdName = document.createElement('td');
      tdName.className = 'm-name';
      const divN = document.createElement('div');
      divN.className = 'sched-name';
      divN.textContent = s.name;
      const spJ = document.createElement('span');
      spJ.className = 'sched-jenjang ' + jenjangClass(s.jenjang);
      spJ.textContent = s.jenjang;
      tdName.appendChild(divN); tdName.appendChild(spJ);
      const tdTime = document.createElement('td');
      tdTime.className = 'sched-time';
      tdTime.textContent = String(s.time).slice(0,5) + ' WITA';
      const tdSt = document.createElement('td');
      tdSt.className = 'm-right';
      const sp = document.createElement('span');
      sp.className = 'sched-status ' + st.cls;
      const dot = document.createElement('i');
      sp.appendChild(dot);
      sp.appendChild(document.createTextNode(st.txt));
      tdSt.appendChild(sp);
      tr.appendChild(tdNo); tr.appendChild(tdName); tr.appendChild(tdTime); tr.appendChild(tdSt);
      tb.appendChild(tr);
    });
  }

  window.loadPublic = async function(){
    try{
      const res = await apiGet('/api/get-menu?date=' + todayISO());
      if(res.ok){
        SCHEDULES = res.schedules || [];
        renderPublic(res.menu);
      }else{
        toast(res.msg || 'Gagal memuat data.');
      }
    }catch(e){
      toast('Tidak dapat terhubung ke server. Periksa koneksi.');
    }
  };

  /* ==================== RIWAYAT / LACAK ==================== */
  function initRiwayat(dates){
    const dSel = $('riwDay'), mSel = $('riwMonth'), ySel = $('riwYear');
    dSel.innerHTML = ''; mSel.innerHTML = ''; ySel.innerHTML = '';
    for(let d=1; d<=31; d++){
      const o = document.createElement('option');
      o.value = d; o.textContent = d;
      dSel.appendChild(o);
    }
    bulanCap.forEach((b,i)=>{
      const o = document.createElement('option');
      o.value = i+1; o.textContent = b;
      mSel.appendChild(o);
    });
    const now = witaNow();
    const years = new Set([now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1]);
    (dates || []).forEach(dt => years.add(parseInt(String(dt).slice(0,4), 10)));
    [...years].sort().forEach(y=>{
      const o = document.createElement('option');
      o.value = y; o.textContent = y;
      ySel.appendChild(o);
    });
    dSel.value = now.getDate();
    mSel.value = now.getMonth()+1;
    ySel.value = now.getFullYear();
  }

  async function lacakMenu(){
    const d = String($('riwDay').value).padStart(2,'0');
    const m = String($('riwMonth').value).padStart(2,'0');
    const y = $('riwYear').value;
    const key = `${y}-${m}-${d}`;
    const res = $('riwResult');
    res.classList.add('on');
    res.innerHTML = '';
    try{
      const out = await apiGet('/api/get-menu?date=' + key);
      const found = out.ok ? out.menu : null;
      if(!found || !Array.isArray(found.menus) || !found.menus.length){
        res.innerHTML = `
          <div class="riw-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M8.5 11h5"/></svg>
            <div><strong>Menu tidak ditemukan.</strong><br>Belum ada arsip menu untuk tanggal ${fmtDate(key)}.</div>
          </div>`;
        return;
      }
      const box = document.createElement('div');
      box.className = 'riw-found';
      const head = document.createElement('div');
      head.className = 'rf-head';
      const dateEl = document.createElement('span');
      dateEl.className = 'rf-date';
      dateEl.textContent = fmtDate(key);
      const cyc = document.createElement('span');
      cyc.className = 'rf-cycle';
      cyc.textContent = 'Siklus ' + (found.cycle || '—');
      head.appendChild(dateEl); head.appendChild(cyc);
      const ul = document.createElement('ul');
      ul.className = 'riw-items';
      found.menus.forEach((it,i)=>{
        const li = document.createElement('li');
        const no = document.createElement('span');
        no.className = 'no';
        no.textContent = String(i+1).padStart(2,'0');
        const tx = document.createElement('span');
        tx.textContent = it;
        li.appendChild(no); li.appendChild(tx);
        ul.appendChild(li);
      });
      box.appendChild(head); box.appendChild(ul);

      if(found.photo_url){
        const wrap = document.createElement('div');
        wrap.className = 'riw-photo';
        const img = document.createElement('img');
        img.src = window.cloudinaryDisplay(found.photo_url, 900);
        img.alt = 'Foto menu ' + fmtDate(key);
        img.loading = 'lazy';
        wrap.appendChild(img);
        box.appendChild(wrap);
      }

      // ----- Nilai gizi pada riwayat (F2.1) -----
      const gk = found.gizi_kecil || {};
      const gb = found.gizi_besar || {};
      const hasGizi = [gk, gb].some(g => ['e','p','l','k','s'].some(k => g[k] != null));

      if(hasGizi){
        const wrap = document.createElement('div');
        wrap.className = 'riw-gizi';

        const mkCard = (title, pill, g, cls) => {
          const card = document.createElement('div');
          card.className = 'riw-gizi-card ' + cls;

          const h = document.createElement('h5');
          h.appendChild(document.createTextNode(title));
          const p = document.createElement('span');
          p.className = 'riw-pill';
          p.textContent = pill;
          h.appendChild(p);
          card.appendChild(h);

          const rows = [
            ['Energi', g.e, 'kkal'], ['Protein', g.p, 'g'], ['Lemak', g.l, 'g'],
            ['Karbohidrat', g.k, 'g'], ['Serat', g.s, 'g']
          ];
          rows.forEach(([label, val, unit]) => {
            const row = document.createElement('div');
            row.className = 'riw-gizi-row';
            const k = document.createElement('span'); k.className = 'k'; k.textContent = label;
            const dots = document.createElement('span'); dots.className = 'dots';
            const v = document.createElement('span'); v.className = 'v';
            v.textContent = val != null ? fmtNum(val) : '—';
            const u = document.createElement('span'); u.className = 'u'; u.textContent = unit;
            row.append(k, dots, v, u);
            card.appendChild(row);
          });
          return card;
        };

        const grid = document.createElement('div');
        grid.className = 'riw-gizi-grid';
        grid.appendChild(mkCard('Porsi Kecil', 'TK – SD I-III', gk, 'small'));
        grid.appendChild(mkCard('Porsi Besar', 'SD IV-VI – SMP – SMA – BUMIL', gb, 'big'));
        wrap.appendChild(grid);
        box.appendChild(wrap);
      }

      res.appendChild(box);
    }catch(e){
      toast('Tidak dapat terhubung ke server.');
    }
  }
  $('btnLacak').onclick = lacakMenu;

  /* ==================== LOGIN ==================== */
  $('loginForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const btn = $('btnLoginSubmit');
    const err = $('loginErr');
    err.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Memeriksa…';
    try{
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: $('loginUser').value.trim(), pass: $('loginPass').value })
      });
      const out = await r.json();
      if(r.ok && out.ok){
        sessionStorage.setItem('sppg_token', out.token);
        $('loginForm').reset();
        await window.openAdmin();
        toast('Berhasil masuk. Selamat datang, Admin.');
      }else{
        err.textContent = out.msg || 'Nama pengguna atau kata sandi salah.';
        err.style.display = 'block';
      }
    }catch(e2){
      err.textContent = 'Tidak dapat terhubung ke server.';
      err.style.display = 'block';
    }finally{
      btn.disabled = false;
      btn.textContent = 'Masuk ke Dashboard';
    }
  });

  /* ==================== LOGO FALLBACK ==================== */
  function logoFallback(imgId, fbId){
    const img = $(imgId), fb = $(fbId);
    if(!img || !fb) return;
    const swap = ()=>{ img.style.display = 'none'; fb.style.display = 'flex'; };
    img.addEventListener('error', swap);
    if(img.complete && img.naturalWidth === 0) swap();
  }
  logoFallback('logoSppg', 'logoSppgFb');
  logoFallback('logoBgn', 'logoBgnFb');
  logoFallback('logoSppgFoot', null);
  logoFallback('logoSppgAdmin', null);

  /* ==================== JAM DIGITAL WITA ==================== */
function renderClock(){
  const now = witaNow();
  const pad = n => String(n).padStart(2, '0');

  $('ctH').textContent = pad(now.getHours());
  $('ctM').textContent = pad(now.getMinutes());
  $('ctS').textContent = pad(now.getSeconds());

  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const bln = ['Januari','Februari','Maret','April','Mei','Juni',
               'Juli','Agustus','September','Oktober','November','Desember'];
  $('ctDate').textContent =
    hari[now.getDay()] + ', ' + now.getDate() + ' ' +
    bln[now.getMonth()] + ' ' + now.getFullYear();
}
renderClock();
setInterval(renderClock, 1000);
  
  /* ==================== MISC ==================== */
  setInterval(renderSchedPublic, 60000);
  $('year').textContent = new Date().getFullYear();

  window.addEventListener('scroll', ()=>{
    const h = document.documentElement;
    const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
    $('progress').style.width = (pct || 0) + '%';
  }, {passive:true});

  const io = new IntersectionObserver(entries=>{
    entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
  }, {threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  /* ==================== INIT ==================== */
  (async function init(){
    $('maxMbLabel').textContent = (window.SPPG_CONFIG && window.SPPG_CONFIG.PHOTO_MAX_MB) || 10;
    await window.loadPublic();
    try{
      const l = await apiGet('/api/list-dates');
      initRiwayat(l.ok ? l.dates : []);
      window._archiveDates = l.ok ? l.dates : [];
    }catch(e){
      initRiwayat([]);
      window._archiveDates = [];
    }
  })();
})();
