// assets/js/ui.js
const Toast = {
  el: () => document.getElementById('toast'),
  show(msg, ms = 1800) {
    const t = this.el();
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), ms);
  }
};

const Loading = {
  el: () => document.getElementById('loading'),
  show() { this.el()?.classList.remove('hidden'); },
  hide() { this.el()?.classList.add('hidden'); }
};

const Modal = {
  open(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('hidden');
    document.body.classList.add('modal-open'); // kunci scroll halaman belakang
  },
  close(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('hidden');

    // jika tidak ada modal yang masih terbuka, lepas kunci scroll
    const anyOpen = Array.from(document.querySelectorAll('.modal'))
      .some(el => !el.classList.contains('hidden'));
    if (!anyOpen) document.body.classList.remove('modal-open');
  }
};

// Tutup modal via tombol [data-close]
window.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-close]');
  if (!btn) return;
  const modalEl = btn.closest('.modal');
  if (!modalEl || !modalEl.id) return;
  Modal.close(modalEl.id);
});

// Tutup modal teratas dengan tombol Escape
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const opened = Array.from(document.querySelectorAll('.modal'))
    .filter(m => !m.classList.contains('hidden'));
  const top = opened.pop();
  if (top?.id) Modal.close(top.id);
});

// Currency helper
const rupiah = n => (n || 0).toLocaleString('id-ID');
