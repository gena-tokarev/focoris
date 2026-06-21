import { AuthProvider } from '@prisma/client/wasm';
import type { AuthUserDto, UserRole } from '../../core/dto/auth-response.dto';

export interface IdentityUser {
  id: string;
  email: string;
  roles: AuthUserDto['roles'];
}

export interface CreateUserWithIdentityInput {
  email: string;
  roles?: UserRole[];
  identity: {
    provider: AuthProvider;
    providerUserId: string;
    email: string;
    emailVerified?: boolean;
    displayName?: string | null;
    passwordHash?: string | null;
  };
}
