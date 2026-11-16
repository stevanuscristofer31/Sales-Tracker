/* ============================================================================
 *  MODE CONTOH — hanya aktif bila alamat dibuka dengan tambahan "?demo".
 *  Semua nama customer dan angka di sini FIKTIF, dibuat acak di HP, dan tidak
 *  pernah dikirim ke mana pun. Berguna untuk mencoba tampilan atau melatih SPT
 *  baru tanpa menyentuh spreadsheet. Boleh dihapus kalau tidak diperlukan.
 * ========================================================================== */
(function () {
  'use strict';
  var benih = 20261115;
  function acak() { benih = (benih * 1664525 + 1013904223) % 4294967296; return benih / 4294967296; }
  function pilih(a) { return a[Math.floor(acak() * a.length)]; }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function sidik(o) { return JSON.stringify(o).length.toString(36) + Math.round(acak() * 1e6).toString(36); }

  var UKURAN = ['100x200', '120x200', '160x200', '180x200', '200x200'];
  function produk(b, s, k, dasar) {
    return [['Mattress Only', 1], ['Full Set', 1.62]].map(function (t) {
      return { b: b, s: s, t: t[0], k: k, v: UKURAN.map(function (u, i) { return [u, Math.round(dasar * t[1] * (1 + i * 0.16) / 1000) * 1000, '']; }) };
    });
  }
  var master = {
    spt: ['Ayu', 'Bima', 'Citra', 'Dimas'], toko: ['DEC Selatan', 'DEC Timur', 'DEC Barat', 'DEC Utara', 'DEC Pusat'],
    aktivitas: ['Edukasi Retail', 'Push Sales', 'Follow Up Customer', 'Display', 'Pameran', 'Training', 'Off / Cuti'],
    brand: ['Florence', 'King Koil', 'Serta'], kategori: ['Mattress Only', 'Full Set', 'Bed Set', 'Bantal', 'Aksesoris'],
    produk: [].concat(produk('Florence', 'Savoia', 'Exclusive Online Collection', 2200000), produk('Florence', 'Vittoria', 'Exclusive Online Collection', 1900000),
      produk('Florence', 'Animo Plus', 'Florence Type', 5600000), produk('Florence', 'Livorno', 'Latex', 8200000),
      produk('King Koil', 'Amberstone', 'Exclusive Online Collection', 12300000), produk('King Koil', 'Chiro Endorsed', 'Classic', 16500000),
      produk('Serta', 'Vantage', 'Cooling Tech', 7900000), produk('Serta', 'Haven', 'Cooling Tech', 6100000), produk('Serta', 'iPosture', 'iPedic', 10100000))
  };
  var NAMA = ['Bu Rini', 'Pak Anton', 'Bu Sari', 'Pak Yoga', 'Bu Lestari', 'Pak Hendra', 'Bu Winda', 'Pak Fajar', 'Bu Maya', 'Pak Rudi', 'Bu Tika', 'Pak Gilang', 'Bu Nadia', 'Pak Irfan'];
  var hariIni = iso(new Date(Date.now() + 7 * 3600000));
  var trx = [], kunj = [], nomor = 100;

  for (var mundur = 135; mundur >= 0; mundur--) {
    var d = iso(new Date(Date.parse(hariIni + 'T00:00:00Z') - mundur * 86400000));
    master.spt.forEach(function (spt, si) {
      if (mundur > 60 && si > 1) return;                       // tim bertambah seiring waktu
      var row = ++nomor;
      if (acak() < 0.13) { kunj.push({ row: row, tgl: d, jd: 'Off', jp: '', spt: spt, toko: '', dur: null, peng: null, akt: 'Off / Cuti', pros: null, qty: 0, nilai: 0, brand: '', nama: '', kat: '', tl: '', so: '', fp: 'k' + row }); return; }
      var toko = master.toko[(si + Math.floor(acak() * 2)) % master.toko.length];
      var k = { row: row, tgl: d, jd: pilih(['09.00', '10.00', '11.00']), jp: pilih(['18.00', '19.00', '20.00']), spt: spt, toko: toko, dur: 9, peng: Math.floor(acak() * 7), akt: pilih(['Push Sales', 'Push Sales', 'Edukasi Retail', 'Follow Up Customer', 'Display']), pros: Math.floor(acak() * 3), qty: 0, nilai: 0, brand: '', nama: '', kat: '', tl: '', so: '', fp: 'k' + row };
      if (mundur === 0 && si > 1) { k.jp = ''; k.peng = null; }
      kunj.push(k);
      var peluang = 0.16 + (135 - mundur) / 135 * 0.2 + (si === 0 ? 0.1 : 0);
      if (acak() > peluang) return;
      var g = pilih(acak() < 0.62 ? master.produk.slice(0, 8) : master.produk), v = g.v[pilih([1, 2, 2, 3, 3, 4])], q = acak() < 0.12 ? 2 : 1;
      var nilai = Math.round(v[1] * q * (0.9 + acak() * 0.1) / 1000) * 1000;
      var t = { row: ++nomor, id: 'd' + nomor, app: true, luar: false, inv: acak() < 0.85 ? '97' + Math.floor(10000 + acak() * 89999) + 'T' + d.slice(2).replace(/-/g, '') : '', tgl: d, spt: spt, cust: pilih(NAMA), dec: toko,
        produk: (q > 1 ? q + ' pcs ' : '') + g.s + ' ' + (g.t === 'Mattress Only' ? 'MO' : g.t) + ' ' + v[0], nilai: nilai, real: mundur > 45 ? Math.round(nilai * 0.9) : null, qty: q, ket: g.t,
        brand: g.b, kat: g.t, items: [{ b: g.b, s: g.s, t: g.t, u: v[0], sku: '', q: q, h: v[1] }], cat: '' };
      t.fp = sidik(t); trx.push(t);
      k.qty += q; k.nilai += nilai; k.brand = g.b; k.nama = g.s; k.kat = g.t; k.tl = 'Closing';
    });
  }

  var pengguna = null;
  function info() { var siap = { Stevan: true }; master.spt.forEach(function (s) { siap[s] = true; }); return { admin: 'Stevan', spt: master.spt, siap: siap }; }
  function data(denganMaster) {
    var a = pengguna.peran === 'admin';
    var o = { ok: true, pengguna: pengguna, hariIni: hariIni, batasMundur: 3, sptBolehUbah: false,
      trx: JSON.parse(JSON.stringify(a ? trx : trx.filter(function (t) { return t.spt === pengguna.nama; }))),
      kunj: JSON.parse(JSON.stringify(a ? kunj : kunj.filter(function (k) { return k.spt === pengguna.nama; }))) };
    if (denganMaster) { o.master = master; if (a) o.info = info(); }
    return o;
  }
  function galat(pesan, kode) { var e = new Error(pesan); e.kode = kode || 'VALIDASI'; return e; }

  window.DEMO_API = function (b) {
    return new Promise(function (ok, gagal) {
      setTimeout(function () {
        try {
          if (b.aksi === 'info') return ok(Object.assign({ ok: true }, info()));
          if (b.aksi === 'masuk') {
            if (!/^\d{4,8}$/.test(b.pin || '')) throw galat('PIN salah.', 'MASUK');
            pengguna = { nama: b.nama, peran: b.nama === 'Stevan' ? 'admin' : 'spt' };
            return ok({ ok: true, token: 'demo', pengguna: pengguna });
          }
          if (!pengguna) throw galat('Sesi berakhir. Silakan masuk lagi.', 'SESI');
          if (b.aksi === 'data') return ok(data(true));
          if (b.aksi === 'trxSimpan') {
            var x = b.trx, items = x.items || null, utama = items ? items.slice().sort(function (p, q) { return q.q * q.h - p.q * p.h; })[0] : null;
            var t = { inv: x.inv || '', tgl: x.tgl, spt: x.spt, cust: x.cust, dec: x.dec, nilai: x.nilai, real: x.real === undefined ? null : x.real, cat: x.cat || '', items: items, luar: false, app: true,
              qty: items ? items.reduce(function (a, i) { return a + i.q; }, 0) : x.qty, brand: utama ? utama.b : (x.brand || ''), kat: utama ? utama.t : (x.kat || ''),
              produk: items ? items.map(function (i) { return (i.q > 1 ? i.q + ' pcs ' : '') + i.s + ' ' + (i.t === 'Mattress Only' ? 'MO' : i.t) + ' ' + i.u; }).join(' + ') : x.produk };
            t.ket = t.cat || t.kat;
            if (b.ref) { var lama = trx.filter(function (z) { return z.id === b.ref.id; })[0]; if (!lama) throw galat('Data ini sudah berubah. Muat ulang.', 'KONFLIK'); Object.assign(lama, t); lama.fp = sidik(lama); }
            else if (!trx.some(function (z) { return z.id === x.id; })) { t.id = x.id; t.row = ++nomor; t.fp = sidik(t); trx.push(t); }
            return ok(data(false));
          }
          if (b.aksi === 'trxHapus') { trx = trx.filter(function (z) { return z.id !== b.ref.id; }); return ok(data(false)); }
          if (b.aksi === 'harianSimpan') {
            var h = b.kunj, off = /off|cuti/i.test(h.akt), jam = function (s) { return String(s || '').replace(':', '.'); };
            var k = b.ref ? kunj.filter(function (z) { return z.row === b.ref.row; })[0] : kunj.filter(function (z) { return z.tgl === h.tgl && z.spt === h.spt && z.toko === (off ? '' : h.toko); })[0];
            if (!k) { k = { row: ++nomor, tgl: h.tgl, spt: h.spt, qty: 0, nilai: 0, brand: '', nama: '', kat: '', so: '', fp: 'k' + nomor }; kunj.push(k); }
            Object.assign(k, { toko: off ? '' : h.toko, akt: h.akt, jd: off ? 'Off' : jam(h.jd), jp: off ? '' : jam(h.jp), peng: off ? null : h.peng, pros: h.pros, tl: h.tl || '', dur: null });
            return ok(data(false));
          }
          if (b.aksi === 'harianHapus') { kunj = kunj.filter(function (z) { return z.row !== b.ref.row; }); return ok(data(false)); }
          if (b.aksi === 'pinAtur') return ok({ ok: true, info: info() });
          if (b.aksi === 'pinGanti') return ok({ ok: true, token: 'demo' });
          throw galat('Perintah tidak dikenal.', 'AKSI');
        } catch (e) { gagal(e); }
      }, 350);
    });
  };
})();
