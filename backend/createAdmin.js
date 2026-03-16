const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@store.com',
      name: 'Admin',
      password: hashed,
      role: 'ADMIN'
    }
  });
  console.log('Done! Login with admin@store.com / admin123');
}

main().finally(() => prisma.$disconnect());