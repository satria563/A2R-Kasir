// assets/js/store.js
const LS_KEYS = {
  USERS: 'a2r_users',
  SESSION: 'a2r_session',
  PRODUCTS: 'a2r_products',
  TXNS: 'a2r_transactions',
  LAST_RECEIPT: 'a2r_last_receipt'
};

const Store = {
  get(k, d = null) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set(k, v)  { localStorage.setItem(k, JSON.stringify(v)); },
  remove(k)  { localStorage.removeItem(k); },
  push(k, it){ const arr = Store.get(k, []); arr.push(it); Store.set(k, arr); return arr; }
};

/* ===== Waktu lokal (tanpa zona) ===== */
// contoh: 2025-11-11T02:45:12
const nowStr = () => {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
// contoh: 2025-11-11
const todayKey = () => {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

/* ===== Nomor transaksi kuat (timestamp + random) ===== */
const genTxnNo = () => {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts  = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  let rand  = Math.floor(Math.random()*900 + 100); // fallback 3 digit
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    rand = 100 + (a[0] % 900);
  } catch {}
  return `A2R-${ts}-${rand}`;
};

/* ===== Seeder (hanya saat kosong) ===== */
(function seedDefaults(){
  if (!Store.get(LS_KEYS.USERS)) {
    Store.set(LS_KEYS.USERS, [
      { email:'admin@a2r', password:'123456', role:'master', name:'Admin Master' },
      { email:'kasir@a2r', password:'123456', role:'staff',  name:'Admin Biasa'  },
    ]);
  }
  if (!Store.get(LS_KEYS.PRODUCTS)) {
    Store.set(LS_KEYS.PRODUCTS, [
      { id:'SPT-001', name:'A2R Runner Black', price:399000, stock:20 },
      { id:'SPT-002', name:'A2R Street White', price:429000, stock:12 },
      { id:'SPT-003', name:'A2R Flex Red',     price:379000, stock:7  },
      { id:'SPT-004', name:'A2R Trail Pro',    price:499000, stock:5  }
    ]);
  }
  if (!Store.get(LS_KEYS.TXNS)) Store.set(LS_KEYS.TXNS, []);
})();

/* ===== Migrasi data lama (kompatibilitas & perbaiki kasir Unknown) ===== */
(function migrateLegacyData(){
  const session = Store.get(LS_KEYS.SESSION, null); // dipakai untuk atribusi kasir jika kosong
  const fallbackCashier = session
    ? { email: session.email, name: session.name }
    : { email: '-', name: 'Unknown' };

  // --- Transaksi
  const txns = Store.get(LS_KEYS.TXNS, []);
  if (Array.isArray(txns) && txns.length) {
    let changed = false;

    txns.forEach(t => {
      // time -> at
      if (!t.at && t.time) { t.at = t.time; delete t.time; changed = true; }

      // normalisasi paid & change
      if (typeof t.paid   !== 'number') { t.paid   = t.total; changed = true; }
      if (typeof t.change !== 'number') {
        t.change = t.method === 'cash' ? Math.max(0, (t.paid || t.total) - t.total) : 0;
        changed = true;
      }

      // *** PERBAIKAN KASIR LAMA ***
      // Jika transaksi belum punya info kasir, isi dari sesi aktif (atau Unknown).
      if (!t.cashier || !t.cashier.name) {
        t.cashier = { ...fallbackCashier };
        changed = true;
      }
      // Jika ada kasir tapi tanpa 'name', coba isi dari USERS berdasarkan email
      if (t.cashier && !t.cashier.name && t.cashier.email) {
        const users = Store.get(LS_KEYS.USERS, []);
        const u = users.find(x => x.email === t.cashier.email);
        if (u) {
          t.cashier.name = u.name || 'Unknown';
          changed = true;
        }
      }
    });

    if (changed) Store.set(LS_KEYS.TXNS, txns);
  }

  // --- Struk terakhir
  const last = Store.get(LS_KEYS.LAST_RECEIPT, null);
  if (last) {
    let changed = false;

    if (!last.at && last.time) { last.at = last.time; delete last.time; changed = true; }
    if (typeof last.paid   !== 'number') { last.paid   = last.total; changed = true; }
    if (typeof last.change !== 'number') {
      last.change = last.method === 'cash' ? Math.max(0, (last.paid || last.total) - last.total) : 0;
      changed = true;
    }

    // *** PERBAIKAN KASIR LAMA untuk LAST_RECEIPT ***
    if (!last.cashier || !last.cashier.name) {
      last.cashier = { ...(session ? { email: session.email, name: session.name } : { email:'-', name:'Unknown' }) };
      changed = true;
    } else if (last.cashier && !last.cashier.name && last.cashier.email) {
      const users = Store.get(LS_KEYS.USERS, []);
      const u = users.find(x => x.email === last.cashier.email);
      if (u) { last.cashier.name = u.name || 'Unknown'; changed = true; }
    }

    if (changed) Store.set(LS_KEYS.LAST_RECEIPT, last);
  }
})();
