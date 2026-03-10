import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient();

async function main() {
  const roles = ['ADMIN', 'WAREHOUSE_MANAGER', 'SUPPLIER', 'USER'];

  for (const roleName of roles) {
    await (prisma as any).role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  const adminPassword = 'admin_password123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminRole = await (prisma as any).role.findUnique({ where: { name: 'ADMIN' } });

  if (!adminRole) {
    throw new Error('ADMIN role not found. Ensure roles are created first.');
  }

  await (prisma as any).user.upsert({
    where: { email: 'admin@erp.com' },
    update: {},
    create: {
      email: 'admin@erp.com',
      fullName: 'System Admin',
      passwordHash: hashedPassword,
      roleId: adminRole.id,
    },
  });

  console.log('Seed completed successfully.');
  console.log('Admin User: admin@erp.com / admin_password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await (prisma as any).$disconnect();
  });
