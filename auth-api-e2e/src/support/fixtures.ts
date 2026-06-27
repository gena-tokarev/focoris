import { AuthProvider, PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export interface AuthFixtureUser {
  email: string;
  password: string;
}

export async function createAuthFixtureUser(
  prefix = 'e2e',
): Promise<AuthFixtureUser> {
  const password = 'Test1234!';
  const email = `${prefix}+${randomUUID()}@focoris.local`;
  const passwordHash = bcrypt.hashSync(password, 10);

  await prisma.user.create({
    data: {
      email,
      roles: [UserRole.admin],
      userIdentities: {
        create: {
          provider: AuthProvider.local,
          providerUserId: email,
          email,
          emailVerified: true,
          passwordHash,
        },
      },
    },
  });

  return { email, password };
}

export async function cleanupAuthFixtureUsers(prefix = 'e2e') {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: `${prefix}+`,
      },
    },
  });
}

export async function disconnectFixtures() {
  await prisma.$disconnect();
}
