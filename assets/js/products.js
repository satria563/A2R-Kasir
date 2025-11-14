// assets/js/products.js
(function () {
  const table = document.getElementById('prodBody');
  const search = document.getElementById('prodSearch');
  const btnNew = document.getElementById('btnNewProd');

  const render = (query = '') => {
    const list = Store.get(LS_KEYS.PRODUCTS, []);
    const rows = list.filter(p =>
      p.id.toLowerCase().includes(query.toLowerCase()) ||
      p.name.toLowerCase().includes(query.toLowerCase())
    ).map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p.price.toLocaleString()}</td>
        <td>${p.stock}</td>
        <td>
          <button class="btn-secondary btn-xs" data-id="${p.id}" data-act="edit">✎</button>
          <button class="btn-danger btn-xs" data-id="${p.id}" data-act="del">🗑️</button>
        </td>
      </tr>`).join('');
    table.innerHTML = rows || '<tr><td colspan="5">Tidak ada produk.</td></tr>';
  };

  render('');

  search?.addEventListener('input', e => render(e.target.value));

  btnNew?.addEventListener('click', () => openModal(null));

  table?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    const list = Store.get(LS_KEYS.PRODUCTS, []);
    const idx = list.findIndex(p => p.id === id);
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

  const openModal = (prod) => {
    Modal.open('prodModal');
    const id = document.getElementById('pId');
    const name = document.getElementById('pName');
    const price = document.getElementById('pPrice');
    const stock = document.getElementById('pStock');
    const title = document.getElementById('prodModalTitle');
    title.textContent = prod ? 'Edit Produk' : 'Produk Baru';
    id.value = prod?.id || '';
    id.disabled = !!prod;
    name.value = prod?.name || '';
    price.value = prod?.price || '';
    stock.value = prod?.stock || '';
  };

  document.getElementById('btnSaveProd')?.addEventListener('click', () => {
    const id = document.getElementById('pId').value.trim();
    const name = document.getElementById('pName').value.trim();
    const price = parseFloat(document.getElementById('pPrice').value);
    const stock = parseInt(document.getElementById('pStock').value);

    if (!id || !name || isNaN(price) || isNaN(stock)) {
      alert('Lengkapi semua field'); return;
    }

    const list = Store.get(LS_KEYS.PRODUCTS, []);
    const idx = list.findIndex(p => p.id === id);
    if (idx >= 0) list[idx] = { id, name, price, stock };
    else list.push({ id, name, price, stock });
    Store.set(LS_KEYS.PRODUCTS, list);

    window.dispatchEvent(new CustomEvent('a2r:products-changed'));
    Modal.close('prodModal');
    render(search.value);
  });

  // auto-refresh jika stok berubah
  window.addEventListener('a2r:products-changed', () => render(search?.value || ''));
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEYS.PRODUCTS) render(search?.value || '');
  });
})();
