(function () {
  const catalogBody     = document.getElementById('catalogBody');
  const catalogSearch   = document.getElementById('catalogSearch');
  const btnCatalogReset = document.getElementById('btnCatalogReset');
  const cartBody        = document.getElementById('cartBody');
  const btnPay          = document.getElementById('btnPay');
  const payMethod       = document.getElementById('payMethod');

  let cart = [];

  /* ===================== UTIL ===================== */
  const cartTotal = () => cart.reduce((a, c) => a + c.qty * c.price, 0);

  /* ===================== KATALOG ===================== */
  function renderCatalog(q = '') {
    const list = Store.get(LS_KEYS.PRODUCTS, []);
    const rows = list
      .filter(p =>
        p.id.toLowerCase().includes(q.toLowerCase()) ||
        p.name.toLowerCase().includes(q.toLowerCase())
      )
      .map(p => `
        <tr>
          <td>${p.id}</td>
          <td>${p.name}</td>
          <td>${p.price.toLocaleString('id-ID')}</td>
          <td>${p.stock}</td>
          <td>
            <button class="btn-primary btn-xs" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>Tambah</button>
          </td>
        </tr>`
      ).join('');
    catalogBody.innerHTML = rows || '<tr><td colspan="5">Tidak ada produk.</td></tr>';
  }

  /* ===================== KERANJANG ===================== */
  function renderCart() {
    const rows = cart.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.price.toLocaleString('id-ID')}</td>
        <td>
          <input type="number" class="input input-xs qty" data-id="${c.id}" value="${c.qty}" min="1">
        </td>
        <td>${(c.qty * c.price).toLocaleString('id-ID')}</td>
        <td><button class="btn-danger btn-xs" data-id="${c.id}">Hapus</button></td>
      </tr>`
    ).join('');
    cartBody.innerHTML = rows || '<tr><td colspan="6">Keranjang kosong</td></tr>';
    updateSummary();
  }

  function updateSummary() {
    const sumItems = cart.reduce((a, c) => a + c.qty, 0);
    const sumPrice = cartTotal();
    const elItems  = document.getElementById('sumItems');
    const elPrice  = document.getElementById('sumPrice');
    if (elItems) elItems.textContent = sumItems;
    if (elPrice) elPrice.textContent = sumPrice.toLocaleString('id-ID');
  }

  function addToCart(id) {
    const list = Store.get(LS_KEYS.PRODUCTS, []);
    const prod = list.find(p => p.id === id);
    if (!prod) return alert('Produk tidak ditemukan');
    if (prod.stock <= 0) return alert('Stok habis');

    const exist = cart.find(c => c.id === id);
    if (exist) {
      if (exist.qty + 1 > prod.stock) return alert('Stok tidak cukup');
      exist.qty++;
    } else {
      // simpan data minimal
      cart.push({ id: prod.id, name: prod.name, price: prod.price, qty: 1 });
    }
    renderCart();
  }

  /* --- Events katalog --- */
  catalogBody?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (btn) addToCart(btn.dataset.id);
  });

  catalogSearch?.addEventListener('input', e => renderCatalog(e.target.value));

  btnCatalogReset?.addEventListener('click', () => {
    if (catalogSearch) catalogSearch.value = '';
    renderCatalog('');
  });

  /* --- Events keranjang --- */
  cartBody?.addEventListener('input', e => {
    const inp = e.target.closest('.qty');
    if (!inp) return;

    const id  = inp.dataset.id;
    let val   = parseInt(inp.value, 10);
    if (!Number.isFinite(val) || val < 1) val = 1;

    const list = Store.get(LS_KEYS.PRODUCTS, []);
    const prod = list.find(p => p.id === id);
    if (!prod) return;

    if (val > prod.stock) {
      alert('Stok tidak cukup');
      val = prod.stock || 1;
    }
    const item = cart.find(c => c.id === id);
    if (item) item.qty = val;
    renderCart();
  });

  cartBody?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    cart = cart.filter(c => c.id !== btn.dataset.id);
    renderCart();
  });

  /* ===================== PEMBAYARAN ===================== */
  btnPay?.addEventListener('click', () => {
    if (cart.length === 0) return alert('Keranjang kosong');

    const total  = cartTotal();
    const method = payMethod.value;

    // set info modal
    const mTotal  = document.getElementById('mTotal');
    const mMethod = document.getElementById('mMethod');
    if (mTotal)  mTotal.textContent  = total.toLocaleString('id-ID');
    if (mMethod) mMethod.textContent = method === 'cash' ? 'Tunai' : 'QRIS Digital';

    // toggle area cash/qris
    const cashArea = document.getElementById('cashArea');
    const qrisArea = document.getElementById('qrisArea');
    if (cashArea) cashArea.classList.toggle('hidden', method !== 'cash');
    if (qrisArea) qrisArea.classList.toggle('hidden', method !== 'qris');

    // reset / generate QR
    const qrEl = document.getElementById('qrcode');
    if (qrEl) qrEl.innerHTML = '';
    if (method === 'qris' && qrEl) {
      // pastikan qrcode.min.js sudah ter-load sebelum file ini
      new QRCode(qrEl, { text: 'Pembayaran A2R', width: 160, height: 160 });
    } else {
      const cashInput   = document.getElementById('cashInput');
      const changeLabel = document.getElementById('changeLabel');
      if (cashInput)   cashInput.value = '';
      if (changeLabel) changeLabel.textContent = '0';
    }

    // buka modal
    Modal.open('payModal');

    // pasang listener kembalian otomatis setelah modal muncul (elemen pasti ada)
    const cashInput = document.getElementById('cashInput');
    if (cashInput) {
      cashInput.oninput = () => {
        const uang   = Number(cashInput.value);
        const change = Number.isFinite(uang) && uang > total ? (uang - total) : 0;
        const changeLabel = document.getElementById('changeLabel');
        if (changeLabel) changeLabel.textContent = change.toLocaleString('id-ID');
      };
    }
  });

  document.getElementById('btnConfirmPay')?.addEventListener('click', () => {
    const method = payMethod.value;
    const total  = cartTotal();

    let paid = total;
    let change = 0;

    if (method === 'cash') {
      const cashInput = document.getElementById('cashInput');
      const uang = Number(cashInput?.value || '0');
      if (!Number.isFinite(uang) || uang < total) {
        return alert('Uang tidak cukup');
      }
      paid   = uang;
      change = Math.max(0, uang - total);
      const changeLabel = document.getElementById('changeLabel');
      if (changeLabel) changeLabel.textContent = change.toLocaleString('id-ID');
    }

    // kurangi stok
    const products = Store.get(LS_KEYS.PRODUCTS, []);
    cart.forEach(c => {
      const p = products.find(x => x.id === c.id);
      if (p) p.stock = Math.max(0, (p.stock || 0) - c.qty);
    });
    Store.set(LS_KEYS.PRODUCTS, products);

    // ambil info kasir dari sesi (untuk laporan per karyawan)
    const session = Store.get(LS_KEYS.SESSION, null);
    const cashier = session
      ? { email: session.email, name: session.name }
      : { email: '-', name: 'Unknown' };

    // bentuk transaksi KONSISTEN untuk semua modul
    const txn = {
      no: genTxnNo(),
      at: nowStr(), // gunakan 'at' (timestamp lokal)
      method,       // 'cash' | 'qris'
      items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
      total,
      paid,
      change,
      cashier       // untuk analitik per kasir
    };

    const txns = Store.get(LS_KEYS.TXNS, []);
    txns.push(txn);
    Store.set(LS_KEYS.TXNS, txns);
    Store.set(LS_KEYS.LAST_RECEIPT, txn);

    // beritahu modul lain & reset UI
    window.dispatchEvent(new CustomEvent('a2r:products-changed'));
    window.dispatchEvent(new CustomEvent('a2r:txn-changed'));

    cart = [];
    renderCart();
    renderCatalog(catalogSearch?.value || '');

    Modal.close('payModal');
    (Toast?.show && Toast.show('Transaksi berhasil')) || alert('Transaksi berhasil');

    // tampilkan tombol cetak struk terakhir jika ada
    document.getElementById('btnPrintLast')?.classList.remove('hidden');
  });

  /* ===================== SINKRONISASI ===================== */
  // jika produk berubah (dari modul Produk atau transaksi), segarkan katalog
  window.addEventListener('a2r:products-changed', () => renderCatalog(catalogSearch?.value || ''));
  // perubahan dari tab lain (localStorage event)
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEYS.PRODUCTS) renderCatalog(catalogSearch?.value || '');
  });

  /* ===================== INIT ===================== */
  renderCatalog('');
  renderCart();
})();
