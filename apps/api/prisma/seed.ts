import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

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

  // ==================== CATEGORIES ====================
  const categories = [
    'Raw Materials',
    'Components',
    'Finished Goods',
    'Packaging',
    'Consumables',
  ];

  console.log('Creating categories...');
  const categoryMap: Record<string, string> = {};
  for (const name of categories) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryMap[name] = cat.id;
  }

  // ==================== WAREHOUSES ====================
  const warehouses = [
    { name: 'Main Warehouse', location: 'Jakarta, Indonesia' },
    { name: 'Production Storage', location: 'Bandung, Indonesia' },
    { name: 'Distribution Center', location: 'Surabaya, Indonesia' },
  ];

  console.log('Creating warehouses...');
  const warehouseMap: Record<string, string> = {};
  for (const wh of warehouses) {
    const warehouse = await prisma.warehouse.upsert({
      where: { id: wh.name.toLowerCase().replace(/ /g, '-') },
      update: {},
      create: wh,
    });
    warehouseMap[wh.name] = warehouse.id;
  }
  const allWarehouses = await prisma.warehouse.findMany();
  allWarehouses.forEach((w) => (warehouseMap[w.name] = w.id));

  // ==================== PRODUCTS ====================
  const products = [
    {
      sku: 'RAW-001',
      name: 'Steel Sheet',
      categoryId: categoryMap['Raw Materials'],
      unit: 'KG',
      purchasePrice: 15000,
      salePrice: 18000,
      minStockLevel: 100,
    },
    {
      sku: 'RAW-002',
      name: 'Aluminum Rod',
      categoryId: categoryMap['Raw Materials'],
      unit: 'PCS',
      purchasePrice: 25000,
      salePrice: 30000,
      minStockLevel: 50,
    },
    {
      sku: 'RAW-003',
      name: 'Plastic Pellets',
      categoryId: categoryMap['Raw Materials'],
      unit: 'KG',
      purchasePrice: 8000,
      salePrice: 10000,
      minStockLevel: 200,
    },
    {
      sku: 'COMP-001',
      name: 'Electric Motor',
      categoryId: categoryMap['Components'],
      unit: 'PCS',
      purchasePrice: 150000,
      salePrice: 180000,
      minStockLevel: 20,
    },
    {
      sku: 'COMP-002',
      name: 'Control Board',
      categoryId: categoryMap['Components'],
      unit: 'PCS',
      purchasePrice: 75000,
      salePrice: 95000,
      minStockLevel: 30,
    },
    {
      sku: 'COMP-003',
      name: 'Gear Set',
      categoryId: categoryMap['Components'],
      unit: 'SET',
      purchasePrice: 45000,
      salePrice: 55000,
      minStockLevel: 40,
    },
    {
      sku: 'FIN-001',
      name: 'Industrial Fan',
      categoryId: categoryMap['Finished Goods'],
      unit: 'PCS',
      purchasePrice: 350000,
      salePrice: 450000,
      minStockLevel: 10,
    },
    {
      sku: 'FIN-002',
      name: 'Water Pump',
      categoryId: categoryMap['Finished Goods'],
      unit: 'PCS',
      purchasePrice: 280000,
      salePrice: 380000,
      minStockLevel: 15,
    },
    {
      sku: 'FIN-003',
      name: 'Air Compressor',
      categoryId: categoryMap['Finished Goods'],
      unit: 'PCS',
      purchasePrice: 500000,
      salePrice: 650000,
      minStockLevel: 8,
    },
    {
      sku: 'PKG-001',
      name: 'Cardboard Box Large',
      categoryId: categoryMap['Packaging'],
      unit: 'PCS',
      purchasePrice: 5000,
      salePrice: 7000,
      minStockLevel: 500,
    },
    {
      sku: 'PKG-002',
      name: 'Bubble Wrap Roll',
      categoryId: categoryMap['Packaging'],
      unit: 'ROLL',
      purchasePrice: 25000,
      salePrice: 35000,
      minStockLevel: 100,
    },
  ];

  console.log('Creating products...');
  const productMap: Record<string, string> = {};
  for (const product of products) {
    const p = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
    productMap[product.sku] = p.id;
  }

  // ==================== INITIAL STOCK ====================
  console.log('Creating initial stock...');
  const mainWarehouseId = allWarehouses[0]?.id;
  if (mainWarehouseId) {
    const stockData = [
      { productId: productMap['RAW-001'], quantity: 500 },
      { productId: productMap['RAW-002'], quantity: 200 },
      { productId: productMap['RAW-003'], quantity: 1000 },
      { productId: productMap['COMP-001'], quantity: 50 },
      { productId: productMap['COMP-002'], quantity: 80 },
      { productId: productMap['COMP-003'], quantity: 100 },
      { productId: productMap['FIN-001'], quantity: 25 },
      { productId: productMap['FIN-002'], quantity: 30 },
      { productId: productMap['PKG-001'], quantity: 1000 },
    ];

    for (const stock of stockData) {
      if (stock.productId) {
        await prisma.stock.upsert({
          where: {
            productId_warehouseId: {
              productId: stock.productId,
              warehouseId: mainWarehouseId,
            },
          },
          update: { quantity: stock.quantity },
          create: {
            productId: stock.productId,
            warehouseId: mainWarehouseId,
            quantity: stock.quantity,
            reservedQty: 0,
          },
        });
      }
    }
  }

  // ==================== SUPPLIERS ====================
  const suppliers = [
    {
      name: 'Steel Corp Indonesia',
      contact: '+62-21-5551234',
      email: 'sales@steelcorp.id',
    },
    {
      name: 'Component Masters',
      contact: '+62-21-5555678',
      email: 'order@componentmasters.com',
    },
    {
      name: 'Packaging Solutions',
      contact: '+62-21-5559012',
      email: 'info@packagingsolutions.id',
    },
  ];

  console.log('Creating suppliers...');
  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { id: supplier.email },
      update: {},
      create: supplier,
    });
  }

  // ==================== BILL OF MATERIALS ====================
  console.log('Creating BOMs...');

  // BOM for Industrial Fan (FIN-001)
  if (
    productMap['FIN-001'] &&
    productMap['COMP-001'] &&
    productMap['COMP-003']
  ) {
    const existingBom = await prisma.billOfMaterials.findUnique({
      where: { productId: productMap['FIN-001'] },
    });

    if (!existingBom) {
      await prisma.billOfMaterials.create({
        data: {
          productId: productMap['FIN-001'],
          items: {
            create: [
              { materialId: productMap['COMP-001'], quantity: 1 },
              { materialId: productMap['COMP-003'], quantity: 2 },
              { materialId: productMap['RAW-001'], quantity: 5 },
            ],
          },
        },
      });
    }
  }

  // ==================== AI DOCUMENTS ====================
  console.log('Creating sample AI documents...');
  const sampleDocs = [
    {
      title: 'Inventory Management SOP',
      content: `Standard Operating Procedure for Inventory Management

1. Stock Receiving
- All incoming goods must be inspected within 24 hours
- Quality check must be performed before acceptance
- Update system within 2 hours of receipt

2. Stock Issuance
- All issuances require approved requisition form
- FIFO method must be followed
- Update system immediately after issuance

3. Stock Counting
- Cycle count must be performed weekly
- Full inventory count quarterly
- Discrepancies must be reported within 24 hours

4. Minimum Stock Levels
- System will alert when stock falls below minimum
- Reorder point = Lead time demand + Safety stock
- Review and adjust levels quarterly`,
    },
    {
      title: 'Production Planning Guidelines',
      content: `Production Planning Guidelines

1. Production Scheduling
- Weekly production schedule released every Friday
- Consider material availability and machine capacity
- Allow 10% buffer for unexpected delays

2. Material Requirements
- Check BOM accuracy before production start
- Reserve materials 2 days before production
- Report shortages immediately

3. Quality Control
- In-process inspection at each stage
- Final inspection before packaging
- Non-conforming products must be segregated

4. Production Reporting
- Daily production report by 6 PM
- Include output quantity, rejects, and downtime
- Report machine issues immediately`,
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
    {
      name: 'PT Maju Bersama',
      email: 'purchasing@majubersama.co.id',
      phone: '+62-21-7771234',
    },
    {
      name: 'CV Sukses Mandiri',
      email: 'order@suksesmandiri.com',
      phone: '+62-22-8881234',
    },
    {
      name: 'UD Jaya Abadi',
      email: 'info@jayaabadi.id',
      phone: '+62-31-9991234',
    },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.email },
      update: {},
      create: customer,
    });
  }

  console.log('');
  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📋 Test Accounts:');
  console.log('   Admin: admin@erp.com / password123');
  console.log('   Warehouse: warehouse@erp.com / password123');
  console.log('   Production: production@erp.com / password123');
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
