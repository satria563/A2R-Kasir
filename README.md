# 🛒 A2R KASIR  
Aplikasi Kasir Berbasis Web untuk Toko A2R

A2R Kasir adalah aplikasi kasir berbasis web yang dirancang untuk membantu proses transaksi di Toko Sepatu A2R secara lebih cepat, akurat, dan efisien. Aplikasi ini dikembangkan menggunakan HTML, Tailwind CSS, dan JavaScript murni dengan penyimpanan berbasis LocalStorage sehingga dapat berjalan tanpa server atau database eksternal.

Demo Aplikasi:  
https://satria563.github.io/A2R-Kasir/

---

##  Fitur Utama

### 🔐 **1. Login Pengguna**
- Role: Admin & Kasir  
- Validasi email dan password basic  
- Akses fitur berdasarkan level pengguna  

### 🛍️ **2. Manajemen Produk**
- Menambah produk baru  
- Mengedit data produk  
- Menghapus produk  
- Menampilkan daftar produk  

### 📦 **3. Manajemen Stok**
- Update stok otomatis ketika transaksi selesai  
- Notifikasi stok menipis  
- Riwayat stok tersimpan otomatis  

### 💵 **4. Transaksi Penjualan**
- Tambah barang ke keranjang  
- Hitung total, diskon, dan kembalian otomatis  
- Pilihan metode bayar: **Tunai** / **QRIS**  
- Nomor transaksi otomatis  
- Struk digital siap cetak  

### 📊 **5. Laporan Penjualan**
- Rekap semua transaksi  
- Filter berdasarkan tanggal  
- Nilai total penjualan harian / bulanan  
- Ditampilkan langsung dari LocalStorage  

### 👤 **6. Manajemen User**
- Tambah user baru  
- Edit user  
- Hapus user  
- Role: Admin & Kasir  

---

## 🧱 Teknologi yang Digunakan

| Teknologi | Deskripsi |
|----------|-----------|
| **HTML5** | Struktur halaman |
| **Tailwind CSS (CDN)** | Styling cepat dan responsif |
| **JavaScript Vanilla** | Logic aplikasi & interaksi |
| **LocalStorage** | Menyimpan data produk, user, dan transaksi |
| **QR Code JS** | Generate QR untuk metode pembayaran QRIS |
| **GitHub Pages** | Hosting aplikasi secara gratis |

---

## 📂 Struktur Folder

```plaintext
A2R-Kasir/
│
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── auth.js
│       ├── users.js
│       ├── products.js
│       ├── transactions.js
│       ├── reports.js
│       ├── reports_advanced.js
│       ├── store.js
│       └── ui.js
│
├── libs/
│   └── qrcode.min.js
│
├── index.html        # Halaman login
└── app.html          # Dashboard & halaman utama kasir
