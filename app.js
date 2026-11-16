/* ============================================================================
 *  DAP SALES TRACKER — LOGIKA APLIKASI (HP)
 *
 *  Isi berkas ini, berurutan:
 *    1. Alat bantu (format Rupiah, tanggal, penyimpanan di HP)
 *    2. Hubungan ke server (Google Apps Script) + antrean saat tanpa sinyal
 *    3. Layar hubungkan & layar masuk (PIN)
 *    4. Kerangka: kepala, navigasi bawah, tombol +
 *    5. Beranda (dashboard, grafik, wawasan)
 *    6. Riwayat (cari, filter, rincian, ubah, hapus)
 *    7. Formulir transaksi
 *    8. Laporan harian
 *    9. Akun (PIN, bagikan ke tim, antrean)
 *
 *  Tidak ada yang perlu diubah di sini. Pengaturan ada di config.js.
 * ========================================================================== */
(function () {
  'use strict';

  var VERSI = '1.0.0';
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var HR = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  var WARNA_BRAND = { 'king koil': 'var(--seri-1)', 'florence': 'var(--seri-2)', 'serta': 'var(--seri-3)' };
  var LS = { api: 'dst_api', token: 'dst_token', user: 'dst_user', cache: 'dst_cache', antre: 'dst_antre', pref: 'dst_pref' };

  var app = document.getElementById('app');
  var akarLembar = document.getElementById('lembar-akar');
  var akarToast = document.getElementById('toast-akar');
  var elTip = document.getElementById('tip');

  /* ---------- keadaan aplikasi ---------- */
  var S = {
    api: '', demo: false, token: '', user: null, info: null,
    data: { trx: [], kunj: [] }, master: null, hariIni: isoLokal(new Date()),
    batasMundur: 3, sptBolehUbah: false,
    tab: 'beranda', sibuk: false, mengirim: false, pernahMuat: false,
    filter: { periode: 'bulan', dari: '', sampai: '', spt: '', dec: '', brand: '' }, tren: 'harian',
    rw: { q: '', brand: '', kat: '', dari: '', sampai: '', batas: 40 },
    antre: [], pref: { dec: '', spt: '', sering: [] }, pasang: null
  };
  var F = null;   // formulir transaksi yang sedang dibuka
  var H = null;   // formulir laporan harian yang sedang dibuka
  var M = null;   // layar masuk: { nama, pin, pesan }

  /* ==========================================================================
   * 1. ALAT BANTU
   * ======================================================================== */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function titik(n) { return String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rp(n) { return (n < 0 ? '-' : '') + 'Rp ' + titik(n || 0); }
  function koma1(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }
  function rpRingkas(n) {
    var a = Math.abs(n || 0), t = n < 0 ? '-' : '';
    if (a >= 1e9) return t + 'Rp ' + koma1(a / 1e9) + ' M';
    if (a >= 1e6) return t + 'Rp ' + koma1(a / 1e6) + ' jt';
    if (a >= 1e3) return t + 'Rp ' + Math.round(a / 1e3) + ' rb';
    return t + 'Rp ' + a;
  }
  function angkaSaja(s) { var d = String(s || '').replace(/[^0-9]/g, ''); return d ? Number(d) : 0; }
  function sm(a, b) { return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase(); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function isoLokal(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function tgl(iso) { return new Date(iso + 'T00:00:00Z'); }
  function geser(iso, n) { return new Date(tgl(iso).getTime() + n * 86400000).toISOString().slice(0, 10); }
  function selisih(a, z) { return Math.round((tgl(z) - tgl(a)) / 86400000); }
  function tglPendek(iso) { var d = tgl(iso); return d.getUTCDate() + ' ' + BLN[d.getUTCMonth()]; }
  function tglLabel(iso) { var d = tgl(iso); return HR[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + BLN[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function tglPanjang(iso) { var d = tgl(iso); return HARI[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + BULAN[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function labelYm(ym) { return BULAN[Number(ym.slice(5, 7)) - 1] + ' ' + ym.slice(0, 4); }
  function geserBulan(ym, n) { var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + pad2(m + 1); }
  function hariDalamBulan(ym) { return new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate(); }
  function warnaBrand(b) { return WARNA_BRAND[String(b || '').toLowerCase()] || 'var(--seri-lain)'; }
  function simpan(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penyimpanan penuh/diblokir: abaikan */ } }
  function ambil(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function buang(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  function idBaru() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function admin() { return !!S.user && S.user.peran === 'admin'; }
  function unik(arr) { var o = []; arr.forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); }); return o; }

  var IK = {
    beranda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 7h6V4h-6zM4 20h6v-3H4z"/></svg>',
    riwayat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    harian: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/></svg>',
    akun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/></svg>',
    tambah: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    segar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
    cari: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    awas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5M12 16.5v.5M10.3 3.9L2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    naik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
    turun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    kotak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8"/></svg>',
    piala: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/></svg>',
    kalender: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>',
    struk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/></svg>',
    banding: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18l5-6 4 3 7-9M15 6h5v5"/></svg>',
    orang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 19c1-3 3.5-4.5 6.5-4.5s5.5 1.5 6.5 4.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.5.7 2.5 2 3 4.200"/></svg>',
    toko: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9l1.500-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6"/></svg>'
  };

  function toast(pesan, jenis) {
    var el = document.createElement('div');
    akarToast.innerHTML = '';                              // satu pesan saja di layar
    el.className = 'toast ' + (jenis || 'ok');
    el.innerHTML = (jenis === 'gagal' ? IK.awas : IK.ok) + '<span>' + esc(pesan) + '</span>';
    akarToast.appendChild(el);
    setTimeout(function () { el.classList.add('pergi'); setTimeout(function () { el.remove(); }, 300); }, jenis === 'gagal' ? 5200 : 2800);
  }

  /* ==========================================================================
   * 2. HUBUNGAN KE SERVER + ANTREAN TANPA SINYAL
   * ======================================================================== */
  function galatJaringan(e) { return !e.kode; }      // galat dari server selalu punya kode

  function api(aksi, isi) {
    var badan = Object.assign({ aksi: aksi, token: S.token }, isi || {});
    if (S.demo) return window.DEMO_API(badan);
    // "text/plain" sengaja dipakai supaya browser tidak mengirim permintaan pendahuluan (preflight)
    // yang tidak didukung Apps Script. Isinya tetap JSON.
    return fetch(S.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(badan), redirect: 'follow' })
      .then(function (r) { return r.text(); })
      .then(function (teks) {
        var j;
        try { j = JSON.parse(teks); } catch (e) {
          var g = new Error('Jawaban server tidak dikenali. Periksa URL Web App dan pastikan aksesnya "Siapa saja".'); g.kode = 'JAWABAN'; throw g;
        }
        if (!j.ok) { var er = new Error(j.pesan || 'Gagal.'); er.kode = j.kode || 'GALAT'; throw er; }
        return j;
      });
  }

  function terima(res) {
    if (res.trx) S.data = { trx: res.trx, kunj: res.kunj || [] };
    if (res.master) S.master = res.master;
    if (res.info) S.info = res.info;
    if (res.pengguna) { S.user = res.pengguna; simpan(LS.user, S.user); }
    if (res.hariIni) S.hariIni = res.hariIni;
    if (res.batasMundur !== undefined) S.batasMundur = res.batasMundur;
    if (res.sptBolehUbah !== undefined) S.sptBolehUbah = res.sptBolehUbah;
    S.pernahMuat = true;
    if (!S.demo) simpan(LS.cache, { nama: S.user && S.user.nama, data: S.data, master: S.master, info: S.info, hariIni: S.hariIni, batasMundur: S.batasMundur, sptBolehUbah: S.sptBolehUbah });
    if (res.peringatan) toast(res.peringatan, 'gagal');
  }

  function tanganiGalat(e, diam) {
    if (e.kode === 'SESI') { keluar(true); toast('Sesi berakhir. Silakan masuk lagi.', 'gagal'); return; }
    if (!diam) toast(galatJaringan(e) ? 'Tidak ada sambungan. Coba lagi saat sinyal kembali.' : e.message, 'gagal');
  }

  function muat(segar) {
    if (S.sibuk) return Promise.resolve();
    S.sibuk = true; gambarKepala();
    return api('data', { segar: !!segar }).then(function (res) {
      terima(res); S.sibuk = false; gambar();
      kirimAntre();
    }).catch(function (e) {
      S.sibuk = false; gambarKepala();
      tanganiGalat(e, S.pernahMuat && galatJaringan(e));
    });
  }

  function simpanAntre() { simpan(LS.antre, S.antre); }
  function antreMenunggu() { return S.antre.filter(function (x) { return !x.galat; }); }

  /** Mengirim ulang data yang tersimpan di HP saat tadi tidak ada sinyal. */
  function kirimAntre() {
    if (S.mengirim || !antreMenunggu().length || !S.token) return;
    S.mengirim = true;
    (function lanjut() {
      var x = antreMenunggu()[0];
      if (!x) { S.mengirim = false; gambar(); return; }
      api(x.aksi, x.isi).then(function (res) {
        S.antre.splice(S.antre.indexOf(x), 1); simpanAntre(); terima(res);
        if (!antreMenunggu().length) toast('Data yang tertunda sudah terkirim.');
        lanjut();
      }).catch(function (e) {
        if (e.kode === 'SESI') { S.mengirim = false; tanganiGalat(e); return; }
        if (galatJaringan(e) || e.kode === 'SIBUK') { S.mengirim = false; gambar(); return; }
        x.galat = e.message; simpanAntre(); lanjut();          // ditolak server: tahan, tampilkan di menu Akun
      });
    })();
  }

  /** Transaksi yang masih menunggu sinyal ditampilkan seperti transaksi biasa (bertanda "menunggu kirim"). */
  function trxAntre() {
    return S.antre.filter(function (x) { return x.aksi === 'trxSimpan'; }).map(function (x) {
      var t = x.isi.trx, items = t.items || [];
      var utama = items.slice().sort(function (a, b) { return b.q * b.h - a.q * a.h; })[0] || {};
      return {
        id: t.id, tunda: true, galat: x.galat || '', tgl: t.tgl, spt: t.spt, dec: t.dec, cust: t.cust, inv: t.inv || '', cat: t.cat || '',
        nilai: t.nilai, real: null, items: items, brand: utama.b || '', kat: utama.t || '',
        qty: items.reduce(function (a, i) { return a + i.q; }, 0),
        produk: items.map(function (i) { return (i.q > 1 ? i.q + ' pcs ' : '') + i.s + (i.t ? ' ' + (i.t === 'Mattress Only' ? 'MO' : i.t) : '') + (i.u ? ' ' + i.u : ''); }).join(' + ')
      };
    });
  }
  function semuaTrx() { return S.data.trx.concat(trxAntre()); }

  /* ==========================================================================
   * 3. LAYAR HUBUNGKAN & LAYAR MASUK
   * ======================================================================== */
  function merek() {
    return '<div class="merek"><img src="icons/icon-192.png" alt=""><div><b>DAP Sales Tracker</b><span>Dekoruma O2O</span></div></div>';
  }

  function layarHubung(pesan) {
    app.innerHTML = '<div class="gerbang masuk-halus">' + merek() +
      '<h1>Hubungkan ke spreadsheet</h1>' +
      '<p class="sub">Tempel URL Web App dari Google Apps Script. Cukup sekali di HP ini.</p>' +
      '<div class="medan' + (pesan ? ' salah' : '') + '"><label for="url">URL Web App</label>' +
      '<input class="masukan" id="url" inputmode="url" autocomplete="off" autocapitalize="off" placeholder="https://script.google.com/macros/s/…/exec">' +
      (pesan ? '<div class="galat">' + esc(pesan) + '</div>' : '') + '</div>' +
      '<div style="height:14px"></div><button class="tombol utama-btn penuh" data-a="hubung">Hubungkan</button>' +
      '<p class="kaki">Belum punya URL-nya? Ikuti panduan setup, bagian "Deploy Apps Script".</p></div>';
  }

  function layarMasuk() {
    if (!M) M = { nama: '', pin: '', pesan: '', sibuk: false };
    var h = '<div class="gerbang">' + merek();
    if (!S.info) {
      h += '<div class="muat-awal" style="min-height:50dvh"><div class="putar"></div><p>Menghubungi server…</p></div></div>';
      app.innerHTML = h; return;
    }
    if (!M.nama) {
      h += '<h1>Siapa yang masuk?</h1><p class="sub">Pilih nama Anda, lalu masukkan PIN.</p><div class="nama-grid">';
      h += '<button class="admin" data-a="pilihNama" data-nama="' + esc(S.info.admin) + '"' + (S.info.siap[S.info.admin] ? '' : ' disabled') + '>' + esc(S.info.admin) + '<small>' + (S.info.siap[S.info.admin] ? 'Supervisor' : 'PIN awal belum diisi di Code.gs') + '</small></button>';
      S.info.spt.forEach(function (n) {
        var siap = S.info.siap[n];
        h += '<button data-a="pilihNama" data-nama="' + esc(n) + '"' + (siap ? '' : ' disabled') + '>' + esc(n) + (siap ? '' : '<small>belum ada PIN</small>') + '</button>';
      });
      h += '</div><p class="kaki">Nama belum muncul atau belum punya PIN? Minta supervisor menambahkannya.</p>';
    } else {
      h += '<h1>Halo, ' + esc(M.nama) + '</h1><p class="sub">Masukkan PIN Anda.</p><div class="pin-titik">';
      for (var i = 0; i < Math.max(4, M.pin.length); i++) h += '<i class="' + (i < M.pin.length ? 'terisi' : '') + '"></i>';
      h += '</div><div class="pin-pesan">' + esc(M.pesan) + '</div><div class="tuts">';
      [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (n) { h += '<button data-a="tuts" data-n="' + n + '">' + n + '</button>'; });
      h += '<button class="polos" data-a="gantiNama">Ganti nama</button><button data-a="tuts" data-n="0">0</button><button class="polos" data-a="tuts" data-n="x" aria-label="Hapus satu angka">Hapus</button></div>';
      h += '<div style="height:16px"></div><button class="tombol utama-btn penuh" data-a="masuk"' + (M.pin.length < 4 || M.sibuk ? ' disabled' : '') + '>' + (M.sibuk ? '<span class="putar kecil putih"></span> Memeriksa…' : 'Masuk') + '</button>';
    }
    app.innerHTML = h + '</div>';
  }

  function ambilInfo() {
    return api('info').then(function (res) { S.info = { admin: res.admin, spt: res.spt, siap: res.siap }; });
  }

  function keluar(pertahankanAntre) {
    S.token = ''; S.user = null; S.data = { trx: [], kunj: [] }; S.pernahMuat = false; M = null;
    S.filter = { periode: 'bulan', dari: '', sampai: '', spt: '', dec: '', brand: '' }; S.rw = { q: '', brand: '', kat: '', dari: '', sampai: '', batas: 40 }; S.tab = 'beranda';
    buang(LS.token); buang(LS.user); buang(LS.cache);
    if (!pertahankanAntre) { S.antre = []; simpanAntre(); }
    tutupLembar(); layarMasuk();
    if (!S.info) ambilInfo().then(layarMasuk).catch(function (e) { layarHubung(galatJaringan(e) ? 'Tidak bisa menghubungi server. Periksa sinyal atau URL.' : e.message); });
  }

  /* ==========================================================================
   * 4. KERANGKA: KEPALA, NAVIGASI, TOMBOL +
   * ======================================================================== */
  function judulTab() {
    if (S.tab === 'beranda') return ['Halo, ' + S.user.nama, tglPanjang(S.hariIni)];
    if (S.tab === 'riwayat') return ['Riwayat', admin() ? 'Semua transaksi tim' : 'Transaksi Anda'];
    if (S.tab === 'harian') return ['Laporan harian', 'Kunjungan toko dan pengunjung'];
    return ['Akun', admin() ? 'Supervisor' : 'SPT'];
  }

  function htmlKepala() {
    var j = judulTab(), tunda = S.antre.length;
    return '<div><h1>' + esc(j[0]) + '</h1><div class="ket">' + esc(j[1]) + '</div></div>' +
      '<div class="aksi"><button class="bulat' + (S.sibuk || S.mengirim ? ' sibuk' : '') + '" data-a="segar" aria-label="Muat ulang data">' + IK.segar + (tunda ? '<span class="titik"></span>' : '') + '</button></div>';
  }
  function gambarKepala() { var k = document.getElementById('kepala'); if (k) k.innerHTML = htmlKepala(); }

  function htmlNav() {
    function tab(id, label) { return '<button class="tab' + (S.tab === id ? ' aktif' : '') + '" data-a="tab" data-tab="' + id + '"' + (S.tab === id ? ' aria-current="page"' : '') + '>' + IK[id] + '<span>' + label + '</span></button>'; }
    return '<nav class="nav" aria-label="Navigasi utama">' + tab('beranda', 'Beranda') + tab('riwayat', 'Riwayat') +
      '<button class="fab" data-a="tambah" aria-label="Tambah transaksi">' + IK.tambah + '</button>' + tab('harian', 'Harian') + tab('akun', 'Akun') + '</nav>';
  }

  function htmlPita() {
    var h = '';
    if (S.demo) h += '<div class="pita demo">Mode contoh. Semua data di sini fiktif dan tidak tersimpan.</div>';
    var tunggu = antreMenunggu().length, gagal = S.antre.length - tunggu;
    if (tunggu) h += '<div class="pita tunda">' + tunggu + ' data menunggu sinyal untuk dikirim.<button data-a="kirimAntre">Kirim sekarang</button></div>';
    if (gagal) h += '<div class="pita tunda">' + gagal + ' data ditolak server.<button data-a="tab" data-tab="akun">Lihat</button></div>';
    return h;
  }

  function gambar(animasi) {
    if (!S.user) return;
    var isi = S.tab === 'beranda' ? htmlBeranda() : S.tab === 'riwayat' ? htmlRiwayat() : S.tab === 'harian' ? htmlHarian() : htmlAkun();
    var gulir = window.scrollY;
    app.innerHTML = '<header class="kepala" id="kepala">' + htmlKepala() + '</header><main class="isi' + (animasi ? ' masuk-halus' : '') + '" id="isi">' + htmlPita() + isi + '</main>' + htmlNav();
    if (!animasi) window.scrollTo(0, gulir);
  }

  /* ---------- lembar (panel dari bawah) ---------- */
  function bukaLembar(html, opsi) {
    opsi = opsi || {};
    akarLembar.innerHTML = '<div class="tirai"' + (opsi.kunci ? '' : ' data-a="tutupTirai"') + '><div class="lembar' + (opsi.penuh ? ' penuh' : '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
    document.body.style.overflow = 'hidden';
  }
  function tutupLembar() { akarLembar.innerHTML = ''; document.body.style.overflow = ''; F = null; H = null; }
  function kepalaLembar(judul, teksTutup) { return '<div class="lk"><h2>' + esc(judul) + '</h2><button data-a="tutup">' + (teksTutup || 'Tutup') + '</button></div>'; }

  /* ==========================================================================
   * 5. BERANDA
   * ======================================================================== */
  function rentang() {
    var f = S.filter, h = S.hariIni, a, z = h, pa, pz, banding;
    if (f.periode === 'hari') { a = h; pa = pz = geser(h, -1); banding = 'kemarin'; }
    else if (f.periode === 'minggu') { var d = (tgl(h).getUTCDay() + 6) % 7; a = geser(h, -d); pa = geser(a, -7); pz = geser(h, -7); banding = 'minggu lalu'; }
    else if (f.periode === 'kustom' && f.dari && f.sampai && f.dari <= f.sampai) { a = f.dari; z = f.sampai; var n = selisih(a, z) + 1; pz = geser(a, -1); pa = geser(a, -n); banding = n + ' hari sebelumnya'; }
    else {
      var ym = h.slice(0, 7), lalu = geserBulan(ym, -1), hari = Math.min(Number(h.slice(8)), hariDalamBulan(lalu));
      a = ym + '-01'; pa = lalu + '-01'; pz = lalu + '-' + pad2(hari); banding = 'bulan lalu s.d. tanggal ' + hari;
    }
    return { a: a, z: z, pa: pa, pz: pz, banding: banding };
  }
  function lolosTrx(t) {
    var f = S.filter;
    return (!f.spt || sm(t.spt, f.spt)) && (!f.dec || sm(t.dec, f.dec)) && (!f.brand || sm(t.brand || 'Tanpa brand', f.brand));
  }
  function trxDi(a, z) { return semuaTrx().filter(function (t) { return t.tgl >= a && t.tgl <= z && lolosTrx(t); }); }
  function kunjDi(a, z) {
    var f = S.filter;
    return S.data.kunj.filter(function (k) { return k.tgl >= a && k.tgl <= z && (!f.spt || sm(k.spt, f.spt)) && (!f.dec || sm(k.toko, f.dec)); });
  }
  function ringkas(tr, kj) {
    var o = { nilai: 0, n: tr.length, qty: 0, peng: 0 };
    tr.forEach(function (t) { o.nilai += t.nilai; o.qty += t.qty; });
    (kj || []).forEach(function (k) { o.peng += k.peng || 0; });
    return o;
  }
  function kelompok(tr, kunci) {
    var m = {}, urut = [];
    tr.forEach(function (t) {
      var k = kunci(t); if (!m[k]) { m[k] = { k: k, nilai: 0, n: 0, qty: 0 }; urut.push(m[k]); }
      m[k].nilai += t.nilai; m[k].n += 1; m[k].qty += t.qty;
    });
    return urut.sort(function (a, b) { return b.nilai - a.nilai; });
  }
  function htmlDelta(kini, lalu, kelas) {
    if (!lalu && !kini) return '<span class="' + (kelas || 'd') + ' datar">Belum ada pembanding</span>';
    if (!lalu) return '<span class="' + (kelas || 'd') + ' naik">Baru ada periode ini</span>';
    var p = (kini - lalu) / lalu * 100, arah = p > 0.5 ? 'naik' : p < -0.5 ? 'turun' : 'datar';
    return '<span class="' + (kelas || 'd') + ' ' + arah + '">' + (arah === 'naik' ? '▲ ' : arah === 'turun' ? '▼ ' : '') + koma1(Math.abs(p)) + '%</span>';
  }

  function pilihanFilter() {
    var m = S.master || { spt: [], toko: [], brand: [] };
    function pilih(id, kosong, daftar, nilai) {
      return '<select class="masukan" data-i="filter" data-f="' + id + '" aria-label="' + kosong + '">' +
        '<option value="">' + kosong + '</option>' + daftar.map(function (x) { return '<option' + (sm(x, nilai) ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>';
    }
    var kol = [];
    if (admin()) kol.push(pilih('spt', 'Semua SPT', m.spt, S.filter.spt));
    kol.push(pilih('dec', 'Semua DEC', m.toko, S.filter.dec));
    kol.push(pilih('brand', 'Semua brand', m.brand.concat(['Tanpa brand']), S.filter.brand));
    return '<div class="saring" style="grid-template-columns:repeat(' + kol.length + ',minmax(0,1fr))">' + kol.join('') + '</div>';
  }

  function htmlBeranda() {
    var f = S.filter, r = rentang();
    var tr = trxDi(r.a, r.z), kj = kunjDi(r.a, r.z), kini = ringkas(tr, kj);
    var lalu = ringkas(trxDi(r.pa, r.pz), kunjDi(r.pa, r.pz));
    var h = '<div class="segmen" role="tablist">' + [['hari', 'Hari ini'], ['minggu', 'Minggu ini'], ['bulan', 'Bulan ini'], ['kustom', 'Custom']].map(function (p) {
      return '<button data-a="periode" data-p="' + p[0] + '" class="' + (f.periode === p[0] ? 'aktif' : '') + '">' + p[1] + '</button>';
    }).join('') + '</div>';
    if (f.periode === 'kustom') {
      h += '<div class="dua"><div class="medan"><label for="fdari">Dari</label><input class="masukan" id="fdari" type="date" data-i="filterTgl" data-f="dari" value="' + esc(f.dari) + '" max="' + S.hariIni + '"></div>' +
        '<div class="medan"><label for="fsampai">Sampai</label><input class="masukan" id="fsampai" type="date" data-i="filterTgl" data-f="sampai" value="' + esc(f.sampai) + '" max="' + S.hariIni + '"></div></div>';
    }
    h += pilihanFilter();

    if (!S.pernahMuat) return h + '<div class="kartu kosong"><div class="putar" style="margin:0 auto 12px"></div>Mengambil data dari spreadsheet…</div>';

    var labelPeriode = f.periode === 'hari' ? 'hari ini' : f.periode === 'minggu' ? 'minggu ini' : f.periode === 'bulan' ? labelYm(S.hariIni.slice(0, 7)) : tglPendek(r.a) + ' – ' + tglPendek(r.z);
    var p = lalu.nilai ? (kini.nilai - lalu.nilai) / lalu.nilai * 100 : null;
    h += '<section class="utama"><div class="label">Total nilai order ' + esc(labelPeriode) + '</div><div class="angka">' + rp(kini.nilai) + '</div>' +
      '<span class="banding">' + (p === null ? (kini.nilai ? 'Belum ada pembanding' : 'Belum ada transaksi') : (p >= 0 ? IK.naik : IK.turun) + koma1(Math.abs(p)) + '% dibanding ' + esc(r.banding)) + '</span>' +
      percik(r) + '</section>';

    var konv = kini.peng ? kini.n / kini.peng * 100 : null, konvLalu = lalu.peng ? lalu.n / lalu.peng * 100 : null;
    h += '<div class="kpi">' +
      '<div class="kartu"><div class="n">' + kini.n + '</div><div class="l">Transaksi</div>' + htmlDelta(kini.n, lalu.n) + '</div>' +
      '<div class="kartu"><div class="n">' + titik(kini.qty) + '</div><div class="l">Unit terjual</div>' + htmlDelta(kini.qty, lalu.qty) + '</div>' +
      '<div class="kartu"><div class="n">' + titik(kini.peng) + '</div><div class="l">Pengunjung DEC</div>' + htmlDelta(kini.peng, lalu.peng) + '</div>' +
      '<div class="kartu"><div class="n">' + (konv === null ? '–' : koma1(konv) + '%') + '</div><div class="l">Transaksi per pengunjung</div>' + (konv === null || konvLalu === null ? '<span class="d datar">Isi pengunjung di laporan harian</span>' : htmlDelta(konv, konvLalu)) + '</div></div>';

    if (!semuaTrx().length) {
      return h + '<div class="kartu kosong">' + IK.kotak + '<b>Belum ada transaksi</b>Catat penjualan pertama dengan tombol + di bawah.</div>';
    }

    h += kartuTren(r);
    h += kartuBandingBulan();

    var perBrand = kelompok(tr, function (t) { return t.brand || 'Tanpa brand'; });
    h += '<section class="kartu"><div class="judul-baris"><h2>Nilai per brand</h2><span class="ket">' + esc(labelPeriode) + '</span></div>' +
      (perBrand.length ? hbar(perBrand, function (x) { return warnaBrand(x.k); }, true) : kosongKecil()) + '</section>';

    var perKat = kelompok(tr, function (t) { return t.kat || 'Lainnya'; });
    h += '<section class="kartu"><div class="judul-baris"><h2>Nilai per kategori barang</h2><span class="ket">' + esc(labelPeriode) + '</span></div>' + (perKat.length ? hbar(perKat) : kosongKecil()) + '</section>';

    if (admin() && !f.spt) {
      var perSpt = kelompok(tr, function (t) { return t.spt || '-'; });
      h += '<section class="kartu"><div class="judul-baris"><h2>Nilai per SPT</h2><span class="ket">' + esc(labelPeriode) + '</span></div>' + (perSpt.length ? hbar(perSpt) : kosongKecil()) + '</section>';
    }
    if (!f.dec) {
      var perDec = kelompok(tr, function (t) { return t.dec || '-'; });
      h += '<section class="kartu"><div class="judul-baris"><h2>Nilai per DEC</h2><span class="ket">' + esc(labelPeriode) + '</span></div>' + (perDec.length ? hbar(perDec.slice(0, 8)) : kosongKecil()) + '</section>';
    }
    h += kartuWawasan(r, tr, kini, lalu, perBrand);
    return h;
  }
  function kosongKecil() { return '<p class="ket" style="padding:6px 0 2px">Tidak ada transaksi pada periode dan filter ini.</p>'; }

  /** Deret nilai per hari untuk rentang a..z. */
  function deretHarian(a, z) {
    var peta = {}, out = [];
    trxDi(a, z).forEach(function (t) { var o = peta[t.tgl] || (peta[t.tgl] = { v: 0, n: 0 }); o.v += t.nilai; o.n += 1; });
    for (var d = a; d <= z; d = geser(d, 1)) out.push({ k: d, v: peta[d] ? peta[d].v : 0, n: peta[d] ? peta[d].n : 0 });
    return out;
  }
  function deretBulanan(jumlah) {
    var ym = S.hariIni.slice(0, 7), peta = {}, out = [];
    semuaTrx().forEach(function (t) { if (!lolosTrx(t)) return; var k = t.tgl.slice(0, 7), o = peta[k] || (peta[k] = { v: 0, n: 0 }); o.v += t.nilai; o.n += 1; });
    for (var i = jumlah - 1; i >= 0; i--) { var k = geserBulan(ym, -i); out.push({ k: k, v: peta[k] ? peta[k].v : 0, n: peta[k] ? peta[k].n : 0 }); }
    while (out.length > 3 && !out[0].v) out.shift();
    return out;
  }

  /** Garis kecil di panel utama: bentuk penjualan harian pada periode. */
  function percik(r) {
    var a = r.a, z = r.z;
    if (selisih(a, z) < 6) a = geser(z, -13);
    var d = deretHarian(a, z), maks = Math.max.apply(null, d.map(function (x) { return x.v; }));
    if (!maks) return '<div style="height:20px"></div>';
    var W = 320, T = 56, n = d.length, pts = d.map(function (x, i) { return [(i / (n - 1)) * W, T - 6 - (x.v / maks) * (T - 14)]; });
    var jalur = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    return '<svg class="percik" viewBox="0 0 ' + W + ' ' + T + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + jalur + ' L' + W + ' ' + T + ' L0 ' + T + ' Z" fill="rgba(255,255,255,.16)"/><path d="' + jalur + '" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
  }

  function kartuTren(r) {
    var bulanan = S.tren === 'bulanan', d, ket;
    if (bulanan) { d = deretBulanan(12); ket = d.length + ' bulan terakhir'; }
    else {
      var a = r.a, z = r.z;
      if (selisih(a, z) < 6) { a = geser(z, -13); ket = '14 hari terakhir'; }
      else if (selisih(a, z) > 61) { a = geser(z, -61); ket = '62 hari terakhir dari rentang'; }
      else ket = tglPendek(a) + ' – ' + tglPendek(z);
      d = deretHarian(a, z);
    }
    return '<section class="kartu"><div class="judul-baris"><h2>Tren nilai order</h2><div class="segmen kecil" style="width:150px">' +
      '<button data-a="tren" data-t="harian" class="' + (bulanan ? '' : 'aktif') + '">Harian</button><button data-a="tren" data-t="bulanan" class="' + (bulanan ? 'aktif' : '') + '">Bulanan</button></div></div>' +
      grafikBatang(d, bulanan) + '<div class="ket" style="margin-top:6px">' + esc(ket) + '. Sentuh batang untuk melihat angkanya.</div></section>';
  }

  function grafikBatang(d, bulanan) {
    var W = 320, T = 150, kiri = 4, atas = 14, bawah = 20, n = d.length;
    var maks = Math.max.apply(null, d.map(function (x) { return x.v; })) || 1;
    var lebar = (W - kiri * 2) / n, tb = Math.max(2, Math.min(18, lebar - 2)), tinggi = T - atas - bawah;
    var h = '<svg class="grafik" viewBox="0 0 ' + W + ' ' + T + '" role="img" aria-label="Grafik batang nilai order ' + (bulanan ? 'per bulan' : 'per hari') + '">';
    h += '<line class="sumbu" x1="0" x2="' + W + '" y1="' + atas + '" y2="' + atas + '" stroke-dasharray="2 4"/><line class="sumbu" x1="0" x2="' + W + '" y1="' + (T - bawah) + '" y2="' + (T - bawah) + '"/>';
    h += '<text x="0" y="' + (atas - 4) + '">' + rpRingkas(maks) + '</text>';
    var langkah = Math.ceil(n / 6);
    d.forEach(function (x, i) {
      var cx = kiri + lebar * i + lebar / 2, bh = x.v ? Math.max(3, x.v / maks * tinggi) : 0, y = T - bawah - bh, rr = Math.min(4, tb / 2);
      var judul = bulanan ? labelYm(x.k) : tglLabel(x.k), ini = bulanan ? x.k === S.hariIni.slice(0, 7) : x.k === S.hariIni;
      var tip = judul + '|' + rp(x.v) + '|' + x.n + ' transaksi';
      h += '<rect class="kena" data-tip="' + esc(tip) + '" x="' + (cx - lebar / 2).toFixed(1) + '" y="0" width="' + lebar.toFixed(1) + '" height="' + (T - bawah) + '"/>';
      if (bh) h += '<path class="batang' + (ini ? '' : ' redup') + '" pointer-events="none" d="M' + (cx - tb / 2).toFixed(1) + ' ' + (T - bawah) + ' V' + (y + rr).toFixed(1) + ' Q' + (cx - tb / 2).toFixed(1) + ' ' + y.toFixed(1) + ' ' + (cx - tb / 2 + rr).toFixed(1) + ' ' + y.toFixed(1) +
        ' H' + (cx + tb / 2 - rr).toFixed(1) + ' Q' + (cx + tb / 2).toFixed(1) + ' ' + y.toFixed(1) + ' ' + (cx + tb / 2).toFixed(1) + ' ' + (y + rr).toFixed(1) + ' V' + (T - bawah) + ' Z"/>';
      if (i % langkah === 0 || i === n - 1) {
        var lab = bulanan ? BLN[Number(x.k.slice(5, 7)) - 1] : String(Number(x.k.slice(8)));
        if (i === n - 1 && (n - 1) % langkah !== 0 && (n - 1) % langkah < langkah / 2) return;
        h += '<text x="' + cx.toFixed(1) + '" y="' + (T - 5) + '" text-anchor="middle">' + lab + '</text>';
      }
    });
    return h + '</svg>';
  }

  /** Akumulasi nilai order: bulan ini vs bulan lalu, tanggal demi tanggal. */
  function kartuBandingBulan() {
    var ym = S.hariIni.slice(0, 7), lalu = geserBulan(ym, -1), hariIni = Number(S.hariIni.slice(8));
    var nH = Math.max(hariDalamBulan(ym), hariDalamBulan(lalu));
    function kumulatif(b, sampai) {
      var per = {}, out = [], jml = 0;
      semuaTrx().forEach(function (t) { if (t.tgl.slice(0, 7) === b && lolosTrx(t)) per[Number(t.tgl.slice(8))] = (per[Number(t.tgl.slice(8))] || 0) + t.nilai; });
      for (var i = 1; i <= sampai; i++) { jml += per[i] || 0; out.push(jml); }
      return out;
    }
    var A = kumulatif(ym, hariIni), B = kumulatif(lalu, hariDalamBulan(lalu));
    var akhirA = A[A.length - 1] || 0, akhirB = B[B.length - 1] || 0, samaTgl = B[Math.min(hariIni, B.length) - 1] || 0;
    var maks = Math.max(akhirA, akhirB) || 1;
    var W = 320, T = 160, atas = 16, bawah = 20, kanan = 6;
    function x(i) { return (i - 1) / (nH - 1) * (W - kanan); }
    function y(v) { return T - bawah - v / maks * (T - atas - bawah); }
    function jalur(arr) { return arr.map(function (v, i) { return (i ? 'L' : 'M') + x(i + 1).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' '); }
    var h = '<svg class="grafik" viewBox="0 0 ' + W + ' ' + T + '" role="img" aria-label="Grafik akumulasi nilai order bulan ini dibanding bulan lalu">';
    h += '<line class="sumbu" x1="0" x2="' + W + '" y1="' + atas + '" y2="' + atas + '" stroke-dasharray="2 4"/><line class="sumbu" x1="0" x2="' + W + '" y1="' + (T - bawah) + '" y2="' + (T - bawah) + '"/><text x="0" y="' + (atas - 4) + '">' + rpRingkas(maks) + '</text>';
    h += '<path d="' + jalur(B) + '" fill="none" stroke="var(--seri-lain)" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>';
    h += '<path d="' + jalur(A) + '" fill="none" stroke="var(--indigo)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    h += '<circle cx="' + x(A.length).toFixed(1) + '" cy="' + y(akhirA).toFixed(1) + '" r="5" fill="var(--indigo)" stroke="#fff" stroke-width="2"/>';
    [1, 8, 15, 22, nH].forEach(function (i) { h += '<text x="' + x(i).toFixed(1) + '" y="' + (T - 5) + '" text-anchor="' + (i === 1 ? 'start' : i === nH ? 'end' : 'middle') + '">' + i + '</text>'; });
    for (var i = 1; i <= nH; i++) {
      var tip = 'Tanggal ' + i + '|Bulan ini: ' + (i <= A.length ? rp(A[i - 1]) : 'belum berjalan') + '|Bulan lalu: ' + (i <= B.length ? rp(B[i - 1]) : '–');
      h += '<rect class="kena" data-tip="' + esc(tip) + '" x="' + (x(i) - (W / nH) / 2).toFixed(1) + '" y="0" width="' + (W / nH).toFixed(1) + '" height="' + (T - bawah) + '"/>';
    }
    h += '</svg>';
    var beda = akhirA - samaTgl;
    return '<section class="kartu"><div class="judul-baris"><h2>Bulan ini dibanding bulan lalu</h2></div>' +
      '<div class="legenda"><span><i></i>' + esc(labelYm(ym)) + ' ' + rpRingkas(akhirA) + '</span><span><i class="lalu"></i>' + esc(labelYm(lalu)) + ' ' + rpRingkas(akhirB) + '</span></div>' + h +
      '<div class="ket" style="margin-top:6px">Sampai tanggal ' + hariIni + ': ' + (samaTgl || akhirA ? (beda >= 0 ? 'lebih tinggi ' : 'lebih rendah ') + rpRingkas(Math.abs(beda)) + ' dari bulan lalu di tanggal yang sama.' : 'belum ada transaksi di kedua bulan.') + '</div></section>';
  }

  function hbar(rows, warna, denganPersen) {
    var maks = Math.max.apply(null, rows.map(function (x) { return x.nilai; })) || 1;
    var total = rows.reduce(function (a, x) { return a + x.nilai; }, 0) || 1;
    return '<div class="hbar">' + rows.map(function (x) {
      var w = warna ? warna(x) : 'var(--indigo)';
      return '<div class="br"><div class="atas"><span>' + (warna ? '<i class="titik-seri" style="background:' + w + '"></i>' : '') + esc(x.k) + '<em>' + x.n + ' trx, ' + x.qty + ' unit</em></span><span>' + rpRingkas(x.nilai) + (denganPersen ? ' <em>' + Math.round(x.nilai / total * 100) + '%</em>' : '') + '</span></div>' +
        '<div class="rel" data-tip="' + esc(x.k + '|' + rp(x.nilai) + '|' + x.n + ' transaksi, ' + x.qty + ' unit') + '"><i style="width:' + (x.nilai / maks * 100).toFixed(1) + '%;background:' + w + '"></i></div></div>';
    }).join('') + '</div>';
  }

  function kartuWawasan(r, tr, kini, lalu, perBrand) {
    var li = [];
    function butir(ik, judul, isi) { li.push('<li><div class="ik">' + ik + '</div><div><b>' + judul + '</b><span>' + isi + '</span></div></li>'); }
    if (perBrand.length && perBrand[0].nilai) {
      var tot = perBrand.reduce(function (a, x) { return a + x.nilai; }, 0);
      butir(IK.piala, esc(perBrand[0].k) + ' menyumbang nilai terbesar', rp(perBrand[0].nilai) + ', ' + Math.round(perBrand[0].nilai / tot * 100) + '% dari total periode ini.');
    }
    // rata-rata bulanan dari bulan-bulan yang sudah selesai
    var ymIni = S.hariIni.slice(0, 7), perBulan = {};
    semuaTrx().forEach(function (t) { if (lolosTrx(t)) perBulan[t.tgl.slice(0, 7)] = (perBulan[t.tgl.slice(0, 7)] || 0) + t.nilai; });
    var selesai = Object.keys(perBulan).filter(function (k) { return k < ymIni; });
    if (selesai.length) {
      var rata = selesai.reduce(function (a, k) { return a + perBulan[k]; }, 0) / selesai.length, ini = perBulan[ymIni] || 0;
      butir(IK.kalender, 'Rata-rata ' + rpRingkas(rata) + ' per bulan', 'Dari ' + selesai.length + ' bulan yang sudah selesai. Bulan ini sudah ' + Math.round(ini / rata * 100) + '% dari rata-rata itu.');
    }
    if (kini.n) {
      var aov = kini.nilai / kini.n, aovLalu = lalu.n ? lalu.nilai / lalu.n : 0;
      butir(IK.struk, 'Rata-rata ' + rpRingkas(aov) + ' per transaksi', aovLalu ? (aov >= aovLalu ? 'Naik ' : 'Turun ') + koma1(Math.abs(aov - aovLalu) / aovLalu * 100) + '% dibanding ' + esc(r.banding) + ' (' + rpRingkas(aovLalu) + ').' : koma1(kini.qty / kini.n) + ' unit per transaksi.');
    }
    if (lalu.nilai || kini.nilai) {
      var beda = kini.nilai - lalu.nilai;
      butir(IK.banding, (beda >= 0 ? 'Lebih tinggi ' : 'Lebih rendah ') + rpRingkas(Math.abs(beda)), 'Periode ini ' + rpRingkas(kini.nilai) + ', ' + esc(r.banding) + ' ' + rpRingkas(lalu.nilai) + '. Transaksi ' + kini.n + ' dibanding ' + lalu.n + '.');
    }
    var sku = {};
    tr.forEach(function (t) {
      (t.items && t.items.length ? t.items.map(function (i) { return [i.s + (i.t ? ' ' + i.t : ''), i.q]; }) : [[t.produk, t.qty]]).forEach(function (p) { if (p[0]) sku[p[0]] = (sku[p[0]] || 0) + p[1]; });
    });
    var top = Object.keys(sku).sort(function (a, b) { return sku[b] - sku[a]; })[0];
    if (top) butir(IK.kotak, esc(top) + ' paling banyak terjual', sku[top] + ' unit pada periode ini.');
    if (kini.peng && kini.n) butir(IK.orang, koma1(kini.n / kini.peng * 100) + ' transaksi per 100 pengunjung', kini.n + ' transaksi dari ' + titik(kini.peng) + ' pengunjung yang tercatat di laporan harian.');
    if (!li.length) return '';
    return '<section class="kartu"><div class="judul-baris"><h2>Wawasan</h2></div><ul class="wawasan">' + li.join('') + '</ul></section>';
  }

  /* ==========================================================================
   * 6. RIWAYAT
   * ======================================================================== */
  function daftarRiwayat() {
    var f = S.rw, q = f.q.trim().toLowerCase();
    return semuaTrx().filter(function (t) {
      if (f.brand && !sm(t.brand || 'Tanpa brand', f.brand)) return false;
      if (f.kat && !sm(t.kat || 'Lainnya', f.kat)) return false;
      if (f.dari && t.tgl < f.dari) return false;
      if (f.sampai && t.tgl > f.sampai) return false;
      if (q && [t.cust, t.produk, t.inv, t.dec, t.spt, t.brand].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.tgl < b.tgl ? 1 : a.tgl > b.tgl ? -1 : (b.tunda ? 1 : 0) - (a.tunda ? 1 : 0) || (b.row || 0) - (a.row || 0); });
  }

  function htmlItemTrx(t, i) {
    return '<button class="item" data-a="rinci" data-n="' + i + '"><span class="n1">' + esc(t.cust || 'Tanpa nama') + '</span><span class="rp">' + rp(t.nilai) + '</span>' +
      '<span class="n2">' + esc(t.produk) + '</span><span class="qt">' + t.qty + ' unit</span>' +
      '<span class="n3"><span class="titik-seri" style="background:' + warnaBrand(t.brand) + '"></span>' + esc(t.brand || 'Tanpa brand') + '<span>' + esc(t.dec) + '</span>' + (admin() ? '<span>' + esc(t.spt) + '</span>' : '') +
      (t.tunda ? '<span class="lencana tunda">' + (t.galat ? 'ditolak server' : 'menunggu kirim') + '</span>' : '') + (t.luar ? '<span class="lencana luar">di luar blok sheet</span>' : '') + '</span></button>';
  }

  var RW_TAMPIL = [];
  function htmlRiwayat() {
    var f = S.rw, m = S.master || { brand: [], kategori: [] };
    var semua = daftarRiwayat(); RW_TAMPIL = semua.slice(0, f.batas);
    var h = '<div class="cari">' + IK.cari + '<input class="masukan" type="search" data-i="rwCari" value="' + esc(f.q) + '" placeholder="Cari customer, produk, invoice, DEC" aria-label="Cari transaksi"></div>';
    h += '<div class="chip-baris">' + ['', ].concat(m.brand, ['Tanpa brand']).map(function (b) {
      return '<button class="chip kecil' + (sm(f.brand, b) ? ' aktif' : '') + '" data-a="rwBrand" data-v="' + esc(b) + '">' + (b ? '<span class="titik-seri" style="background:' + warnaBrand(b) + '"></span>' + esc(b) : 'Semua brand') + '</button>';
    }).join('') + '</div>';
    var kat = unik(semuaTrx().map(function (t) { return t.kat || 'Lainnya'; }));
    h += '<div class="chip-baris">' + [''].concat(kat).map(function (k) {
      return '<button class="chip kecil' + (sm(f.kat, k) ? ' aktif' : '') + '" data-a="rwKat" data-v="' + esc(k) + '">' + (k ? esc(k) : 'Semua kategori') + '</button>';
    }).join('') + '</div>';
    h += '<div class="dua"><div class="medan"><label for="rwdari">Dari tanggal</label><input class="masukan" id="rwdari" type="date" data-i="rwTgl" data-f="dari" value="' + esc(f.dari) + '"></div>' +
      '<div class="medan"><label for="rwsampai">Sampai tanggal</label><input class="masukan" id="rwsampai" type="date" data-i="rwTgl" data-f="sampai" value="' + esc(f.sampai) + '"></div></div>';
    return h + '<div id="rw-daftar" style="display:grid;gap:10px">' + htmlDaftarRiwayat(semua) + '</div>';
  }
  function htmlDaftarRiwayat(semua) {
    var f = S.rw;
    if (!S.pernahMuat) return '<div class="kartu kosong"><div class="putar" style="margin:0 auto 12px"></div>Mengambil data…</div>';
    if (!semua.length) {
      var adaFilter = f.q || f.brand || f.kat || f.dari || f.sampai;
      return '<div class="kartu kosong">' + IK.struk + '<b>' + (adaFilter ? 'Tidak ada yang cocok' : 'Belum ada transaksi') + '</b>' + (adaFilter ? 'Coba kata kunci lain atau hapus filter.<br><button class="tombol pendek" data-a="rwReset">Hapus filter</button>' : 'Transaksi yang dicatat akan muncul di sini.') + '</div>';
    }
    var tot = semua.reduce(function (a, t) { return a + t.nilai; }, 0);
    var h = '<div class="ket" style="padding:0 4px">' + semua.length + ' transaksi, total ' + rp(tot) + '</div>', tglKini = '', buka = false;
    RW_TAMPIL.forEach(function (t, i) {
      if (t.tgl !== tglKini) {
        if (buka) h += '</div>';
        var hari = semua.filter(function (x) { return x.tgl === t.tgl; });
        h += '<div class="tgl-grup"><span>' + esc(tglLabel(t.tgl)) + (t.tgl === S.hariIni ? ' (hari ini)' : '') + '</span><span>' + rpRingkas(hari.reduce(function (a, x) { return a + x.nilai; }, 0)) + '</span></div><div class="daftar">';
        tglKini = t.tgl; buka = true;
      }
      h += htmlItemTrx(t, i);
    });
    if (buka) h += '</div>';
    if (semua.length > RW_TAMPIL.length) h += '<button class="tombol garis penuh" data-a="rwLagi">Tampilkan ' + Math.min(40, semua.length - RW_TAMPIL.length) + ' berikutnya</button>';
    return h;
  }
  function segarkanDaftarRiwayat() {
    var el = document.getElementById('rw-daftar'); if (!el) return;
    var semua = daftarRiwayat(); RW_TAMPIL = semua.slice(0, S.rw.batas); el.innerHTML = htmlDaftarRiwayat(semua);
  }

  function bolehUbah(t) {
    if (t.tunda) return false;
    if (admin()) return true;
    return S.sptBolehUbah && sm(t.spt, S.user.nama) && t.tgl >= geser(S.hariIni, -S.batasMundur);
  }

  var RINCI = null;
  function bukaRinci(t) {
    RINCI = t;
    function b(l, v) { return v === '' || v === null || v === undefined ? '' : '<div><dt>' + l + '</dt><dd>' + v + '</dd></div>'; }
    var item = t.items && t.items.length ? t.items.map(function (i) { return esc(i.q + ' × ' + i.s + (i.t ? ' ' + i.t : '') + (i.u ? ' ' + i.u : '')) + '<br><span class="ket">' + rp(i.h) + ' per unit' + (i.sku ? ', SKU ' + esc(i.sku) : '') + '</span>'; }).join('<br>') : esc(t.produk);
    var h = kepalaLembar('Rincian transaksi') + '<div class="li"><div><div class="ket">' + esc(tglPanjang(t.tgl)) + '</div><div style="font-size:28px;font-weight:800;letter-spacing:-.02em">' + rp(t.nilai) + '</div></div><dl class="rinci">' +
      b('Customer', esc(t.cust)) + b('Produk', item) + b('Qty', t.qty + ' unit') + b('Brand', '<span class="titik-seri" style="background:' + warnaBrand(t.brand) + '"></span> ' + esc(t.brand || 'Tanpa brand')) + b('Kategori', esc(t.kat)) +
      b('DEC', esc(t.dec)) + b('SPT', esc(t.spt)) + b('No. invoice', esc(t.inv || 'Belum diisi')) + b('Realisasi', t.real === null || t.real === undefined ? 'Belum diisi' : rp(t.real)) + b(t.app ? 'Catatan' : 'Keterangan', esc(t.app ? t.cat : (t.cat || t.ket))) + '</dl>';
    if (t.tunda) h += '<div class="pita tunda">' + (t.galat ? 'Ditolak server: ' + esc(t.galat) : 'Tersimpan di HP ini dan akan terkirim otomatis saat ada sinyal.') + '</div>';
    else if (t.luar) h += '<div class="pita tunda">Baris ini diketik di luar blok bulan pada sheet Invoice, jadi belum masuk subtotal sheet.</div>';
    else if (!t.app) h += '<p class="ket">Data yang diketik langsung di spreadsheet. Perubahan dari sini hanya mengubah sheet Invoice; Daily Report tidak ikut diubah.</p>';
    h += '</div>';
    if (bolehUbah(t)) h += '<div class="lb"><div class="dua"><button class="tombol bahaya" data-a="tanyaHapus">Hapus</button><button class="tombol" data-a="ubahTrx">Ubah</button></div></div>';
    else if (t.tunda) h += '<div class="lb"><button class="tombol bahaya penuh" data-a="batalAntre">Batalkan data ini</button></div>';
    else if (!admin()) h += '<div class="lb"><p class="ket" style="text-align:center">Ada yang keliru? Minta supervisor mengubahnya.</p></div>';
    bukaLembar(h);
  }

  function tanyaHapus() {
    var t = RINCI;
    bukaLembar(kepalaLembar('Hapus transaksi?', 'Batal') + '<div class="li"><div class="tegas"><b>' + esc(t.cust) + ', ' + rp(t.nilai) + '</b><p>' + esc(tglPanjang(t.tgl)) + '. Baris ini akan dihapus dari sheet Invoice' + (t.app ? ' dan angka order di Daily Report dikurangi' : '') + '. Tindakan ini tidak bisa dibatalkan.</p></div></div>' +
      '<div class="lb"><div class="dua"><button class="tombol garis" data-a="tutup">Batal</button><button class="tombol bahaya" data-a="hapusTrx" id="btn-hapus">Ya, hapus</button></div></div>', { kunci: true });
  }

  /* ==========================================================================
   * 7. FORMULIR TRANSAKSI
   * ======================================================================== */
  function tokoHariIni(spt) {
    var k = S.data.kunj.filter(function (x) { return x.tgl === S.hariIni && sm(x.spt, spt) && x.toko; });
    return k.length ? k[k.length - 1].toko : '';
  }
  function kunciProduk(g) { return g.b + '|' + g.s + '|' + g.t; }
  function totalItem() { return F.items.reduce(function (a, i) { return a + i.q * i.h; }, 0); }

  function bukaFormTrx(t) {
    if (!S.master) { toast('Data produk belum termuat. Tunggu sebentar lalu coba lagi.', 'gagal'); return; }
    if (t) {
      F = { ref: { id: t.id, row: t.row, fp: t.fp }, tgl: t.tgl, spt: t.spt, dec: t.dec, cust: t.cust, inv: t.inv || '', cat: t.cat || '',
        items: t.items ? JSON.parse(JSON.stringify(t.items)) : [], bebas: !(t.items && t.items.length), produk: t.produk, qty: t.qty, brand: t.brand || '', kat: t.kat || '',
        nilai: t.nilai, nilaiManual: true, real: t.real, cari: '', pilih: null, galat: {}, sibuk: false };
    } else {
      var spt = admin() ? (S.pref.spt || '') : S.user.nama;
      F = { ref: null, id: idBaru(), tgl: S.hariIni, spt: spt, dec: tokoHariIni(spt) || S.pref.dec || '', cust: '', inv: '', cat: '', items: [], bebas: false,
        nilai: 0, nilaiManual: false, real: null, cari: '', pilih: null, galat: {}, sibuk: false };
    }
    bukaLembar('<div id="form-trx" style="display:contents"></div>', { penuh: true, kunci: true });
    gambarFormTrx();
  }

  function seringDipakai() {
    var hit = {}, urut = [];
    S.pref.sering.forEach(function (k, i) { hit[k] = 1000 - i; });
    S.data.trx.forEach(function (t) { (t.items || []).forEach(function (i) { var k = i.b + '|' + i.s + '|' + i.t; hit[k] = (hit[k] || 0) + i.q; }); });
    S.master.produk.forEach(function (g) { if (hit[kunciProduk(g)]) urut.push(g); });
    urut.sort(function (a, b) { return hit[kunciProduk(b)] - hit[kunciProduk(a)]; });
    if (urut.length < 4) S.master.produk.forEach(function (g) { if (urut.length < 6 && urut.indexOf(g) < 0 && /mattress only/i.test(g.t)) urut.push(g); });
    return urut.slice(0, 6);
  }

  function cariProduk(q) {
    var kata = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!kata.length) return [];
    return S.master.produk.filter(function (g) {
      var h = (g.b + ' ' + g.s + ' ' + g.t + ' ' + g.k + (/mattress only/i.test(g.t) ? ' mo' : '') + (/full set/i.test(g.t) ? ' fs fullset' : '')).toLowerCase();
      return kata.every(function (w) { return h.indexOf(w) >= 0; });
    }).slice(0, 40);
  }
  function htmlHasilCari() {
    if (F.pilih !== null) {
      var g = S.master.produk[F.pilih];
      return '<div class="ukuran"><div class="jdl"><span><span class="titik-seri" style="background:' + warnaBrand(g.b) + '"></span> ' + esc(g.s) + (g.t ? ' <span class="ket">' + esc(g.t) + '</span>' : '') + '</span><button class="tautan" data-a="batalPilih">Ganti produk</button></div>' +
        '<div class="ket">Pilih ukuran</div><div class="chip-bungkus">' + g.v.map(function (v, i) { return '<button class="chip" data-a="pilihUkuran" data-v="' + i + '"><b>' + esc(v[0] || 'Standar') + '</b><small>' + rp(v[1]) + '</small></button>'; }).join('') + '</div></div>';
    }
    if (!F.cari.trim()) {
      var s = seringDipakai();
      return s.length ? '<div class="ket">Sering dipakai</div><div class="chip-bungkus">' + s.map(function (g) {
        return '<button class="chip kecil" data-a="pilihProduk" data-p="' + S.master.produk.indexOf(g) + '"><span class="titik-seri" style="background:' + warnaBrand(g.b) + '"></span>' + esc(g.s) + (g.t ? ' <small>' + esc(g.t === 'Mattress Only' ? 'MO' : g.t) + '</small>' : '') + '</button>';
      }).join('') + '</div>' : '';
    }
    var hasil = cariProduk(F.cari);
    if (!hasil.length) return '<div class="hasil-cari"><div class="nihil">Tidak ada produk bernama "' + esc(F.cari) + '" di Master Pricing.</div></div>';
    return '<div class="hasil-cari">' + hasil.map(function (g) {
      var hrg = g.v.map(function (v) { return v[1]; });
      return '<button data-a="pilihProduk" data-p="' + S.master.produk.indexOf(g) + '"><b>' + esc(g.s) + (g.t ? ' ' + esc(g.t) : '') + '</b><span><span class="titik-seri" style="background:' + warnaBrand(g.b) + '"></span>' + esc(g.b) + ', mulai ' + rpRingkas(Math.min.apply(null, hrg)) + '</span></button>';
    }).join('') + '</div>';
  }

  function htmlKeranjang() {
    if (!F.items.length) return '';
    return '<div class="keranjang">' + F.items.map(function (i, n) {
      return '<div class="brg"><div><b>' + esc(i.s) + (i.t ? ' ' + esc(i.t) : '') + '</b><div class="dt"><span class="titik-seri" style="background:' + warnaBrand(i.b) + '"></span>' + esc(i.u || 'Standar') + '<span>' + rp(i.h) + '</span></div></div>' +
        '<div class="langkah"><button data-a="qty" data-n="' + n + '" data-d="-1" aria-label="Kurangi">−</button><output>' + i.q + '</output><button data-a="qty" data-n="' + n + '" data-d="1" aria-label="Tambah">+</button></div>' +
        '<button class="hapus" data-a="buangItem" data-n="' + n + '">Hapus</button></div>';
    }).join('') + '</div>';
  }

  function gambarFormTrx() {
    var el = document.getElementById('form-trx'); if (!el || !F) return;
    var m = S.master, g = F.galat, li = el.querySelector('.li'), gulir = li ? li.scrollTop : 0;
    function salah(k) { return g[k] ? ' salah' : ''; }
    function pesan(k) { return g[k] ? '<div class="galat">' + esc(g[k]) + '</div>' : ''; }
    var kemarin = geser(S.hariIni, -1);
    var h = kepalaLembar(F.ref ? 'Ubah transaksi' : 'Transaksi baru', 'Batal') + '<div class="li">';

    h += '<div class="medan' + salah('tgl') + '"><div class="lbl">Tanggal</div><div class="chip-bungkus">' +
      '<button class="chip' + (F.tgl === S.hariIni ? ' aktif' : '') + '" data-a="trxTgl" data-v="' + S.hariIni + '">Hari ini</button>' +
      '<button class="chip' + (F.tgl === kemarin ? ' aktif' : '') + '" data-a="trxTgl" data-v="' + kemarin + '">Kemarin</button>' +
      '<input class="masukan" type="date" style="width:auto;flex:1;min-width:150px;height:40px;font-size:14px" data-i="trxTglPilih" value="' + esc(F.tgl) + '" max="' + S.hariIni + '" aria-label="Pilih tanggal lain"></div>' + pesan('tgl') + '</div>';

    if (admin()) {
      h += '<div class="medan' + salah('spt') + '"><label for="f-spt">Nama SPT</label><select class="masukan" id="f-spt" data-i="trxSpt"><option value="">Pilih SPT</option>' +
        unik(m.spt.concat(F.spt ? [F.spt] : [])).map(function (s) { return '<option' + (sm(s, F.spt) ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' + pesan('spt') + '</div>';
    }

    h += '<div class="medan' + salah('dec') + '"><div class="lbl">DEC / toko</div><div class="chip-bungkus">' + unik(m.toko.concat(F.dec ? [F.dec] : [])).map(function (t) {
      return '<button class="chip kecil' + (sm(t, F.dec) ? ' aktif' : '') + '" data-a="trxDec" data-v="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('') + '</div>' + pesan('dec') + '</div>';

    h += '<div class="medan' + salah('cust') + '"><label for="f-cust">Nama customer</label><input class="masukan" id="f-cust" data-i="trxTeks" data-f="cust" value="' + esc(F.cust) + '" autocomplete="off" autocapitalize="words" placeholder="Nama sesuai nota" maxlength="80">' + pesan('cust') + '</div>';

    if (F.bebas) {
      h += '<div class="medan' + salah('produk') + '"><label for="f-produk">Produk / detail</label><input class="masukan" id="f-produk" data-i="trxTeks" data-f="produk" value="' + esc(F.produk) + '" maxlength="200">' + pesan('produk') + '</div>' +
        '<div class="dua"><div class="medan"><label for="f-brand">Brand</label><select class="masukan" id="f-brand" data-i="trxTeks" data-f="brand"><option value="">Tanpa brand</option>' + m.brand.map(function (b) { return '<option' + (sm(b, F.brand) ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
        '<div class="medan"><label for="f-kat">Kategori</label><select class="masukan" id="f-kat" data-i="trxTeks" data-f="kat"><option value="">Lainnya</option>' + unik(m.kategori.concat(F.kat ? [F.kat] : [])).map(function (k) { return '<option' + (sm(k, F.kat) ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="medan' + salah('qty') + '"><div class="lbl">Qty</div><div class="langkah"><button data-a="qtyBebas" data-d="-1" aria-label="Kurangi">−</button><output>' + F.qty + '</output><button data-a="qtyBebas" data-d="1" aria-label="Tambah">+</button></div>' + pesan('qty') +
        '<button class="tautan" data-a="pakaiKatalog" style="justify-self:start;padding:6px 0">Pilih ulang produk dari Master Pricing</button></div>';
    } else {
      h += '<div class="medan' + salah('items') + '"><label for="f-cari">Produk<small>' + (F.items.length ? F.items.length + ' jenis dipilih' : 'dari Master Pricing') + '</small></label>' + htmlKeranjang() +
        (F.pilih === null ? '<div class="cari">' + IK.cari + '<input class="masukan" id="f-cari" type="search" data-i="trxCari" value="' + esc(F.cari) + '" autocomplete="off" placeholder="' + (F.items.length ? 'Tambah produk lain' : 'Ketik nama, mis. savoia') + '"></div>' : '') +
        '<div id="hasil">' + htmlHasilCari() + '</div>' + pesan('items') + '</div>';
    }

    var hitung = F.bebas ? null : totalItem();
    h += '<div class="medan' + salah('nilai') + '"><label for="f-nilai">Nilai order<small>' + (hitung !== null && F.nilaiManual && hitung !== F.nilai && hitung ? 'harga master ' + rp(hitung) : 'sesuai nota') + '</small></label>' +
      '<div class="awalan"><span>Rp</span><input class="masukan" id="f-nilai" inputmode="numeric" autocomplete="off" data-i="trxNilai" value="' + (F.nilai ? titik(F.nilai) : '') + '" placeholder="0"></div>' + pesan('nilai') +
      (hitung !== null && F.nilaiManual && hitung && hitung !== F.nilai ? '<button class="tautan" data-a="nilaiMaster" style="justify-self:start;padding:4px 0">Pakai harga master ' + rp(hitung) + '</button>' : '') + '</div>';

    h += '<div class="medan"><label for="f-inv">No. invoice<small>boleh menyusul</small></label><input class="masukan" id="f-inv" data-i="trxTeks" data-f="inv" value="' + esc(F.inv) + '" autocomplete="off" autocapitalize="characters" maxlength="60" placeholder="Kosongkan bila belum ada"></div>';
    if (admin() && F.ref) {
      h += '<div class="medan' + salah('real') + '"><label for="f-real">Realisasi<small>diisi supervisor</small></label><div class="awalan"><span>Rp</span><input class="masukan" id="f-real" inputmode="numeric" autocomplete="off" data-i="trxReal" value="' + (F.real === null || F.real === undefined ? '' : titik(F.real)) + '" placeholder="Belum ada"></div>' + pesan('real') + '</div>';
    }
    h += '<div class="medan"><label for="f-cat">Catatan<small>opsional</small></label><input class="masukan" id="f-cat" data-i="trxTeks" data-f="cat" value="' + esc(F.cat) + '" maxlength="200" placeholder="Mis. free bantal, kirim Sabtu"></div>';
    h += '</div>';

    var qty = F.bebas ? F.qty : F.items.reduce(function (a, i) { return a + i.q; }, 0);
    h += '<div class="lb"><div class="ringkas"><span>' + qty + ' unit</span><b id="f-total">' + rp(F.nilai) + '</b></div>' +
      '<button class="tombol utama-btn penuh" data-a="simpanTrx"' + (F.sibuk ? ' disabled' : '') + '>' + (F.sibuk ? '<span class="putar kecil putih"></span> Menyimpan…' : F.ref ? 'Simpan perubahan' : 'Simpan transaksi') + '</button></div>';
    el.innerHTML = h;
    var liBaru = el.querySelector('.li'); if (liBaru) liBaru.scrollTop = gulir;
  }

  function periksaTrx() {
    var g = {};
    if (!F.tgl) g.tgl = 'Pilih tanggal.';
    else if (F.tgl > S.hariIni) g.tgl = 'Tanggal tidak boleh di masa depan.';
    else if (!admin() && F.tgl < geser(S.hariIni, -S.batasMundur)) g.tgl = 'Paling lama ' + S.batasMundur + ' hari ke belakang. Lebih lama dari itu minta supervisor.';
    if (!F.spt) g.spt = 'Pilih SPT.';
    if (!F.dec) g.dec = 'Pilih DEC tempat transaksi.';
    if (!F.cust.trim()) g.cust = 'Isi nama customer.';
    if (F.bebas) { if (!String(F.produk || '').trim()) g.produk = 'Isi produk.'; if (!(F.qty >= 1)) g.qty = 'Qty minimal 1.'; }
    else if (!F.items.length) g.items = 'Pilih minimal satu produk.';
    if (!(F.nilai > 0)) g.nilai = 'Nilai order harus lebih dari 0.';
    F.galat = g;
    return !Object.keys(g).length;
  }

  function simpanTrx() {
    if (!F || F.sibuk) return;
    if (!periksaTrx()) {
      gambarFormTrx(); toast('Masih ada yang perlu dilengkapi.', 'gagal');
      var s = document.querySelector('#form-trx .salah'); if (s) s.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    var trx = { tgl: F.tgl, spt: F.spt, dec: F.dec, cust: F.cust.trim(), inv: F.inv.trim(), cat: F.cat.trim(), nilai: F.nilai, real: F.real };
    if (F.bebas) { trx.produk = F.produk.trim(); trx.qty = F.qty; trx.brand = F.brand; trx.kat = F.kat; } else trx.items = F.items;
    if (!F.ref) trx.id = F.id;
    var isi = F.ref ? { trx: trx, ref: F.ref } : { trx: trx }, baru = !F.ref;
    F.sibuk = true; gambarFormTrx();

    S.pref.dec = F.dec; if (admin()) S.pref.spt = F.spt;
    if (!F.bebas) S.pref.sering = unik(F.items.map(function (i) { return i.b + '|' + i.s + '|' + i.t; }).concat(S.pref.sering)).slice(0, 8);
    simpan(LS.pref, S.pref);

    api('trxSimpan', isi).then(function (res) {
      terima(res); tutupLembar(); gambar();
      toast(baru ? 'Transaksi tersimpan ke spreadsheet.' : 'Perubahan tersimpan.');
    }).catch(function (e) {
      if (e.kode === 'SESI') { tanganiGalat(e); return; }
      if (baru && (galatJaringan(e) || e.kode === 'SIBUK')) {            // tanpa sinyal: simpan di HP, kirim nanti
        S.antre.push({ aksi: 'trxSimpan', isi: isi, waktu: Date.now() }); simpanAntre();
        tutupLembar(); gambar();
        toast('Tidak ada sinyal. Tersimpan di HP dan dikirim otomatis nanti.');
        return;
      }
      if (F) { F.sibuk = false; gambarFormTrx(); }
      tanganiGalat(e);
    });
  }

  /* ==========================================================================
   * 8. LAPORAN HARIAN
   * ======================================================================== */
  function jamKeInput(s) { var m = String(s || '').match(/^(\d{1,2})[.:](\d{2})$/); return m ? pad2(Number(m[1])) + ':' + m[2] : ''; }
  function libur(k) { return /off|cuti/i.test((k.akt || '') + ' ' + (k.jd || '')); }

  function htmlHarian() {
    if (!S.pernahMuat) return '<div class="kartu kosong"><div class="putar" style="margin:0 auto 12px"></div>Mengambil data…</div>';
    var saya = S.user.nama, h = '';
    var hariIni = S.data.kunj.filter(function (k) { return k.tgl === S.hariIni && (admin() || sm(k.spt, saya)); });
    if (admin()) {
      var sudah = unik(hariIni.map(function (k) { return k.spt; })), belum = (S.master ? S.master.spt : []).filter(function (s) { return !sudah.some(function (x) { return sm(x, s); }); });
      h += '<section class="kartu"><div class="judul-baris"><h2>Hari ini</h2><span class="ket">' + sudah.length + ' dari ' + (S.master ? S.master.spt.length : 0) + ' SPT sudah lapor</span></div>' +
        (belum.length ? '<p class="ket" style="margin-bottom:12px">Belum lapor: ' + esc(belum.join(', ')) + '</p>' : '<p class="ket naik" style="margin-bottom:12px">Semua SPT sudah lapor.</p>') +
        '<button class="tombol penuh" data-a="harianBaru">Isi laporan untuk SPT</button></section>';
    } else {
      var ada = hariIni[hariIni.length - 1];
      h += '<section class="kartu"><div class="judul-baris"><h2>Hari ini</h2><span class="ket">' + esc(tglPendek(S.hariIni)) + '</span></div>' +
        (ada ? '<p style="font-weight:700;margin-bottom:4px">' + (libur(ada) ? 'Off / Cuti' : esc(ada.toko || 'Toko belum diisi') + ', ' + esc(ada.akt || 'aktivitas belum diisi')) + '</p><p class="ket" style="margin-bottom:12px">' + (libur(ada) ? 'Tercatat libur.' : 'Datang ' + esc(ada.jd || '–') + ', pulang ' + esc(ada.jp || 'belum diisi') + ', pengunjung ' + (ada.peng === null ? 'belum diisi' : ada.peng) + '.') + '</p><div class="dua"><button class="tombol" data-a="harianUbah" data-row="' + ada.row + '">Lengkapi</button><button class="tombol garis" data-a="harianBaru">Toko lain</button></div>'
          : '<p class="ket" style="margin-bottom:12px">Belum ada laporan hari ini. Isi saat tiba di toko, lengkapi lagi sebelum pulang.</p><button class="tombol utama-btn penuh" data-a="harianBaru">Isi laporan hari ini</button>') + '</section>';
    }
    var awal = geser(S.hariIni, -13);
    var daftar = S.data.kunj.filter(function (k) { return k.tgl >= awal && (admin() || sm(k.spt, saya)); }).sort(function (a, b) { return a.tgl < b.tgl ? 1 : a.tgl > b.tgl ? -1 : b.row - a.row; });
    h += '<div class="tgl-grup"><span>14 hari terakhir</span><span>' + daftar.length + ' laporan</span></div>';
    if (!daftar.length) return h + '<div class="kartu kosong">' + IK.harian + '<b>Belum ada laporan</b>Laporan harian yang diisi akan muncul di sini.</div>';
    h += '<div class="daftar">' + daftar.map(function (k) {
      return '<button class="item" data-a="harianUbah" data-row="' + k.row + '"><span class="n1">' + (libur(k) ? 'Off / Cuti' : esc(k.toko || 'Tanpa toko')) + (admin() ? ' <span style="font-weight:600;color:var(--tinta-3)">' + esc(k.spt) + '</span>' : '') + '</span><span class="rp">' + (k.nilai ? rpRingkas(k.nilai) : '') + '</span>' +
        '<span class="n2">' + esc(tglLabel(k.tgl)) + (libur(k) ? '' : ', ' + esc(k.jd || '–') + ' – ' + esc(k.jp || '–')) + '</span><span class="qt">' + (k.qty ? k.qty + ' unit' : '') + '</span>' +
        '<span class="n3">' + (k.akt && !libur(k) ? '<span class="lencana">' + esc(k.akt) + '</span>' : '') + (k.peng !== null && !libur(k) ? '<span>' + k.peng + ' pengunjung</span>' : '') + (k.pros ? '<span>' + k.pros + ' prospek</span>' : '') + '</span></button>';
    }).join('') + '</div>';
    return h;
  }

  function bukaFormHarian(k) {
    if (!S.master) return;
    if (k) H = { ref: { row: k.row, fp: k.fp }, tgl: k.tgl, spt: k.spt, toko: k.toko, akt: k.akt, jd: jamKeInput(k.jd), jp: jamKeInput(k.jp), peng: k.peng, pros: k.pros, tl: k.tl || '', adaOrder: k.qty > 0, galat: {}, sibuk: false };
    else {
      var spt = admin() ? '' : S.user.nama, d = new Date();
      H = { ref: null, tgl: S.hariIni, spt: spt, toko: S.pref.dec || '', akt: '', jd: pad2(d.getHours()) + ':' + pad2(Math.floor(d.getMinutes() / 5) * 5), jp: '', peng: null, pros: null, tl: '', galat: {}, sibuk: false };
    }
    bukaLembar('<div id="form-harian" style="display:contents"></div>', { penuh: true, kunci: true });
    gambarFormHarian();
  }

  function gambarFormHarian() {
    var el = document.getElementById('form-harian'); if (!el || !H) return;
    var m = S.master, g = H.galat, li = el.querySelector('.li'), gulir = li ? li.scrollTop : 0, off = /off|cuti/i.test(H.akt);
    function salah(k) { return g[k] ? ' salah' : ''; }
    function pesan(k) { return g[k] ? '<div class="galat">' + esc(g[k]) + '</div>' : ''; }
    function langkah(f, v) { return '<div class="langkah" style="grid-template-columns:44px 64px 44px"><button data-a="hLangkah" data-f="' + f + '" data-d="-1" aria-label="Kurangi">−</button><input inputmode="numeric" data-i="hAngka" data-f="' + f + '" value="' + (v === null || v === undefined ? '' : v) + '" placeholder="–" aria-label="Jumlah"><button data-a="hLangkah" data-f="' + f + '" data-d="1" aria-label="Tambah">+</button></div>'; }
    var kemarin = geser(S.hariIni, -1);
    var h = kepalaLembar(H.ref ? 'Lengkapi laporan' : 'Laporan harian', 'Batal') + '<div class="li">';
    if (H.ref) h += '<div><div class="ket">' + esc(tglPanjang(H.tgl)) + '</div><div style="font-size:18px;font-weight:800">' + esc(H.spt) + '</div></div>';
    else {
      h += '<div class="medan' + salah('tgl') + '"><div class="lbl">Tanggal</div><div class="chip-bungkus"><button class="chip' + (H.tgl === S.hariIni ? ' aktif' : '') + '" data-a="hTgl" data-v="' + S.hariIni + '">Hari ini</button><button class="chip' + (H.tgl === kemarin ? ' aktif' : '') + '" data-a="hTgl" data-v="' + kemarin + '">Kemarin</button>' +
        '<input class="masukan" type="date" style="width:auto;flex:1;min-width:150px;height:40px;font-size:14px" data-i="hTglPilih" value="' + esc(H.tgl) + '" max="' + S.hariIni + '" aria-label="Pilih tanggal lain"></div>' + pesan('tgl') + '</div>';
      if (admin()) h += '<div class="medan' + salah('spt') + '"><label for="h-spt">Nama SPT</label><select class="masukan" id="h-spt" data-i="hTeks" data-f="spt"><option value="">Pilih SPT</option>' + m.spt.map(function (s) { return '<option' + (sm(s, H.spt) ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' + pesan('spt') + '</div>';
    }
    h += '<div class="medan' + salah('akt') + '"><div class="lbl">Aktivitas</div><div class="chip-bungkus">' + m.aktivitas.map(function (a) { return '<button class="chip kecil' + (sm(a, H.akt) ? ' aktif' : '') + '" data-a="hAkt" data-v="' + esc(a) + '">' + esc(a) + '</button>'; }).join('') + '</div>' + pesan('akt') + '</div>';
    if (!off) {
      h += '<div class="medan' + salah('toko') + '"><div class="lbl">Toko / DEC' + (H.adaOrder ? '<small>terkunci, sudah ada order</small>' : '') + '</div><div class="chip-bungkus">' + m.toko.map(function (t) { return '<button class="chip kecil' + (sm(t, H.toko) ? ' aktif' : '') + '" data-a="hToko" data-v="' + esc(t) + '"' + (H.adaOrder && !sm(t, H.toko) ? ' disabled style="opacity:.4"' : '') + '>' + esc(t) + '</button>'; }).join('') + '</div>' + pesan('toko') + '</div>';
      h += '<div class="dua"><div class="medan"><label for="h-jd">Jam datang</label><input class="masukan" id="h-jd" type="time" data-i="hTeks" data-f="jd" value="' + esc(H.jd) + '"></div><div class="medan"><label for="h-jp">Jam pulang</label><input class="masukan" id="h-jp" type="time" data-i="hTeks" data-f="jp" value="' + esc(H.jp) + '"></div></div>';
      h += '<div class="dua"><div class="medan"><div class="lbl">Pengunjung</div>' + langkah('peng', H.peng) + '</div><div class="medan"><div class="lbl">Prospek baru</div>' + langkah('pros', H.pros) + '</div></div>' +
        '<p class="ket" style="margin-top:-8px">Pengunjung: perkiraan orang yang melihat area matras. Prospek: yang berhasil diambil nama dan nomornya.</p>';
    } else h += '<p class="ket">Toko, jam, dan pengunjung dikosongkan untuk hari libur.</p>';
    h += '<div class="medan"><label for="h-tl">Tindak lanjut<small>opsional</small></label><input class="masukan" id="h-tl" data-i="hTeks" data-f="tl" value="' + esc(H.tl) + '" maxlength="200" placeholder="Mis. ajukan restock ke buyer, Senin"></div></div>';
    h += '<div class="lb">' + (H.ref && admin() && !H.adaOrder ? '<div class="dua"><button class="tombol bahaya" data-a="hapusHarian">Hapus</button>' : '') +
      '<button class="tombol utama-btn' + (H.ref && admin() && !H.adaOrder ? '' : ' penuh') + '" data-a="simpanHarian"' + (H.sibuk ? ' disabled' : '') + '>' + (H.sibuk ? '<span class="putar kecil putih"></span> Menyimpan…' : 'Simpan laporan') + '</button>' + (H.ref && admin() && !H.adaOrder ? '</div>' : '') + '</div>';
    el.innerHTML = h;
    var liBaru = el.querySelector('.li'); if (liBaru) liBaru.scrollTop = gulir;
  }

  function simpanHarian() {
    if (!H || H.sibuk) return;
    var g = {}, off = /off|cuti/i.test(H.akt);
    if (!H.spt) g.spt = 'Pilih SPT.';
    if (!H.akt) g.akt = 'Pilih aktivitas.';
    if (!off && !H.toko) g.toko = 'Pilih toko.';
    if (H.tgl > S.hariIni) g.tgl = 'Tanggal tidak boleh di masa depan.';
    else if (!admin() && H.tgl < geser(S.hariIni, -S.batasMundur)) g.tgl = 'Paling lama ' + S.batasMundur + ' hari ke belakang.';
    H.galat = g;
    if (Object.keys(g).length) { gambarFormHarian(); toast('Masih ada yang perlu dilengkapi.', 'gagal'); return; }
    var isi = { kunj: { tgl: H.tgl, spt: H.spt, toko: H.toko, akt: H.akt, jd: H.jd, jp: H.jp, peng: H.peng, pros: H.pros, tl: H.tl.trim() } };
    if (H.ref) isi.ref = H.ref;
    var baru = !H.ref;
    H.sibuk = true; gambarFormHarian();
    if (!off && H.toko) { S.pref.dec = H.toko; simpan(LS.pref, S.pref); }
    api('harianSimpan', isi).then(function (res) { terima(res); tutupLembar(); gambar(); toast('Laporan harian tersimpan.'); })
      .catch(function (e) {
        if (e.kode === 'SESI') { tanganiGalat(e); return; }
        if (baru && (galatJaringan(e) || e.kode === 'SIBUK')) {
          S.antre.push({ aksi: 'harianSimpan', isi: isi, waktu: Date.now() }); simpanAntre(); tutupLembar(); gambar();
          toast('Tidak ada sinyal. Laporan tersimpan di HP dan dikirim otomatis nanti.'); return;
        }
        if (H) { H.sibuk = false; gambarFormHarian(); }
        tanganiGalat(e);
      });
  }

  /* ==========================================================================
   * 9. AKUN
   * ======================================================================== */
  function htmlAkun() {
    var u = S.user, h = '<section class="kartu profil"><div class="avatar">' + esc(u.nama.charAt(0).toUpperCase()) + '</div><div><b>' + esc(u.nama) + '</b><span class="ket">' + (admin() ? 'Supervisor, melihat dan mengubah semua data' : 'SPT, mencatat dan melihat data sendiri') + '</span></div></section>';
    if (S.antre.length) {
      h += '<div class="tgl-grup"><span>Belum terkirim</span><span>' + S.antre.length + ' data</span></div><div class="menu">' + S.antre.map(function (x, i) {
        var t = x.aksi === 'trxSimpan' ? x.isi.trx : x.isi.kunj;
        return '<div class="baris"><div>' + (x.aksi === 'trxSimpan' ? esc(t.cust) + ', ' + rp(t.nilai) : 'Laporan ' + esc(t.spt) + ' ' + esc(tglPendek(t.tgl))) + '<small>' + (x.galat ? 'Ditolak: ' + esc(x.galat) : 'Menunggu sinyal') + '</small></div>' +
          '<button class="kanan merah" data-a="buangAntre" data-n="' + i + '">Hapus</button></div>';
      }).join('') + '<button data-a="kirimAntre"><span>Kirim sekarang</span><span class="kanan">' + (S.mengirim ? 'mengirim…' : '') + '</span></button></div>';
    }
    h += '<div class="menu"><button data-a="gantiPin"><span>Ganti PIN saya</span><span class="kanan">Ubah</span></button>';
    if (S.pasang) h += '<button data-a="pasang"><span>Pasang di layar utama<small>Buka seperti aplikasi biasa</small></span><span class="kanan">Pasang</span></button>';
    h += '<button data-a="segarPenuh"><span>Muat ulang produk dan pilihan<small>Setelah Master Pricing atau Daftar Pilihan diubah</small></span><span class="kanan">Muat</span></button></div>';
    if (admin() && S.info) {
      h += '<div class="tgl-grup"><span>PIN tim SPT</span><span>' + S.info.spt.filter(function (s) { return S.info.siap[s]; }).length + ' dari ' + S.info.spt.length + ' aktif</span></div><div class="menu">' +
        S.info.spt.map(function (s) { return '<button data-a="aturPin" data-nama="' + esc(s) + '"><span>' + esc(s) + '<small>' + (S.info.siap[s] ? 'PIN aktif' : 'Belum bisa masuk') + '</small></span><span class="kanan">' + (S.info.siap[s] ? 'Ganti' : 'Buat PIN') + '</span></button>'; }).join('') +
        (S.demo ? '' : '<button data-a="bagikan"><span>Bagikan aplikasi ke tim<small>Salin tautan yang langsung terhubung</small></span><span class="kanan">Salin</span></button>') + '</div>' +
        '<p class="ket" style="padding:0 4px">SPT baru: tambahkan namanya di sheet Daftar Pilihan, muat ulang, lalu buatkan PIN di sini.</p>';
    }
    h += '<div class="menu"><button data-a="tanyaKeluar"><span class="merah">Keluar</span></button></div><p class="ket" style="text-align:center">DAP Sales Tracker versi ' + VERSI + '</p>';
    return h;
  }

  function lembarPin(judul, ket, medan, aksi, nama) {
    bukaLembar(kepalaLembar(judul, 'Batal') + '<div class="li"><p class="ket">' + ket + '</p>' + medan.map(function (m) {
      return '<div class="medan"><label for="' + m[0] + '">' + m[1] + '</label><input class="masukan" id="' + m[0] + '" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8" placeholder="' + m[2] + '"></div>';
    }).join('') + '<div class="galat" id="pin-galat"></div></div><div class="lb"><button class="tombol utama-btn penuh" data-a="' + aksi + '"' + (nama ? ' data-nama="' + esc(nama) + '"' : '') + '>Simpan PIN</button></div>', { kunci: true });
    setTimeout(function () { var e = document.getElementById(medan[0][0]); if (e) e.focus(); }, 80);
  }

  /* ==========================================================================
   * PENANGAN KLIK ( data-a="..." ) DAN KETIKAN ( data-i="..." )
   * ======================================================================== */
  var A = {
    hubung: function () {
      var url = (document.getElementById('url').value || '').trim();
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) { layarHubung('URL harus berbentuk https://script.google.com/macros/s/…/exec'); return; }
      S.api = url; S.info = null; app.innerHTML = '<div class="muat-awal"><div class="putar"></div><p>Menghubungi server…</p></div>';
      ambilInfo().then(function () { simpan(LS.api, url); layarMasuk(); }).catch(function (e) { S.api = ''; layarHubung(galatJaringan(e) ? 'Server tidak menjawab. Periksa sinyal dan URL-nya.' : e.message); });
    },
    pilihNama: function (el) { M.nama = el.dataset.nama; M.pin = ''; M.pesan = ''; layarMasuk(); },
    gantiNama: function () { M.nama = ''; M.pin = ''; M.pesan = ''; layarMasuk(); },
    tuts: function (el) {
      if (M.sibuk) return;
      if (el.dataset.n === 'x') M.pin = M.pin.slice(0, -1); else if (M.pin.length < 8) M.pin += el.dataset.n;
      M.pesan = ''; layarMasuk();
    },
    masuk: function () {
      if (M.sibuk || M.pin.length < 4) return;
      M.sibuk = true; layarMasuk();
      api('masuk', { nama: M.nama, pin: M.pin }).then(function (res) {
        S.token = res.token; S.user = res.pengguna; simpan(LS.token, S.token); simpan(LS.user, S.user);
        M = null; S.tab = 'beranda'; gambar(true); muat(false);
      }).catch(function (e) {
        M.sibuk = false; M.pin = ''; M.pesan = galatJaringan(e) ? 'Tidak ada sambungan. Coba lagi.' : e.message; layarMasuk();
      });
    },
    tab: function (el) { S.tab = el.dataset.tab; window.scrollTo(0, 0); gambar(true); },
    segar: function () { if (S.antre.length) kirimAntre(); muat(false); },
    segarPenuh: function () { muat(true).then(function () { toast('Produk dan pilihan sudah diperbarui.'); }); },
    kirimAntre: function () { S.antre.forEach(function (x) { delete x.galat; }); simpanAntre(); gambar(); kirimAntre(); },
    buangAntre: function (el) { S.antre.splice(Number(el.dataset.n), 1); simpanAntre(); gambar(); },
    batalAntre: function () { S.antre = S.antre.filter(function (x) { return !(x.aksi === 'trxSimpan' && x.isi.trx.id === RINCI.id); }); simpanAntre(); tutupLembar(); gambar(); toast('Data dibatalkan.'); },
    periode: function (el) {
      S.filter.periode = el.dataset.p;
      if (el.dataset.p === 'kustom' && !S.filter.dari) { S.filter.dari = geser(S.hariIni, -29); S.filter.sampai = S.hariIni; }
      gambar();
    },
    tren: function (el) { S.tren = el.dataset.t; gambar(); },
    tutup: function () { tutupLembar(); },
    tutupTirai: function (el, ev) { if (ev.target === el) tutupLembar(); },
    tambah: function () { bukaFormTrx(null); },

    /* riwayat */
    rwBrand: function (el) { S.rw.brand = el.dataset.v; S.rw.batas = 40; gambar(); },
    rwKat: function (el) { S.rw.kat = el.dataset.v; S.rw.batas = 40; gambar(); },
    rwReset: function () { S.rw = { q: '', brand: '', kat: '', dari: '', sampai: '', batas: 40 }; gambar(); },
    rwLagi: function () { S.rw.batas += 40; segarkanDaftarRiwayat(); },
    rinci: function (el) { var t = RW_TAMPIL[Number(el.dataset.n)]; if (t) bukaRinci(t); },
    ubahTrx: function () { var t = RINCI; tutupLembar(); bukaFormTrx(t); },
    tanyaHapus: function () { tanyaHapus(); },
    hapusTrx: function (el) {
      var t = RINCI; el.disabled = true; el.innerHTML = '<span class="putar kecil"></span> Menghapus…';
      api('trxHapus', { ref: { id: t.id, row: t.row, fp: t.fp } }).then(function (res) { terima(res); tutupLembar(); gambar(); toast('Transaksi dihapus.'); })
        .catch(function (e) { el.disabled = false; el.textContent = 'Ya, hapus'; tanganiGalat(e); });
    },

    /* formulir transaksi */
    trxTgl: function (el) { F.tgl = el.dataset.v; delete F.galat.tgl; gambarFormTrx(); },
    trxDec: function (el) { F.dec = el.dataset.v; delete F.galat.dec; gambarFormTrx(); },
    pilihProduk: function (el) { F.pilih = Number(el.dataset.p); gambarFormTrx(); },
    batalPilih: function () { F.pilih = null; gambarFormTrx(); },
    pilihUkuran: function (el) {
      var g = S.master.produk[F.pilih], v = g.v[Number(el.dataset.v)];
      var ada = F.items.filter(function (i) { return i.b === g.b && i.s === g.s && i.t === g.t && i.u === v[0]; })[0];
      if (ada) ada.q += 1; else F.items.push({ b: g.b, s: g.s, t: g.t, u: v[0], sku: v[2] || '', q: 1, h: v[1] });
      F.pilih = null; F.cari = ''; delete F.galat.items;
      if (!F.nilaiManual) { F.nilai = totalItem(); delete F.galat.nilai; }
      gambarFormTrx();
    },
    qty: function (el) {
      var i = F.items[Number(el.dataset.n)]; i.q = Math.max(1, Math.min(999, i.q + Number(el.dataset.d)));
      if (!F.nilaiManual) F.nilai = totalItem();
      gambarFormTrx();
    },
    buangItem: function (el) { F.items.splice(Number(el.dataset.n), 1); if (!F.nilaiManual) F.nilai = totalItem(); gambarFormTrx(); },
    qtyBebas: function (el) { F.qty = Math.max(1, Math.min(999, (F.qty || 1) + Number(el.dataset.d))); gambarFormTrx(); },
    pakaiKatalog: function () { F.bebas = false; F.items = []; F.nilaiManual = true; gambarFormTrx(); },
    nilaiMaster: function () { F.nilai = totalItem(); F.nilaiManual = false; gambarFormTrx(); },
    simpanTrx: function () { simpanTrx(); },

    /* laporan harian */
    harianBaru: function () { bukaFormHarian(null); },
    harianUbah: function (el) {
      var k = S.data.kunj.filter(function (x) { return x.row === Number(el.dataset.row); })[0]; if (!k) return;
      if (!admin() && k.tgl < geser(S.hariIni, -S.batasMundur)) { toast('Laporan lebih dari ' + S.batasMundur + ' hari hanya bisa diubah supervisor.', 'gagal'); return; }
      bukaFormHarian(k);
    },
    hTgl: function (el) { H.tgl = el.dataset.v; gambarFormHarian(); },
    hAkt: function (el) { H.akt = el.dataset.v; delete H.galat.akt; gambarFormHarian(); },
    hToko: function (el) { H.toko = el.dataset.v; delete H.galat.toko; gambarFormHarian(); },
    hLangkah: function (el) { var f = el.dataset.f; H[f] = Math.max(0, Math.min(9999, (H[f] || 0) + Number(el.dataset.d))); gambarFormHarian(); },
    simpanHarian: function () { simpanHarian(); },
    hapusHarian: function (el) {
      if (el.dataset.yakin !== '1') { el.dataset.yakin = '1'; el.textContent = 'Tekan lagi untuk hapus'; return; }
      el.disabled = true;
      api('harianHapus', { ref: H.ref }).then(function (res) { terima(res); tutupLembar(); gambar(); toast('Laporan dihapus.'); }).catch(function (e) { el.disabled = false; tanganiGalat(e); });
    },

    /* akun */
    gantiPin: function () { lembarPin('Ganti PIN', admin() ? 'PIN supervisor 6 sampai 8 angka.' : 'PIN 4 sampai 8 angka. Jangan dibagikan.', [['pin-lama', 'PIN sekarang', '••••'], ['pin-baru', 'PIN baru', '••••']], 'kirimGantiPin'); },
    kirimGantiPin: function (el) {
      var lama = document.getElementById('pin-lama').value, baru = document.getElementById('pin-baru').value, g = document.getElementById('pin-galat');
      if (!new RegExp(admin() ? '^\\d{6,8}$' : '^\\d{4,8}$').test(baru)) { g.textContent = admin() ? 'PIN baru harus 6 sampai 8 angka.' : 'PIN baru harus 4 sampai 8 angka.'; return; }
      el.disabled = true;
      api('pinGanti', { pinLama: lama, pinBaru: baru }).then(function (res) { S.token = res.token; simpan(LS.token, S.token); tutupLembar(); toast('PIN diganti.'); })
        .catch(function (e) { el.disabled = false; g.textContent = galatJaringan(e) ? 'Tidak ada sambungan.' : e.message; });
    },
    aturPin: function (el) { lembarPin('PIN untuk ' + el.dataset.nama, 'Buat PIN 4 sampai 8 angka, lalu beri tahu ' + esc(el.dataset.nama) + ' secara langsung. PIN lama otomatis tidak berlaku.', [['pin-spt', 'PIN baru', '••••']], 'kirimAturPin', el.dataset.nama); },
    kirimAturPin: function (el) {
      var pin = document.getElementById('pin-spt').value, g = document.getElementById('pin-galat');
      if (!/^\d{4,8}$/.test(pin)) { g.textContent = 'PIN harus 4 sampai 8 angka.'; return; }
      el.disabled = true;
      api('pinAtur', { nama: el.dataset.nama, pin: pin }).then(function (res) { S.info = res.info; tutupLembar(); gambar(); toast('PIN ' + el.dataset.nama + ' tersimpan.'); })
        .catch(function (e) { el.disabled = false; g.textContent = galatJaringan(e) ? 'Tidak ada sambungan.' : e.message; });
    },
    bagikan: function () {
      var url = location.origin + location.pathname + '#api=' + encodeURIComponent(S.api);
      var selesai = function () { toast('Tautan disalin. Kirim ke tim lewat WhatsApp.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(selesai, function () { window.prompt('Salin tautan ini:', url); });
      else window.prompt('Salin tautan ini:', url);
    },
    pasang: function () { if (S.pasang) { S.pasang.prompt(); S.pasang = null; gambar(); } },
    tanyaKeluar: function () {
      bukaLembar(kepalaLembar('Keluar dari aplikasi?', 'Batal') + '<div class="li"><div class="tegas"><p>' + (S.antre.length ? S.antre.length + ' data yang belum terkirim tetap disimpan di HP ini dan dikirim setelah Anda masuk lagi.' : 'Anda perlu memasukkan PIN lagi untuk masuk.') + '</p></div></div>' +
        '<div class="lb"><div class="dua"><button class="tombol garis" data-a="tutup">Batal</button><button class="tombol bahaya" data-a="keluar">Keluar</button></div></div>');
    },
    keluar: function () { keluar(true); }
  };

  var I = {
    filter: function (el) { S.filter[el.dataset.f] = el.value; gambar(); },
    filterTgl: function (el) { S.filter[el.dataset.f] = el.value; if (S.filter.dari && S.filter.sampai) gambar(); },
    rwCari: function (el) { S.rw.q = el.value; S.rw.batas = 40; segarkanDaftarRiwayat(); },
    rwTgl: function (el) { S.rw[el.dataset.f] = el.value; S.rw.batas = 40; segarkanDaftarRiwayat(); },
    trxTeks: function (el) { F[el.dataset.f] = el.value; if (F.galat[el.dataset.f]) { delete F.galat[el.dataset.f]; el.closest('.medan').classList.remove('salah'); } },
    trxSpt: function (el) { F.spt = el.value; delete F.galat.spt; var t = tokoHariIni(F.spt); if (t && !F.ref) F.dec = t; gambarFormTrx(); },
    trxTglPilih: function (el) { if (el.value) { F.tgl = el.value; delete F.galat.tgl; gambarFormTrx(); } },
    trxCari: function (el) { F.cari = el.value; var h = document.getElementById('hasil'); if (h) h.innerHTML = htmlHasilCari(); },
    trxNilai: function (el) {
      F.nilai = angkaSaja(el.value); F.nilaiManual = true; el.value = F.nilai ? titik(F.nilai) : '';
      var t = document.getElementById('f-total'); if (t) t.textContent = rp(F.nilai);
      if (F.galat.nilai && F.nilai > 0) { delete F.galat.nilai; el.closest('.medan').classList.remove('salah'); }
    },
    trxReal: function (el) { var d = String(el.value).replace(/[^0-9]/g, ''); F.real = d === '' ? null : Number(d); el.value = d === '' ? '' : titik(F.real); },
    hTeks: function (el) { H[el.dataset.f] = el.value; if (H.galat[el.dataset.f]) delete H.galat[el.dataset.f]; },
    hTglPilih: function (el) { if (el.value) { H.tgl = el.value; gambarFormHarian(); } },
    hAngka: function (el) { var d = String(el.value).replace(/[^0-9]/g, ''); H[el.dataset.f] = d === '' ? null : Math.min(9999, Number(d)); el.value = d === '' ? '' : H[el.dataset.f]; }
  };

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-a]'); if (!el || el.disabled) return;
    var f = A[el.dataset.a]; if (f) f(el, ev);
  });
  function ketik(ev) { var el = ev.target.closest('[data-i]'); if (!el) return; var f = I[el.dataset.i]; if (f) f(el, ev); }
  document.addEventListener('input', ketik);
  document.addEventListener('change', function (ev) { if (ev.target.tagName === 'SELECT' || ev.target.type === 'date' || ev.target.type === 'time') ketik(ev); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && akarLembar.innerHTML) tutupLembar();
    if (M && M.nama && !S.user) { if (/^\d$/.test(ev.key)) A.tuts({ dataset: { n: ev.key } }); else if (ev.key === 'Backspace') A.tuts({ dataset: { n: 'x' } }); else if (ev.key === 'Enter') A.masuk(); }
  });

  /* ---------- keterangan grafik saat disentuh ---------- */
  function tampilTip(el) {
    var bagian = el.dataset.tip.split('|'), kotak = el.getBoundingClientRect();
    elTip.innerHTML = '<b>' + esc(bagian[0]) + '</b>' + bagian.slice(1).map(esc).join('<br>');
    elTip.hidden = false;
    var x = Math.max(110, Math.min(window.innerWidth - 110, kotak.left + kotak.width / 2));
    elTip.style.left = x + 'px'; elTip.style.top = Math.max(70, kotak.top + (el.tagName === 'rect' ? 24 : 0)) + 'px';
  }
  document.addEventListener('pointerover', function (ev) { var el = ev.target.closest && ev.target.closest('[data-tip]'); if (el) tampilTip(el); else elTip.hidden = true; });
  document.addEventListener('pointerdown', function (ev) { var el = ev.target.closest && ev.target.closest('[data-tip]'); if (el) tampilTip(el); else elTip.hidden = true; });
  window.addEventListener('scroll', function () { elTip.hidden = true; }, { passive: true });

  window.addEventListener('online', function () { kirimAntre(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.user && S.token) { kirimAntre(); if (Date.now() - (S.terakhirMuat || 0) > 120000) muat(false); } });
  window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); S.pasang = ev; if (S.user && S.tab === 'akun') gambar(); });

  /* ==========================================================================
   * MULAI
   * ======================================================================== */
  function mulai() {
    S.antre = ambil(LS.antre, []); S.pref = Object.assign(S.pref, ambil(LS.pref, {}));
    var q = new URLSearchParams(location.search), hash = location.hash.match(/api=([^&]+)/);
    if (q.has('demo') && window.DEMO_API) {
      S.demo = true; S.api = 'demo'; S.antre = [];
      ambilInfo().then(layarMasuk); layarMasuk(); return;
    }
    if (hash) { try { simpan(LS.api, decodeURIComponent(hash[1])); } catch (e) { /* abaikan */ } history.replaceState(null, '', location.pathname + location.search); }
    S.api = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || ambil(LS.api, '');
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { /* tetap jalan tanpa mode luring */ });
    if (!S.api) { layarHubung(); return; }

    S.token = ambil(LS.token, ''); S.user = ambil(LS.user, null);
    if (S.token && S.user) {
      var c = ambil(LS.cache, null);
      if (c && c.nama === S.user.nama && c.data) {            // tampilkan data terakhir dulu, lalu perbarui
        S.data = c.data; S.master = c.master; S.info = c.info; S.hariIni = isoLokal(new Date());
        S.batasMundur = c.batasMundur; S.sptBolehUbah = c.sptBolehUbah; S.pernahMuat = true;
      }
      gambar(true); muat(false);
    } else {
      layarMasuk();
      ambilInfo().then(layarMasuk).catch(function (e) { layarHubung(galatJaringan(e) ? 'Tidak bisa menghubungi server. Periksa sinyal atau URL.' : e.message); });
    }
  }
  var muatAsli = muat;
  muat = function (segar) { S.terakhirMuat = Date.now(); return muatAsli(segar); };

  if (new URLSearchParams(location.search).has('demo') && !window.DEMO_API) {
    var s = document.createElement('script'); s.src = 'demo.js'; s.onload = mulai; s.onerror = mulai; document.head.appendChild(s);
  } else mulai();
})();
