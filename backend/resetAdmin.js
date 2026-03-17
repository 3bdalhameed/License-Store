const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('admin123', 10);
  await prisma.user.update({
    where: { email: 'admin@store.com' },
    data: { password: hashed }
  });
  console.log('Password reset! Login with admin@store.com / admin123');
}

main().finally(() => prisma.$disconnect());