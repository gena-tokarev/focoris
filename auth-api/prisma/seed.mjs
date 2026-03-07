import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@focoris.local';
  const passwordHash = bcrypt.hashSync('admin123', 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      roles: [UserRole.admin],
    },
    create: {
      email,
      passwordHash,
      roles: [UserRole.admin],
    },
  });
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
