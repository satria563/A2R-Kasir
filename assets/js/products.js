// assets/js/products.js
(function () {
  const table  = document.getElementById('prodBody');
  const search = document.getElementById('prodSearch');
  const btnNew = document.getElementById('btnNewProd');

  const render = (query = '') => {
    const list = Store.get(LS_KEYS.PRODUCTS, []);
    const rows = list
      .filter(p =>
        (p.id   || '').toLowerCase().includes(query.toLowerCase()) ||
        (p.name || '').toLowerCase().includes(query.toLowerCase())
      )
      .map(p => `
        <tr>
          <td>${p.id}</td>
          <td>${p.name}</td>
          <td>${(p.price || 0).toLocaleString('id-ID')}</td>
          <td>${p.stock}</td>
          <td>
            <button class="btn-secondary btn-xs" data-id="${p.id}" data-act="edit">✎</button>
            <button class="btn-danger btn-xs" data-id="${p.id}" data-act="del">🗑️</button>
          </td>
        </tr>`)
      .join('');

    table.innerHTML = rows || '<tr><td colspan="5">Tidak ada produk.</td></tr>';
  };

  render('');

  /* ================== EVENT LIST ================== */
  search?.addEventListener('input', e => render(e.target.value));

  btnNew?.addEventListener('click', () => openModal(null));

  table?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;

    const id   = btn.dataset.id;
    const list = Store.get(LS_KEYS.PRODUCTS, []);
    const idx  = list.findIndex(p => p.id === id);
    if (idx < 0) return;

    if (btn.dataset.act === 'edit') {
      openModal(list[idx]);
    } else if (btn.dataset.act === 'del') {
      if (confirm('Hapus produk ini?')) {
        list.splice(idx, 1);
        Store.set(LS_KEYS.PRODUCTS, list);
        window.dispatchEvent(new CustomEvent('a2r:products-changed'));
        render(search.value);
      }
    }
  });

  /* ================== MODAL PRODUK ================== */
  const openModal = (prod) => {
    Modal.open('prodModal');

    const id    = document.getElementById('pId');
    const name  = document.getElementById('pName');
    const price = document.getElementById('pPrice');
    const stock = document.getElementById('pStock');
    const title = document.getElementById('prodModalTitle');

    title.textContent = prod ? 'Edit Produk' : 'Produk Baru';

    id.value      = prod?.id    || '';
    id.disabled   = !!prod;
    name.value    = prod?.name  || '';
    price.value   = prod?.price ?? '';
    stock.value   = prod?.stock ?? '';
  };

  document.getElementById('btnSaveProd')?.addEventListener('click', () => {
    const idVal    = document.getElementById('pId').value.trim();
    const nameVal  = document.getElementById('pName').value.trim();
    const priceRaw = document.getElementById('pPrice').value;
    const stockRaw = document.getElementById('pStock').value;

    const price = parseFloat(priceRaw);
    const stock = parseInt(stockRaw, 10);

    // Validasi field wajib
    if (!idVal || !nameVal || priceRaw === '' || stockRaw === '') {
      alert('Lengkapi semua field'); 
      return;
    }

    // Validasi angka
    if (isNaN(price) || isNaN(stock)) {
      alert('Harga dan stok harus berupa angka');
      return;
    }

    // TIDAK BOLEH MINUS
    if (price <= 0) {
      alert('Harga harus lebih dari 0');
      return;
    }

    if (stock < 0) {
      alert('Stok tidak boleh kurang dari 0');
      return;
    }

    const list = Store.get(LS_KEYS.PRODUCTS, []);
    const idx  = list.findIndex(p => p.id === idVal);

    const data = {
      id   : idVal,
      name : nameVal,
      price: price,
      stock: stock
    };

    if (idx >= 0) {
      list[idx] = data;
    } else {
      list.push(data);
    }

    Store.set(LS_KEYS.PRODUCTS, list);

    window.dispatchEvent(new CustomEvent('a2r:products-changed'));
    Modal.close('prodModal');
    render(search.value);
  });

  /* ================== AUTO REFRESH ================== */
  window.addEventListener('a2r:products-changed', () =>
    render(search?.value || '')
  );

  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEYS.PRODUCTS) {
      render(search?.value || '');
    }
  });
})();
