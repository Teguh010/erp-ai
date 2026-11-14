# Panduan Penggunaan ERP  
## Untuk karyawan baru — alur lengkap operasional

| | |
|---|---|
| **Dokumen** | NEW_EMPLOYEE_GUIDE |
| **Versi** | 1.0 |
| **Aplikasi** | AI-Powered ERP (Inventory, Production, Supply Chain, Sales) |
| **Audience** | Operator gudang, procurement, produksi, admin |
| **Bahasa** | Indonesia |

---

## Daftar isi

1. [Tujuan dokumen](#1-tujuan-dokumen)
2. [Cara membuka aplikasi](#2-cara-membuka-aplikasi)
3. [Login & peran pengguna](#3-login--peran-pengguna)
4. [Konsep penting (wajib dibaca)](#4-konsep-penting-wajib-dibaca)
5. [Peta menu](#5-peta-menu)
6. [Latihan hari 1 — alur cepat (data demo)](#6-latihan-hari-1--alur-cepat-data-demo)
7. [Latihan hari 2–4 — full flow dari produk jadi baru](#7-latihan-hari-24--full-flow-dari-produk-jadi-baru)
8. [Checklist verifikasi](#8-checklist-verifikasi)
9. [Masalah umum & solusi](#9-masalah-umum--solusi)
10. [Lampiran](#10-lampiran)

---

## 1. Tujuan dokumen

Dokumen ini menjelaskan **cara menggunakan aplikasi ERP dari nol**, termasuk:

- Memahami perbedaan **stok bahan** dan **stok produk jadi**
- Mengisi stok bahan (pembelian / input manual)
- Membuat **produk jadi**, **BOM (resep)**, dan **order produksi**
- Menjual produk jadi ke customer
- Memverifikasi semua perubahan lewat menu **Movements**

Setelah menyelesaikan panduan ini, karyawan baru dapat menjalankan **full flow** tanpa bantuan terus-menerus.

---

## 2. Cara membuka aplikasi

> **Untuk karyawan operasional:** URL dan akun biasanya diberikan oleh admin IT. Langkah teknis di bawah untuk admin/trainer.

**Alamat aplikasi (development / contoh):**

- **Web (dashboard):** `http://localhost:3001`
- **API / Swagger (admin):** `http://localhost:3000/docs`

**Login pertama:**

1. Buka alamat web di browser (Chrome/Edge disarankan).
2. Masuk halaman **Login**.
3. Gunakan akun yang diberikan admin (lihat [Lampiran](#10-lampiran)).

---

## 3. Login & peran pengguna

| Peran | Email (contoh demo) | Password | Kegunaan utama |
|--------|---------------------|----------|----------------|
| **Admin** | `admin@erp.com` | `password123` | Semua modul, master data |
| **Gudang** | `warehouse@erp.com` | `password123` | Stok, penerimaan barang |
| **Produksi** | `production@erp.com` | `password123` | BOM, order produksi |

**Rekomendasi pelatihan:** Hari pertama pakai akun **Admin**. Setelah paham alur, latihan dengan akun sesuai jabatan.

---

## 4. Konsep penting (wajib dibaca)

### 4.1 Stok bahan vs stok produk jadi

| Menu | Isi | Kategori produk |
|------|-----|-----------------|
| **Stok bahan** | Bahan baku, tambahan, kemasan | Bahan Baku, Bahan Tambahan, Kemasan |
| **Stok produk jadi** | Barang siap jual | Barang Jadi |

Keduanya memakai **database yang sama**; menu hanya **menyaring** jenis barang.

### 4.2 Stok **tidak** ditambah dari halaman “Stok”

Halaman **Stok bahan** / **Stok produk jadi** hanya **menampilkan jumlah**.

Stok berubah melalui:

| Cara | Dampak |
|------|--------|
| **Purchase Order → Received** | Stok **bahan** naik |
| **Movements → INBOUND / OUTBOUND / ADJUSTMENT** | Stok naik/turun manual |
| **Production → Start** | Stok **bahan** turun |
| **Production → Complete** | Stok **produk jadi** naik |
| **Sales → Shipped** | Stok **produk jadi** turun |
| **Seed / data awal** | Stok awal (hanya environment demo) |

### 4.3 Contoh: Kardus Box

- Terdaftar sebagai produk kategori **Kemasan**
- Muncul di **Stok bahan**
- Bisa bertambah lewat **PO** atau **Movements INBOUND**
- Berkurang saat **produksi** jika masuk BOM (mis. Krupuk Tempe)

---

## 5. Peta menu

| Ingin melakukan… | Sidebar → Menu |
|------------------|----------------|
| Lihat / tambah bahan | **Inventory** → Bahan & kemasan |
| Lihat / tambah produk jual | **Inventory** → Produk jadi |
| Lihat quantity per gudang | **Inventory** → Stok bahan / Stok produk jadi |
| Kelola gudang | **Inventory** → Warehouses |
| Koreksi / masuk-keluar manual | **Inventory** → Movements |
| Supplier & pembelian | **Supply Chain** → Suppliers, Purchase Orders |
| Resep produksi | **Production** → BOM |
| Perintah produksi | **Production** → Orders |
| Customer & penjualan | **Sales** → Customers, Orders |

---

## 6. Latihan hari 1 — alur cepat (data demo)

**Tujuan:** Memahami alur bisnis tanpa membuat produk baru.

**Prasyarat:** Database sudah di-**seed** (admin menjalankan `npx prisma db seed` di server development).

| No | Langkah | Detail |
|----|---------|--------|
| 1 | Login | `admin@erp.com` / `password123` |
| 2 | Stok bahan | Inventory → Stok bahan → perhatikan item seperti Kardus Box |
| 3 | Stok produk jadi | Inventory → Stok produk jadi → Krupuk Tempe, Sambel Bawang |
| 4 | BOM | Production → BOM → lihat resep Krupuk Tempe |
| 5 | Buat PO | Supply Chain → Purchase Orders → item Kardus Box +100 |
| 6 | Terima barang | Status: Approved → **Received** + pilih **gudang** |
| 7 | Verifikasi | Stok bahan Kardus Box naik; Movements ada **INBOUND** |
| 8 | Sales | Sales → Orders → buat order Krupuk Tempe |
| 9 | Kirim | Ubah status order menjadi **Shipped** |
| 10 | Verifikasi | Stok produk jadi turun; Movements ada **OUTBOUND** |

**Centang latihan hari 1:** ☐ PO diterima ☐ Stok bahan naik ☐ Sales shipped ☐ Stok jadi turun

---

## 7. Latihan hari 2–4 — full flow dari produk jadi baru

**Contoh produk:** *Keripik Singkong* (ganti nama sesuai kebutuhan latihan).

### 7.1 Siapkan gudang

1. Inventory → **Warehouses**
2. Pastikan ada gudang (mis. **Gudang Utama**)
3. Catat **ID gudang** jika diminta saat produksi (minta admin dari Prisma Studio atau dokumentasi internal)

### 7.2 Daftarkan bahan

1. Inventory → **Bahan & kemasan** → **Tambah**
2. Isi nama, kategori (Bahan Baku / Kemasan), satuan, harga beli
3. Ulangi untuk semua bahan yang dibutuhkan

### 7.3 Isi stok bahan

**Opsi A — Pembelian (disarankan):**

1. Supply Chain → **Suppliers** (pilih atau buat supplier)
2. **Purchase Orders** → buat PO → tambah item bahan + qty
3. **Approved** → **Received** + pilih gudang
4. Cek **Stok bahan** dan **Movements**

**Opsi B — Manual:**

1. Inventory → **Movements** → **New Movement** → **INBOUND**
2. Pilih produk bahan, gudang, quantity

### 7.4 Buat produk jadi

1. Inventory → **Produk jadi** → **Tambah produk jadi**
2. Kategori wajib: **Barang Jadi**
3. Isi harga beli & harga jual

### 7.5 Buat BOM (resep)

1. Production → **BOM** → buat BOM untuk produk jadi tadi
2. Tambah setiap **material** + **qty per batch**
3. Simpan

### 7.6 Order produksi

1. Production → **Orders** → **New Order**
2. Pilih produk / quantity sesuai layar
3. Simpan order

> **Catatan trainer:** Jika pembuatan order gagal atau tombol **Start** tidak muncul, minta admin membuat order lewat **Swagger** (`POST /production/orders` dengan `bomId`). Hubungi tim pengembangan untuk perbaikan UI.

### 7.7 Mulai produksi (bahan keluar)

1. Pada order: **Start** (status berubah ke dalam proses)
2. Masukkan **Warehouse ID** gudang bahan
3. Verifikasi: **Stok bahan** turun, **Movements** → PRODUCTION_USE

### 7.8 Selesaikan produksi (produk jadi masuk)

1. **Complete** pada order yang sedang berjalan
2. Masukkan **Warehouse ID** gudang barang jadi
3. Verifikasi: **Stok produk jadi** naik, **Movements** → PRODUCTION_FINISH

### 7.9 Penjualan

1. Sales → **Customers** → tambah customer bila perlu
2. Sales → **Orders** → buat order (produk jadi + qty + harga)
3. Ubah status hingga **Shipped**
4. Verifikasi: **Stok produk jadi** turun

---

## 8. Checklist verifikasi

Gunakan setelah setiap simulasi:

- [ ] Bahan terdaftar di **Bahan & kemasan**
- [ ] **Stok bahan** mencukupi untuk BOM
- [ ] Produk jadi terdaftar dengan kategori **Barang Jadi**
- [ ] **BOM** lengkap
- [ ] Produksi **Complete**
- [ ] **Stok produk jadi** sesuai ekspektasi
- [ ] Sales **Shipped**
- [ ] **Movements** menampilkan jejak lengkap

---

## 9. Masalah umum & solusi

| Gejala | Kemungkinan penyebab | Tindakan |
|--------|----------------------|----------|
| Produk baru tidak muncul di Stok | Belum ada transaksi stok | PO Received / Movement / Produksi |
| Tombol Start produksi tidak ada | Ketidaksesuaian status di UI | Hubungi admin; gunakan Swagger |
| Diminta Warehouse ID | UI meminta ID teknis | Minta admin salin ID gudang |
| Create production gagal | Data BOM / bomId | Pastikan BOM ada; cek Swagger |
| Stok tidak turun saat jual | Status belum Shipped | Update status sales order |
| Login gagal | API mati / CORS / akun salah | Hubungi IT |

---

## 10. Lampiran

### A. Akun demo (setelah seed)

```
Admin:      admin@erp.com      / password123
Gudang:     warehouse@erp.com  / password123
Produksi:   production@erp.com / password123
```

### B. Alur bisnis (ringkas)

```
Supplier → PO → Terima barang → Stok bahan ↑
     → BOM + Produksi → Stok bahan ↓, Stok jadi ↑
     → Sales Shipped → Stok jadi ↓
```

### C. Kontak

| Peran | Tanggung jawab |
|-------|----------------|
| Admin IT | Akses, URL, reset password |
| Trainer / Supervisor | SOP proses pabrik |
| Tim pengembangan | Bug aplikasi |

---

**Akhir dokumen**

*Dokumen ini dapat dilampirkan di Trello (PDF atau Markdown). Untuk versi PDF, lihat [`HOW_TO_EXPORT_PDF.md`](./HOW_TO_EXPORT_PDF.md).*