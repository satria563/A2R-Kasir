// assets/js/reports_advanced.js
(function () {
  // Elemen filter & kartu
  const elFrom      = document.getElementById('repFrom');
  const elTo        = document.getElementById('repTo');
  const btnApply    = document.getElementById('repApply');
  const btnExport   = document.getElementById('repExportCsv');
  const bToday      = document.getElementById('quickToday');
  const b7          = document.getElementById('quick7');
  const b30         = document.getElementById('quick30');

  const statTotal   = document.getElementById('statTotal');
  const statCount   = document.getElementById('statCount');
  const statTop     = document.getElementById('statTop');

  // Chart canvases
  const trendCanvas   = document.getElementById('trendChart');
  const methodCanvas  = document.getElementById('methodChart');
  const cashierCanvas = document.getElementById('cashierChart');

  // Tabel
  const topProductsBody    = document.getElementById('topProductsBody');
  const methodSummaryBody  = document.getElementById('methodSummaryBody');
  const cashierSummaryBody = document.getElementById('cashierSummaryBody');

  // Panel laporan tidak ada? keluar.
  if (!elFrom || !trendCanvas) return;

  // Helpers
  const pad = (n) => String(n).padStart(2, '0');
  const toLocalDateKey = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const parseInputDate = (val) => {
    const d = new Date(val);
    if (isNaN(d)) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };
  const fmtRp = (n) => (n || 0).toLocaleString('id-ID');

  // State chart utk destroy saat re-render
  let trendChart, methodChart, cashierChart;

  // State range terakhir (untuk Export CSV)
  let lastFiltered = {
    txns: [],
    fromKey: '',
    toKey: ''
  };

  function buildRangeDays(start, end) {
    const keys = [];
    const d = new Date(start);
    while (d <= end) {
      keys.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      d.setDate(d.getDate() + 1);
    }
    return keys;
  }

  function apply() {
    // 1) Ambil tanggal dari filter
    const fromDate = parseInputDate(elFrom.value);
    const toDate   = parseInputDate(elTo.value);

    if (!fromDate || !toDate) {
      Toast?.show?.('Pilih rentang tanggal terlebih dahulu') || alert('Pilih rentang tanggal terlebih dahulu');
      return;
    }
    if (toDate < fromDate) {
      Toast?.show?.('Tanggal akhir tidak boleh lebih awal dari tanggal mulai') || alert('Tanggal akhir tidak boleh lebih awal dari tanggal mulai');
      return;
    }

    // 2) Ambil transaksi & filter sesuai rentang
    const txns    = Store.get(LS_KEYS.TXNS, []);
    const fromKey = toLocalDateKey(fromDate.toISOString());
    const toKey   = toLocalDateKey(toDate.toISOString());

    const inRange = txns.filter(t => {
      const key = toLocalDateKey(t.at || t.time);
      return key >= fromKey && key <= toKey;
    });

    // simpan untuk Export CSV
    lastFiltered = { txns: inRange, fromKey, toKey };

    // 3) Hitung kartu
    const totalOmzet = inRange.reduce((a, t) => a + (t.total || 0), 0);
    statTotal.textContent = `Rp ${fmtRp(totalOmzet)}`;
    statCount.textContent = fmtRp(inRange.length);

    // 4) Agregasi produk
    const prodAgg = {};
    inRange.forEach(t => (t.items || []).forEach(i => {
      if (!prodAgg[i.id]) prodAgg[i.id] = { id: i.id, name: i.name, qty: 0, total: 0 };
      prodAgg[i.id].qty   += i.qty;
      prodAgg[i.id].total += i.qty * i.price;
    }));
    const prodArr = Object.values(prodAgg).sort((a, b) => b.qty - a.qty);
    statTop.textContent = prodArr[0] ? `${prodArr[0].name} (${prodArr[0].qty})` : '-';

    topProductsBody.innerHTML = prodArr.length
      ? prodArr.slice(0, 10).map(p =>
          `<tr><td>${p.id}</td><td>${p.name}</td><td>${fmtRp(p.qty)}</td><td>Rp ${fmtRp(p.total)}</td></tr>`
        ).join('')
      : '<tr><td colspan="4">Tidak ada data</td></tr>';

    // 5) Agregasi metode
    const methodAgg = inRange.reduce((m, t) => {
      const k = t.method || '-';
      if (!m[k]) m[k] = { count: 0, total: 0 };
      m[k].count += 1;
      m[k].total += t.total || 0;
      return m;
    }, {});
    const methodRows = Object.entries(methodAgg).map(([k, v]) =>
      `<tr><td>${k === 'cash' ? 'Tunai' : 'QRIS'}</td><td>${fmtRp(v.count)}</td><td>Rp ${fmtRp(v.total)}</td></tr>`
    ).join('');
    methodSummaryBody.innerHTML = methodRows || '<tr><td colspan="3">Tidak ada transaksi</td></tr>';

    // 6) Data Tren Penjualan per Hari (line chart)
    const dayKeys = buildRangeDays(fromDate, toDate);
    const dayMap  = Object.fromEntries(dayKeys.map(k => [k, 0]));
    inRange.forEach(t => {
      const key = toLocalDateKey(t.at || t.time);
      dayMap[key] += t.total || 0;
    });

    const lineLabels = dayKeys.map(k => k.slice(5));
    const lineData   = dayKeys.map(k => dayMap[k] || 0);

    if (trendChart) trendChart.destroy();
    trendChart = new Chart(trendCanvas, {
      type: 'line',
      data: { labels: lineLabels, datasets: [{ label: 'Omzet (Rp)', data: lineData, tension: .3 }] },
      options: {
        responsive: true,
        scales: {
          y: { ticks: { callback: (v) => `Rp ${fmtRp(v)}` } }
        },
        plugins: { legend: { display: false } }
      }
    });

    // 7) Doughnut breakdown metode
    if (methodChart) methodChart.destroy();
    const mLabels = Object.keys(methodAgg).length ? Object.keys(methodAgg).map(k => k === 'cash' ? 'Tunai' : 'QRIS') : ['(Kosong)'];
    const mData   = Object.keys(methodAgg).length ? Object.values(methodAgg).map(v => v.total) : [0];
    methodChart = new Chart(methodCanvas, {
      type: 'doughnut',
      data: { labels: mLabels, datasets: [{ data: mData }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    // 8) Kontribusi per kasir
    const cashierAgg = {};
    inRange.forEach(t => {
      const name  = t.cashier?.name || 'Unknown';
      const email = t.cashier?.email || '-';
      const key   = `${name}||${email}`;
      if (!cashierAgg[key]) cashierAgg[key] = { name, email, count: 0, total: 0 };
      cashierAgg[key].count += 1;
      cashierAgg[key].total += t.total || 0;
    });

    const cashierArr = Object.values(cashierAgg).sort((a, b) => b.total - a.total);
    if (cashierSummaryBody) {
      cashierSummaryBody.innerHTML = cashierArr.length
        ? cashierArr.map(c =>
            `<tr><td>${c.name}</td><td>${fmtRp(c.count)}</td><td>Rp ${fmtRp(c.total)}</td></tr>`
          ).join('')
        : '<tr><td colspan="3">Belum ada transaksi</td></tr>';
    }

    if (cashierCanvas) {
      if (cashierChart) cashierChart.destroy();
      const cLabels = cashierArr.map(c => c.name);
      const cData   = cashierArr.map(c => c.total);
      cashierChart = new Chart(cashierCanvas, {
        type: 'bar',
        data: {
          labels: cLabels,
          datasets: [{ label: 'Omzet per Kasir (Rp)', data: cData }]
        },
        options: {
          responsive: true,
          indexAxis: 'y',
          scales: {
            x: { ticks: { callback: (v) => `Rp ${fmtRp(v)}` } }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
  }

  // ===== Export CSV: pakai "No Transaksi" + "Nama Barang" =====
  function exportCsv() {
    const txns = lastFiltered.txns || [];
    if (!txns.length) {
      Toast?.show?.('Tidak ada transaksi pada rentang ini') || alert('Tidak ada transaksi pada rentang ini');
      return;
    }

    const rows = [];
    // Header baru
    rows.push([
      'No Transaksi',
      'Waktu',
      'Metode',
      'Kasir',
      'Email Kasir',
      'Nama Barang',
      'Jumlah Item',
      'Total (Rp)',
      'Dibayar',
      'Kembalian'
    ]);

    txns.forEach(t => {
      const items = (t.items || []);
      const itemCount = items.reduce((a, i) => a + (i.qty || 0), 0);

      // Ringkasan semua barang dalam satu sel
      const itemsSummary = items.map(i =>
        `${i.id} - ${i.name} (x${i.qty})`
      ).join('; ');

      const kasirName  = t.cashier?.name  || 'Unknown';
      const kasirEmail = t.cashier?.email || '-';

      rows.push([
        t.no || '',
        new Date(t.at || t.time).toLocaleString('id-ID'),
        t.method === 'cash' ? 'Tunai' : 'QRIS',
        kasirName,
        kasirEmail,
        itemsSummary,
        String(itemCount),
        String(t.total || 0),
        String(t.paid ?? t.total ?? 0),
        String(t.change ?? 0)
      ]);
    });

    const csvLines = rows.map(cols =>
      cols.map(val => {
        const s = String(val ?? '');
        if (s.includes('"') || s.includes(',') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(',')
    ).join('\r\n');

    const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const from = lastFiltered.fromKey || 'all';
    const to   = lastFiltered.toKey || 'all';
    a.href = url;
    a.download = `laporan-transaksi-${from}-sampai-${to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Quick ranges
  function setRangeDays(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const toKey   = `${end.getFullYear()}-${pad(end.getMonth()+1)}-${pad(end.getDate())}`;
    const fromKey = `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`;
    elFrom.value = fromKey;
    elTo.value   = toKey;
    apply();
  }

  // Event listeners
  btnApply?.addEventListener('click', apply);
  btnExport?.addEventListener('click', exportCsv);
  bToday?.addEventListener('click', () => setRangeDays(1));
  b7?.addEventListener('click',     () => setRangeDays(7));
  b30?.addEventListener('click',    () => setRangeDays(30));

  // Saat tab Laporan di-klik, otomatis “Hari Ini”
  document.querySelector('button[data-target="#section-rep"]')
    ?.addEventListener('click', () => setRangeDays(1));

  // Refresh ketika transaksi baru dibuat
  window.addEventListener('a2r:txn-changed', () => {
    const repSec = document.getElementById('section-rep');
    if (repSec && !repSec.classList.contains('hidden')) {
      apply();
    }
  });

  // Inisialisasi default kalau panel laporan sudah tampak
  const repSec = document.getElementById('section-rep');
  if (repSec && !repSec.classList.contains('hidden')) setRangeDays(1);
})();
