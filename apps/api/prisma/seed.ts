import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed (Pabrik Makanan Ringan)...');

  // ==================== ROLES ====================
  const roles = [
    { name: 'ADMIN', permissions: { all: true } },
    {
      name: 'WAREHOUSE_MANAGER',
      permissions: { inventory: true, stock: true },
    },
    {
      name: 'PRODUCTION_MANAGER',
      permissions: { production: true, bom: true },
    },
    {
      name: 'PROCUREMENT',
      permissions: { suppliers: true, purchaseOrders: true },
    },
    { name: 'ANALYST', permissions: { reports: true, ai: true } },
    { name: 'USER', permissions: { read: true } },
  ];

  console.log('Creating roles...');
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: role,
    });
  }

  // ==================== USERS ====================
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const warehouseRole = await prisma.role.findUnique({
    where: { name: 'WAREHOUSE_MANAGER' },
  });
  const productionRole = await prisma.role.findUnique({
    where: { name: 'PRODUCTION_MANAGER' },
  });

  const users = [
    { email: 'admin@erp.com', fullName: 'System Admin', roleId: adminRole!.id },
    {
      email: 'warehouse@erp.com',
      fullName: 'Warehouse Manager',
      roleId: warehouseRole!.id,
    },
    {
      email: 'production@erp.com',
      fullName: 'Production Manager',
      roleId: productionRole!.id,
    },
  ];

  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { passwordHash: hashedPassword },
      create: { ...user, passwordHash: hashedPassword },
    });
  }

  // ==================== WAREHOUSES ====================
  const warehouses = [
    { name: 'Gudang Bahan Baku', location: 'Jakarta, Indonesia' },
    { name: 'Gudang Produksi', location: 'Area Pabrik, Jakarta' },
    { name: 'Gudang Barang Jadi', location: 'Jakarta, Indonesia' },
  ];

  console.log('Creating warehouses...');
  const warehouseMap: Record<string, string> = {};
  for (const wh of warehouses) {
    const existing = await prisma.warehouse.findFirst({
      where: { name: wh.name },
    });
    const warehouse = existing
      ? await prisma.warehouse.update({
          where: { id: existing.id },
          data: { location: wh.location },
        })
      : await prisma.warehouse.create({
          data: wh,
        });
    warehouseMap[wh.name] = warehouse.id;
  }
  const allWarehouses = await prisma.warehouse.findMany();
  allWarehouses.forEach((w) => (warehouseMap[w.name] = w.id));

  // ==================== CLEAR PRODUCT-RELATED DATA (untuk ganti dengan data makanan ringan) ====================
  console.log('Clearing existing product-related data...');
  await prisma.productionOrder.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.stock.deleteMany({});
  await prisma.bOMItem.deleteMany({});
  await prisma.billOfMaterials.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.salesOrderItem.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});

  // ==================== CATEGORIES (Pabrik Makanan Ringan) ====================
  const categoryNames = [
    'Bahan Baku',
    'Bahan Tambahan',
    'Kemasan',
    'Barang Jadi',
    // Sesuai sheet Excel client: Stock Kardus, Plastik, OXY, Solasi, Bumbu
    'Kardus',
    'Plastik',
    'OXY',
    'Solasi',
    'Bumbu',
  ];

  console.log('Creating categories...');
  const categoryMap: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.create({
      data: { name },
    });
    categoryMap[name] = cat.id;
  }

  // ==================== PRODUCTS (realistik: krupuk, sambal, keripik; satuan kg, g, karton, pcs, liter, dll) ====================
  const products: Array<{
    sku: string;
    name: string;
    categoryId: string;
    unit: string;
    purchasePrice: number;
    salePrice: number;
    minStockLevel: number;
    description?: string;
  }> = [
    // --- Bahan Baku ---
    {
      sku: 'BB-001',
      name: 'Tepung Tapioka',
      categoryId: categoryMap['Bahan Baku'],
      unit: 'KG',
      purchasePrice: 8500,
      salePrice: 0,
      minStockLevel: 500,
      description: 'Tepung tapioka untuk krupuk dan keripik',
    },
    {
      sku: 'BB-002',
      name: 'Tepung Terigu',
      categoryId: categoryMap['Bahan Baku'],
      unit: 'KG',
      purchasePrice: 12000,
      salePrice: 0,
      minStockLevel: 300,
    },
    {
      sku: 'BB-003',
      name: 'Singkong Kupas',
      categoryId: categoryMap['Bahan Baku'],
      unit: 'KG',
      purchasePrice: 4000,
      salePrice: 0,
      minStockLevel: 200,
    },
    {
      sku: 'BB-004',
      name: 'Kentang',
      categoryId: categoryMap['Bahan Baku'],
      unit: 'KG',
      purchasePrice: 8000,
      salePrice: 0,
      minStockLevel: 150,
    },
    {
      sku: 'BB-005',
      name: 'Minyak Goreng',
      categoryId: categoryMap['Bahan Baku'],
      unit: 'LITER',
      purchasePrice: 18000,
      salePrice: 0,
      minStockLevel: 100,
    },
    // --- Bahan Tambahan ---
    {
      sku: 'BT-001',
      name: 'Garam',
      categoryId: categoryMap['Bahan Tambahan'],
      unit: 'KG',
      purchasePrice: 3000,
      salePrice: 0,
      minStockLevel: 50,
    },
    {
      sku: 'BT-002',
      name: 'Gula Pasir',
      categoryId: categoryMap['Bahan Tambahan'],
      unit: 'KG',
      purchasePrice: 14000,
      salePrice: 0,
      minStockLevel: 100,
    },
    {
      sku: 'BT-003',
      name: 'Bumbu Krupuk',
      categoryId: categoryMap['Bahan Tambahan'],
      unit: 'KG',
      purchasePrice: 45000,
      salePrice: 0,
      minStockLevel: 20,
    },
    {
      sku: 'BT-004',
      name: 'Udang Bubuk',
      categoryId: categoryMap['Bahan Tambahan'],
      unit: 'KG',
      purchasePrice: 120000,
      salePrice: 0,
      minStockLevel: 10,
    },
    {
      sku: 'BT-005',
      name: 'Terasi',
      categoryId: categoryMap['Bahan Tambahan'],
      unit: 'KG',
      purchasePrice: 85000,
      salePrice: 0,
      minStockLevel: 15,
    },
    {
      sku: 'BT-006',
      name: 'Cabai Kering',
      categoryId: categoryMap['Bahan Tambahan'],
      unit: 'KG',
      purchasePrice: 65000,
      salePrice: 0,
      minStockLevel: 25,
    },
    {
      sku: 'BT-007',
      name: 'Bawang Putih Bubuk',
      categoryId: categoryMap['Bahan Tambahan'],
      unit: 'KG',
      purchasePrice: 95000,
      salePrice: 0,
      minStockLevel: 15,
    },
    {
      sku: 'BT-008',
      name: 'Tomat Segar',
      categoryId: categoryMap['Bahan Tambahan'],
      unit: 'KG',
      purchasePrice: 8000,
      salePrice: 0,
      minStockLevel: 30,
    },
    {
      sku: 'BT-009',
      name: 'Vetsin (MSG)',
      categoryId: categoryMap['Bahan Tambahan'],
      unit: 'KG',
      purchasePrice: 25000,
      salePrice: 0,
      minStockLevel: 20,
    },
    // --- Kemasan ---
    {
      sku: 'KMS-001',
      name: 'Plastik PE 200g',
      categoryId: categoryMap['Kemasan'],
      unit: 'PCS',
      purchasePrice: 150,
      salePrice: 0,
      minStockLevel: 5000,
      description: 'Kemasan plastik untuk krupuk/keripik 200g',
    },
    {
      sku: 'KMS-002',
      name: 'Plastik PE 100g',
      categoryId: categoryMap['Kemasan'],
      unit: 'PCS',
      purchasePrice: 80,
      salePrice: 0,
      minStockLevel: 8000,
    },
    {
      sku: 'KMS-003',
      name: 'Botol Sambal 300ml',
      categoryId: categoryMap['Kemasan'],
      unit: 'PCS',
      purchasePrice: 1200,
      salePrice: 0,
      minStockLevel: 2000,
    },
    {
      sku: 'KMS-004',
      name: 'Tutup Botol Sambal',
      categoryId: categoryMap['Kemasan'],
      unit: 'PCS',
      purchasePrice: 200,
      salePrice: 0,
      minStockLevel: 2500,
    },
    {
      sku: 'KMS-005',
      name: 'Karton Dus (24 pcs)',
      categoryId: categoryMap['Kemasan'],
      unit: 'KARTON',
      purchasePrice: 8500,
      salePrice: 0,
      minStockLevel: 200,
      description: 'Dus karton isi 24 kemasan',
    },
    {
      sku: 'KMS-006',
      name: 'Label Krupuk Udang',
      categoryId: categoryMap['Kemasan'],
      unit: 'PCS',
      purchasePrice: 25,
      salePrice: 0,
      minStockLevel: 10000,
    },
    {
      sku: 'KMS-007',
      name: 'Label Sambal Terasi',
      categoryId: categoryMap['Kemasan'],
      unit: 'PCS',
      purchasePrice: 30,
      salePrice: 0,
      minStockLevel: 5000,
    },
    {
      sku: 'KMS-008',
      name: 'Label Keripik Singkong',
      categoryId: categoryMap['Kemasan'],
      unit: 'PCS',
      purchasePrice: 20,
      salePrice: 0,
      minStockLevel: 15000,
    },
    // --- Barang Jadi ---
    {
      sku: 'BJ-001',
      name: 'Krupuk Udang 200g',
      categoryId: categoryMap['Barang Jadi'],
      unit: 'PCS',
      purchasePrice: 0,
      salePrice: 8500,
      minStockLevel: 500,
      description: 'Krupuk rasa udang, kemasan 200g',
    },
    {
      sku: 'BJ-002',
      name: 'Krupuk Ikan 200g',
      categoryId: categoryMap['Barang Jadi'],
      unit: 'PCS',
      purchasePrice: 0,
      salePrice: 7500,
      minStockLevel: 500,
    },
    {
      sku: 'BJ-003',
      name: 'Sambal Terasi Botol 300ml',
      categoryId: categoryMap['Barang Jadi'],
      unit: 'PCS',
      purchasePrice: 0,
      salePrice: 12500,
      minStockLevel: 200,
    },
    {
      sku: 'BJ-004',
      name: 'Keripik Singkong Original 100g',
      categoryId: categoryMap['Barang Jadi'],
      unit: 'PCS',
      purchasePrice: 0,
      salePrice: 5500,
      minStockLevel: 800,
    },
    {
      sku: 'BJ-005',
      name: 'Keripik Kentang 150g',
      categoryId: categoryMap['Barang Jadi'],
      unit: 'PCS',
      purchasePrice: 0,
      salePrice: 7500,
      minStockLevel: 400,
    },
    {
      sku: 'BJ-006',
      name: 'Krupuk Udang (Karton 24 pcs)',
      categoryId: categoryMap['Barang Jadi'],
      unit: 'KARTON',
      purchasePrice: 0,
      salePrice: 192000,
      minStockLevel: 50,
      description: 'Karton isi 24 kemasan 200g',
    },
  ];

  console.log('Creating products...');
  const productMap: Record<string, string> = {};
  for (const product of products) {
    const p = await prisma.product.create({
      data: product,
    });
    productMap[product.sku] = p.id;
  }

  // ==================== INITIAL STOCK ====================
  const gudangBaku = warehouseMap['Gudang Bahan Baku'] ?? allWarehouses[0]?.id;
  const gudangProduksi = warehouseMap['Gudang Produksi'] ?? allWarehouses[1]?.id;
  const gudangJadi = warehouseMap['Gudang Barang Jadi'] ?? allWarehouses[2]?.id;

  console.log('Creating initial stock...');
  const stockData: Array<{ productId: string; warehouseId: string; quantity: number }> = [];

  if (gudangBaku) {
    [
      { sku: 'BB-001', qty: 2000 },
      { sku: 'BB-002', qty: 800 },
      { sku: 'BB-003', qty: 500 },
      { sku: 'BB-004', qty: 300 },
      { sku: 'BB-005', qty: 400 },
      { sku: 'BT-001', qty: 100 },
      { sku: 'BT-002', qty: 200 },
      { sku: 'BT-003', qty: 50 },
      { sku: 'BT-004', qty: 25 },
      { sku: 'BT-005', qty: 30 },
      { sku: 'BT-006', qty: 50 },
      { sku: 'BT-007', qty: 20 },
      { sku: 'BT-008', qty: 100 },
      { sku: 'BT-009', qty: 40 },
    ].forEach(({ sku, qty }) => {
      if (productMap[sku]) stockData.push({ productId: productMap[sku], warehouseId: gudangBaku, quantity: qty });
    });
  }

  if (gudangProduksi) {
    [
      { sku: 'KMS-001', qty: 10000 },
      { sku: 'KMS-002', qty: 15000 },
      { sku: 'KMS-003', qty: 5000 },
      { sku: 'KMS-004', qty: 5500 },
      { sku: 'KMS-005', qty: 500 },
      { sku: 'KMS-006', qty: 20000 },
      { sku: 'KMS-007', qty: 10000 },
      { sku: 'KMS-008', qty: 25000 },
    ].forEach(({ sku, qty }) => {
      if (productMap[sku]) stockData.push({ productId: productMap[sku], warehouseId: gudangProduksi, quantity: qty });
    });
  }

  if (gudangJadi) {
    [
      { sku: 'BJ-001', qty: 1200 },
      { sku: 'BJ-002', qty: 800 },
      { sku: 'BJ-003', qty: 600 },
      { sku: 'BJ-004', qty: 2000 },
      { sku: 'BJ-005', qty: 1000 },
      { sku: 'BJ-006', qty: 80 },
    ].forEach(({ sku, qty }) => {
      if (productMap[sku]) stockData.push({ productId: productMap[sku], warehouseId: gudangJadi, quantity: qty });
    });
  }

  for (const s of stockData) {
    await prisma.stock.create({
      data: { ...s, reservedQty: 0 },
    });
  }

  // ==================== SUPPLIERS (pemasok bahan makanan) ====================
  const suppliers = [
    { name: 'PT Tepung Indo', contact: '+62-21-5551234', email: 'sales@tepungindo.co.id' },
    { name: 'CV Bumbu Nusantara', contact: '+62-21-5555678', email: 'order@bumbunusantara.id' },
    { name: 'UD Kemasan Sejahtera', contact: '+62-21-5559012', email: 'info@kemasansejahtera.co.id' },
  ];

  console.log('Creating suppliers...');
  for (const supplier of suppliers) {
    const existing = await prisma.supplier.findFirst({
      where: { email: supplier.email },
    });
    if (!existing) {
      await prisma.supplier.create({
        data: supplier,
      });
    }
  }

  // ==================== BILL OF MATERIALS (BOM) ====================
  console.log('Creating BOMs...');

  // BOM Krupuk Udang 200g (per 1 pcs kemasan): tepung tapioka, udang bubuk, bumbu, garam, minyak, plastik, label
  if (productMap['BJ-001'] && productMap['BB-001'] && productMap['BT-004'] && productMap['BT-003'] && productMap['BT-001'] && productMap['BB-005'] && productMap['KMS-001'] && productMap['KMS-006']) {
    await prisma.billOfMaterials.create({
      data: {
        productId: productMap['BJ-001'],
        items: {
          create: [
            { materialId: productMap['BB-001'], quantity: 80 },   // 80g tepung (dalam gram nanti bisa konversi, di sini satuan minimal 1 = 1 unit)
            { materialId: productMap['BT-004'], quantity: 5 },
            { materialId: productMap['BT-003'], quantity: 3 },
            { materialId: productMap['BT-001'], quantity: 2 },
            { materialId: productMap['BB-005'], quantity: 1 },   // 1 = 0.1 L atau sesuaikan skala
            { materialId: productMap['KMS-001'], quantity: 1 },
            { materialId: productMap['KMS-006'], quantity: 1 },
          ],
        },
      },
    });
  }

  // BOM Sambal Terasi 300ml
  if (productMap['BJ-003'] && productMap['BT-005'] && productMap['BT-006'] && productMap['BT-007'] && productMap['BT-008'] && productMap['BT-001'] && productMap['BT-002'] && productMap['BT-009'] && productMap['KMS-003'] && productMap['KMS-004'] && productMap['KMS-007']) {
    await prisma.billOfMaterials.create({
      data: {
        productId: productMap['BJ-003'],
        items: {
          create: [
            { materialId: productMap['BT-005'], quantity: 2 },
            { materialId: productMap['BT-006'], quantity: 3 },
            { materialId: productMap['BT-007'], quantity: 1 },
            { materialId: productMap['BT-008'], quantity: 15 },
            { materialId: productMap['BT-001'], quantity: 1 },
            { materialId: productMap['BT-002'], quantity: 2 },
            { materialId: productMap['BT-009'], quantity: 1 },
            { materialId: productMap['KMS-003'], quantity: 1 },
            { materialId: productMap['KMS-004'], quantity: 1 },
            { materialId: productMap['KMS-007'], quantity: 1 },
          ],
        },
      },
    });
  }

  // BOM Keripik Singkong Original 100g
  if (productMap['BJ-004'] && productMap['BB-003'] && productMap['BB-005'] && productMap['BT-001'] && productMap['BT-003'] && productMap['KMS-002'] && productMap['KMS-008']) {
    await prisma.billOfMaterials.create({
      data: {
        productId: productMap['BJ-004'],
        items: {
          create: [
            { materialId: productMap['BB-003'], quantity: 120 },  // singkong kupas (gram equivalent)
            { materialId: productMap['BB-005'], quantity: 1 },
            { materialId: productMap['BT-001'], quantity: 1 },
            { materialId: productMap['BT-003'], quantity: 1 },
            { materialId: productMap['KMS-002'], quantity: 1 },
            { materialId: productMap['KMS-008'], quantity: 1 },
          ],
        },
      },
    });
  }

  // ==================== AI DOCUMENTS ====================
  console.log('Creating sample AI documents...');
  const sampleDocs = [
    {
      title: 'SOP Gudang Pabrik Makanan Ringan',
      content: `SOP Gudang - Pabrik Makanan Ringan

1. Penerimaan Bahan Baku
- Semua bahan (tepung, bumbu, kemasan) dicek suhu dan tanggal kadaluarsa
- Bahan basah (singkong, kentang, tomat) masuk cold storage atau diproses hari yang sama
- Pencatatan stok maksimal 2 jam setelah barang diterima

2. Pengeluaran ke Produksi
- Surat permintaan produksi (BOM) wajib sebelum pengambilan bahan
- FIFO wajib untuk bahan yang punya tanggal kadaluarsa
- Satuan: KG, G, LITER, PCS, KARTON sesuai master produk

3. Stok Barang Jadi
- Barang jadi (krupuk, sambal, keripik) setelah QC baru masuk gudang barang jadi
- Minimum stok per SKU sesuai setting (reorder level)
- Penyaluran ke distributor dalam satuan KARTON atau PCS`,
    },
    {
      title: 'Pedoman Produksi Makanan Ringan',
      content: `Pedoman Produksi - Krupuk, Sambal, Keripik

1. Jadwal Produksi
- Rencana produksi mingguan berdasarkan permintaan dan stok bahan
- BOM (Bill of Materials) per SKU harus selalu mutakhir
- Satuan produksi: PCS (kemasan 100g/200g/300ml) atau KARTON (isi 24)

2. Bahan dan Kemasan
- Bahan baku: tepung (KG), singkong/kentang (KG), minyak (LITER)
- Bahan tambahan: bumbu, garam, gula (KG)
- Kemasan: plastik (PCS), botol (PCS), karton dus (KARTON), label (PCS)

3. QC dan Pengemasan
- Cek rasa dan kerenyahan sebelum packing
- Label harus sesuai SKU dan batch
- Reject tidak boleh masuk gudang barang jadi`,
    },
  ];

  for (const doc of sampleDocs) {
    const existing = await prisma.aIDocument.findFirst({
      where: { title: doc.title },
    });
    if (!existing) {
      await prisma.aIDocument.create({
        data: doc,
      });
    }
  }

  // ==================== CUSTOMERS ====================
  console.log('Creating customers...');
  const customers = [
    { name: 'PT Maju Bersama', email: 'purchasing@majubersama.co.id', phone: '+62-21-7771234' },
    { name: 'CV Sukses Mandiri', email: 'order@suksesmandiri.com', phone: '+62-22-8881234' },
    { name: 'UD Jaya Abadi', email: 'info@jayaabadi.id', phone: '+62-31-9991234' },
  ];

  for (const customer of customers) {
    const existing = await prisma.customer.findFirst({
      where: { email: customer.email },
    });
    if (!existing) {
      await prisma.customer.create({
        data: customer,
      });
    }
  }

  console.log('');
  console.log('✅ Seed completed (Pabrik Makanan Ringan)!');
  console.log('');
  console.log('📋 Akun tes:');
  console.log('   Admin: admin@erp.com / password123');
  console.log('   Gudang: warehouse@erp.com / password123');
  console.log('   Produksi: production@erp.com / password123');
  console.log('');
  console.log('📦 Kategori: Bahan Baku, Bahan Tambahan, Kemasan, Barang Jadi');
  console.log('📐 Satuan: KG, G, LITER, PCS, KARTON');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
