# Cheat sheet onboarding ERP (1 halaman)

## Login (demo)

`admin@erp.com` / `password123` · Web: `localhost:3001`

## Stok naik / turun

| Aksi | Menu |
|------|------|
| Bahan ↑ | Supply Chain → PO → **Received** |
| Bahan ↑ manual | Inventory → Movements → **INBOUND** |
| Bahan ↓ | Production → **Start** |
| Produk jadi ↑ | Production → **Complete** |
| Produk jadi ↓ | Sales → **Shipped** |

**Stok bahan / Stok jadi** = hanya lihat qty, bukan input.

## Full flow produk baru

1. Bahan & kemasan → tambah bahan  
2. PO atau Movements → stok bahan OK  
3. Produk jadi → tambah item  
4. Production → BOM  
5. Production → Orders → Start → Complete  
6. Sales → Order → Shipped  
7. Cek **Movements**

## Hari 1 (pakai seed)

PO Kardus Box → Received → Sales Krupuk Tempe → Shipped

## Bantuan

Bug UI produksi / Warehouse ID → admin + Swagger `/docs`

Panduan lengkap: [`NEW_EMPLOYEE_GUIDE.md`](./NEW_EMPLOYEE_GUIDE.md)