// assets/js/transactions.js
(function () {
  const body         = document.getElementById('txnBody');
  const search       = document.getElementById('searchTxn');
  const btnFind      = document.getElementById('btnFindTxn');
  const btnPrintLast = document.getElementById('btnPrintLast');

  if (!body) return;

  // Pakai helper rupiah dari global kalau ada, kalau tidak buat sendiri
  const rupiahSafe = (n) => {
    if (typeof rupiah === 'function') return rupiah(n);
    return (n || 0).toLocaleString('id-ID');
  };

  /* ================== RENDER LIST ================== */
  const render = (q = '') => {
    const list = Store.get(LS_KEYS.TXNS, []).slice().reverse();
    const filtered = q
      ? list.filter(t => (t.no || '').toLowerCase().includes(q.toLowerCase()))
      : list;

    if (!filtered.length) {
      body.innerHTML = `<tr><td colspan="6">Belum ada transaksi.</td></tr>`;
      return;
    }

    body.innerHTML = filtered.map(t => {
      const items = (t.items || []).reduce((a, b) => a + (b.qty || 0), 0);
      return `
        <tr>
          <td>${new Date(t.at || t.time).toLocaleString('id-ID')}</td>
          <td>${t.no}</td>
          <td>${items}</td>
          <td>Rp ${rupiahSafe(t.total)}</td>
          <td>${t.method === 'cash' ? 'Tunai' : 'QRIS'}</td>
          <td class="text-right">
            <button class="btn-secondary btn-sm" data-detail="${t.no}">Detail</button>
            <button class="btn-primary btn-sm" data-print="${t.no}">Cetak</button>
          </td>
        </tr>`;
    }).join('');
  };

  render();

  /* ================== EVENT LIST ================== */
  btnFind?.addEventListener('click', () => render(search?.value || ''));

  // Delegasi click di tbody
  body.addEventListener('click', (e) => {
    const detailBtn = e.target.closest('button[data-detail]');
    const printBtn  = e.target.closest('button[data-print]');

    if (detailBtn) {
      const no = detailBtn.dataset.detail;
      openDetail(no);
    }
    if (printBtn) {
      const no = printBtn.dataset.print;
      printReceipt(no);
    }
  });

  btnPrintLast?.addEventListener('click', () => {
    const last = Store.get(LS_KEYS.LAST_RECEIPT, null);
    if (last) printReceipt(last.no);
    else Toast?.show?.('Belum ada struk terakhir') || alert('Belum ada struk terakhir');
  });

  /* ================== HELPER AMBIL TRANSAKSI ================== */
  function getTxn(no) {
    const list = Store.get(LS_KEYS.TXNS, []);
    return list.find(t => t.no === no);
  }

  /* ================== DETAIL TRANSAKSI ================== */
  function openDetail(no) {
    const t = getTxn(no);
    if (!t) {
      Toast?.show?.('Transaksi tidak ditemukan') || alert('Transaksi tidak ditemukan');
      return;
    }

    const detailModal = document.getElementById('detailModal');
    const mbody       = detailModal?.querySelector('.modal-body');
    const titleEl     = detailModal?.querySelector('.modal-title');

    if (!detailModal || !mbody || !titleEl) {
      console.error('detailModal tidak ditemukan, cek app.html');
      Toast?.show?.('Modal detail transaksi tidak ditemukan') || alert('Modal detail transaksi tidak ditemukan');
      return;
    }

    const lines = (t.items || []).map(i => `
      <tr>
        <td>${i.id}</td>
        <td>${i.name}</td>
        <td>${i.qty}</td>
        <td>Rp ${rupiahSafe(i.price)}</td>
        <td>Rp ${rupiahSafe((i.qty || 0) * (i.price || 0))}</td>
      </tr>`).join('');

    const kasirName  = t.cashier?.name  || 'Unknown';
    const kasirEmail = t.cashier?.email || '-';

    const html = `
      <div class="space-y-1">
        <div class="flex justify-between"><strong>No Transaksi</strong><span>${t.no}</span></div>
        <div class="flex justify-between"><strong>Waktu</strong><span>${new Date(t.at || t.time).toLocaleString('id-ID')}</span></div>
        <div class="flex justify-between"><strong>Metode</strong><span>${t.method === 'cash' ? 'Tunai' : 'QRIS'}</span></div>
        <div class="flex justify-between"><strong>Kasir</strong><span>${kasirName} (${kasirEmail})</span></div>
      </div>
      <div class="overflow-auto border rounded-xl my-3">
        <table class="table">
          <thead>
            <tr><th>ID</th><th>Nama</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr>
          </thead>
          <tbody>${lines}</tbody>
        </table>
      </div>
      <div class="space-y-1">
        <div class="flex justify-between"><strong>Total</strong><span>Rp ${rupiahSafe(t.total)}</span></div>
        <div class="flex justify-between"><span>Dibayar</span><span>Rp ${rupiahSafe(t.paid ?? t.total ?? 0)}</span></div>
        <div class="flex justify-between"><span>Kembalian</span><span>Rp ${rupiahSafe(t.change ?? 0)}</span></div>
      </div>
    `;

    titleEl.textContent = 'Detail Transaksi';
    mbody.innerHTML = html;

    Modal.open('detailModal');
  }

  /* ================== CETAK STRUK ================== */
  function printReceipt(no) {
    const t = getTxn(no);
    if (!t) {
      Toast?.show?.('Transaksi tidak ditemukan') || alert('Transaksi tidak ditemukan');
      return;
    }

    const rows = (t.items || []).map(i => `
      <tr>
        <td>${i.qty} x ${i.name}</td>
        <td style="text-align:right">${rupiahSafe((i.qty || 0) * (i.price || 0))}</td>
      </tr>`).join('');

    const w = window.open('', 'PRINT', 'height=650,width=450');

    w.document.write(`
      <html><head><title>Struk ${t.no}</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;}
        .rcpt{width:280px;margin:0 auto}
        table{width:100%;border-collapse:collapse}
        td{padding:4px 0;border-bottom:1px dashed #ddd}
        @media print { @page{ size:58mm auto; margin:2mm; } }
      </style>
      </head><body>
      <div class="rcpt">
        <h3>Toko Sepatu A2R</h3>
        <div>${new Date(t.at || t.time).toLocaleString('id-ID')}</div>
        <div>No: ${t.no}</div>
        <hr/>
        <table>${rows}</table>
        <p>Total: <strong>Rp ${rupiahSafe(t.total)}</strong></p>
        <p>Metode: ${t.method === 'cash' ? 'Tunai' : 'QRIS'}</p>
        <p>Dibayar: Rp ${rupiahSafe(t.paid ?? t.total ?? 0)} | Kembali: Rp ${rupiahSafe(t.change ?? 0)}</p>
        <p style="margin-top:10px">Terima kasih 🙌</p>
      </div>
      <script>
        window.onload = () => {
          window.print();
          setTimeout(() => window.close(), 200);
        };
      </script>
      </body></html>
    `);
    w.document.close();
  }

  /* ================== REFRESH OTOMATIS ================== */
  window.addEventListener('a2r:txn-changed', () => render(search?.value || ''));
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEYS.TXNS) render(search?.value || '');
  });
})();
