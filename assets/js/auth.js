// assets/js/auth.js
(function () {
  // Lama sesi berlaku: 12 jam
  const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

  /** Cek apakah objek sesi valid (email/role/name ada, user masih terdaftar, belum kedaluwarsa) */
  function isSessionValid(s) {
    if (!s || !s.email || !s.role || !s.name || !s.ts) return false;

    // user masih ada di daftar USERS?
    const users = Store.get(LS_KEYS.USERS, []);
    const exists = users.some(u => u.email === s.email && u.role === s.role && u.name === s.name);
    if (!exists) return false;

    // cek umur sesi
    const ageMs = Date.now() - Date.parse(s.ts);
    return ageMs >= 0 && ageMs < SESSION_TTL_MS;
  }

  // Apakah ini halaman login?
  const isLoginPage = !!document.getElementById('loginForm');

  // Ambil sesi saat ini (jika ada)
  let session = Store.get(LS_KEYS.SESSION, null);

  /* ==========================
   * HALAMAN LOGIN
   * ========================== */
  if (isLoginPage) {
    // Jika ada sesi tetapi sudah tidak valid, bersihkan
    if (session && !isSessionValid(session)) {
      localStorage.removeItem(LS_KEYS.SESSION);
      session = null;
    }

    const form = document.getElementById('loginForm');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();

      const email = document.getElementById('email')?.value?.trim() || '';
      const password = document.getElementById('password')?.value || '';
      const users = Store.get(LS_KEYS.USERS, []);

      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        (Toast?.show && Toast.show('Email atau password salah')) || alert('Email atau password salah');
        return;
      }

      // Simpan sesi LENGKAP — name wajib ada agar laporan per kasir tidak "Unknown"
      Store.set(LS_KEYS.SESSION, {
        email: user.email,
        name:  user.name,
        role:  user.role, // 'master' | 'staff'
        ts:    nowStr()   // timestamp lokal (lihat store.js)
      });

      // Masuk ke app
      location.href = 'app.html';
    });

    // Selesai untuk halaman login
    return;
  }

  /* ==========================
   * HALAMAN APP (app.html)
   * ========================== */
  if (!isSessionValid(session)) {
    // Sesi tidak valid → paksa kembali ke login
    localStorage.removeItem(LS_KEYS.SESSION);
    location.href = 'index.html';
    return;
  }

  // Tampilkan label nama & role di header
  const roleLabel = document.getElementById('roleLabel');
  if (roleLabel) {
    roleLabel.textContent = `${session.name} • ${session.role === 'master' ? 'Admin Master' : 'Admin Biasa'}`;
  }

  // Sembunyikan fitur khusus admin untuk kasir biasa
  if (session.role !== 'master') {
    document.querySelectorAll('.only-master').forEach(el => el.classList.add('hidden'));
  }

  // Navigasi sidebar: highlight & tampilkan section sesuai target
  document.querySelectorAll('#sidebar .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      // toggle active
      document.querySelectorAll('#sidebar .nav-item').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      // tampilkan section target
      const targetSel = btn.getAttribute('data-target');
      document.querySelectorAll('main [id^="section-"]').forEach(sec => sec.classList.add('hidden'));
      const targetEl = targetSel ? document.querySelector(targetSel) : null;
      (targetEl || document.getElementById('section-pay'))?.classList.remove('hidden');
    });
  });

  // Pastikan ada satu section yang terlihat pada load awal (default ke Pembayaran)
  const anyVisible = Array.from(document.querySelectorAll('main [id^="section-"]'))
    .some(sec => !sec.classList.contains('hidden'));
  if (!anyVisible) {
    document.getElementById('section-pay')?.classList.remove('hidden');
  }

  // Tampilkan tombol "Cetak Struk Terakhir" bila ada data
  const last = Store.get(LS_KEYS.LAST_RECEIPT, null);
  if (last) {
    document.getElementById('btnPrintLast')?.classList.remove('hidden');
  }

  // Logout
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    localStorage.removeItem(LS_KEYS.SESSION);
    location.href = 'index.html';
  });
})();
