import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export interface AuthFixtureUser {
  email: string;
  password: string;
}

export async function createAuthFixtureUser(): Promise<AuthFixtureUser> {
  const password = 'Test1234!';
  const email = `e2e+${randomUUID()}@focoris.local`;
  const passwordHash = bcrypt.hashSync(password, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      roles: [UserRole.admin],
    },
  });

  return { email, password };
}

export async function cleanupAuthFixtureUsers() {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: 'e2e+',
      },
    },
  });
}

export async function disconnectFixtures() {
  await prisma.$disconnect();
}
