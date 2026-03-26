const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Admin';

  if (!email || !password) {
    console.error('Usage: node createAdmin.js <email> <password> [name]');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`User with email "${email}" already exists.`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name, password: hashed, role: 'ADMIN', status: 'ACTIVE' },
  });

  console.log(`Admin created! Login with ${email}`);
}

main().finally(() => prisma.$disconnect());
