const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Flushing database...');

  await prisma.passwordResetToken.deleteMany();
  await prisma.creditLog.deleteMany();
  await prisma.manualOrder.deleteMany();
  await prisma.order.deleteMany();
  await prisma.licenseKey.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.counter.deleteMany();
  await prisma.user.deleteMany();

  console.log('Database wiped. Now run:');
  console.log('  node createAdmin.js <email> <password> [name]');
}

main().finally(() => prisma.$disconnect());
