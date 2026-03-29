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

  // ==================== CLEAR PRODUCT-RELATED DATA ====================
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
  await prisma.unit.deleteMany({});

  // ==================== UNITS ====================
  const unitNames = ['Karton', 'Kg', 'Pcs', 'Liter', 'Gram'];

  console.log('Creating units...');
  const unitMap: Record<string, string> = {};
  for (const name of unitNames) {
    const u = await prisma.unit.create({ data: { name } });
    unitMap[name] = u.id;
  }

  // ==================== CATEGORIES ====================
  const categoryNames = [
    'Barang Jadi',
    'Bahan Baku',
    'Bahan Tambahan',
    'Kemasan',
  ];

  console.log('Creating categories...');
  const categoryMap: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.create({ data: { name } });
    categoryMap[name] = cat.id;
  }

  // ==================== PRODUCTS ====================
  console.log('Creating products...');
  const products = [
    {
      name: 'Sambel Bawang',
      categoryId: categoryMap['Barang Jadi'],
      unitId: unitMap['Karton'],
      purchasePrice: 80000,
      salePrice: 120000,
    },
    {
      name: 'Krupuk Tempe',
      categoryId: categoryMap['Barang Jadi'],
      unitId: unitMap['Karton'],
      purchasePrice: 60000,
      salePrice: 90000,
    },
  ];

  const productMap: Record<string, string> = {};
  for (const product of products) {
    const p = await prisma.product.create({ data: product });
    productMap[product.name] = p.id;
  }

  // ==================== INITIAL STOCK ====================
  const gudangJadi = warehouseMap['Gudang Barang Jadi'] ?? allWarehouses[0]?.id;

  console.log('Creating initial stock...');
  if (gudangJadi) {
    for (const [name, productId] of Object.entries(productMap)) {
      await prisma.stock.create({
        data: { productId, warehouseId: gudangJadi, quantity: 100, reservedQty: 0 },
      });
    }
  }

  // ==================== SUPPLIERS ====================
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
      await prisma.supplier.create({ data: supplier });
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
      await prisma.customer.create({ data: customer });
    }
  }

  // ==================== AI DOCUMENTS ====================
  console.log('Creating sample AI documents...');
  const sampleDocs = [
    {
      title: 'SOP Gudang Pabrik Makanan Ringan',
      content: `SOP Gudang - Pabrik Makanan Ringan

1. Penerimaan Bahan Baku
- Semua bahan dicek kondisi dan tanggal kadaluarsa
- Pencatatan stok maksimal 2 jam setelah barang diterima

2. Pengeluaran ke Produksi
- Surat permintaan produksi (BOM) wajib sebelum pengambilan bahan
- FIFO wajib untuk bahan yang punya tanggal kadaluarsa
- Satuan: Karton, Kg, Pcs, Liter sesuai master produk

3. Stok Barang Jadi
- Barang jadi setelah QC baru masuk gudang barang jadi
- Penyaluran ke distributor dalam satuan Karton`,
    },
  ];

  for (const doc of sampleDocs) {
    const existing = await prisma.aIDocument.findFirst({
      where: { title: doc.title },
    });
    if (!existing) {
      await prisma.aIDocument.create({ data: doc });
    }
  }

  console.log('');
  console.log('✅ Seed completed!');
  console.log('');
  console.log('📋 Akun tes:');
  console.log('   Admin: admin@erp.com / password123');
  console.log('   Gudang: warehouse@erp.com / password123');
  console.log('   Produksi: production@erp.com / password123');
  console.log('');
  console.log('📦 Produk: Sambel Bawang, Krupuk Tempe (satuan: Karton)');
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
