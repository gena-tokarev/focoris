import type { AuthUserDto } from '../../core/dto/auth-response.dto';

export interface TokenUser {
  id: string;
  email: string;
  roles: AuthUserDto['roles'];
}
