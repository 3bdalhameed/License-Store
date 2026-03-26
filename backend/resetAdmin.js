const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node resetAdmin.js <email> <new-password>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email "${email}".`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { email },
    data: { password: hashed, failedLoginAttempts: 0, lockedUntil: null },
  });

  console.log(`Password reset for ${email}`);
}

main().finally(() => prisma.$disconnect());
