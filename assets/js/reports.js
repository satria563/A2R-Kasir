// assets/js/reports.js
(function(){
  const repToday    = document.getElementById('repToday');
  const repCount    = document.getElementById('repCount');
  const repTop      = document.getElementById('repTop');
  const repMethods  = document.getElementById('repMethods');
  const repProducts = document.getElementById('repProducts');
  const repSection  = document.getElementById('section-rep');

  if(!repToday || !repSection) return;

  // Ambil YYYY-MM-DD berdasar waktu lokal dari string ISO/Local-ISO
  function localDateKeyFromISO(iso){
    if(!iso) return '';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function refresh(){
    const txns  = Store.get(LS_KEYS.TXNS, []);
    const today = todayKey(); // dari store.js (waktu lokal)

    // Dukung data lama ('time') & baru ('at')
    const todayTxns = txns.filter(t => localDateKeyFromISO(t.at || t.time) === today);

    // Ringkasan
    const totalToday = todayTxns.reduce((a,b)=> a + b.total, 0);
    repToday.textContent = `Rp ${rupiah(totalToday)}`;
    repCount.textContent = todayTxns.length;

    // Breakdown metode
    const groupM = todayTxns.reduce((m,t)=>{
      m[t.method] = (m[t.method] || {count:0,total:0});
      m[t.method].count += 1;
      m[t.method].total += t.total;
      return m;
    },{});

    repMethods.innerHTML = Object.keys(groupM).length
      ? Object.entries(groupM)
          .map(([k,v]) =>
            `<tr><td>${k==='cash'?'Tunai':'QRIS'}</td><td>${v.count}</td><td>Rp ${rupiah(v.total)}</td></tr>`
          )
          .join('')
      : '<tr><td colspan="3">Belum ada transaksi</td></tr>';

    // Penjualan per produk
    const prodAgg = {};
    todayTxns.forEach(t => t.items.forEach(i => {
      if(!prodAgg[i.id]) prodAgg[i.id] = { id:i.id, name:i.name, qty:0, total:0 };
      prodAgg[i.id].qty   += i.qty;
      prodAgg[i.id].total += i.qty * i.price;
    }));

    const arr = Object.values(prodAgg).sort((a,b)=> b.qty - a.qty);

    repProducts.innerHTML = arr.length
      ? arr.map(p =>
          `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.qty}</td><td>Rp ${rupiah(p.total)}</td></tr>`
        ).join('')
      : '<tr><td colspan="4">Belum ada data</td></tr>';

    repTop.textContent = arr[0] ? `${arr[0].name} (${arr[0].qty})` : '-';
  }

  // Refresh ketika tab Laporan dibuka
  document.querySelector('button[data-target="#section-rep"]')
    ?.addEventListener('click', refresh);

  // Refresh ketika ada transaksi baru & ketika localStorage berubah (tab lain)
  window.addEventListener('a2r:txn-changed', refresh);
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEYS.TXNS) refresh();
  });

  // Jika section laporan sudah terlihat saat load
  if(!repSection.classList.contains('hidden')) refresh();
})();
