import { AuthProvider, PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@focoris.local';
  const passwordHash = bcrypt.hashSync('admin123', 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      roles: [UserRole.admin],
      externalIdentities: {
        upsert: {
          where: {
            provider_providerUserId: {
              provider: AuthProvider.local,
              providerUserId: email,
            },
          },
          update: {
            passwordHash,
            email,
          },
          create: {
            provider: AuthProvider.local,
            providerUserId: email,
            email,
            passwordHash,
          },
        },
      },
    },
    create: {
      email,
      roles: [UserRole.admin],
      externalIdentities: {
        create: {
          provider: AuthProvider.local,
          providerUserId: email,
          email,
          passwordHash,
        },
      },
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
