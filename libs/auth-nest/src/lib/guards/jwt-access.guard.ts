import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthConfigEnv } from '../auth.config';
import { AuthJwtPayload, JwtTokenType } from '../auth.types';

interface JwtVerifier {
  verify(token: string, options: { secret: string }): unknown;
}

interface EnvReader {
  get<K extends keyof AuthConfigEnv>(key: K): AuthConfigEnv[K] | undefined;
}

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(
    @Inject(JwtService) protected readonly jwtService: JwtVerifier,
    @Inject(ConfigService) protected readonly configService: EnvReader,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthJwtPayload;
    }>();

    const token = this.extractBearerToken(request.headers.authorization);
    request.user = this.verifyAccessToken(token);

    return true;
  }

  protected onMissingBearerToken(): never {
    throw new UnauthorizedException('Missing or invalid bearer token');
  }

  protected onInvalidAccessToken(): never {
    throw new UnauthorizedException('Invalid access token');
  }

  private verifyAccessToken(token: string): AuthJwtPayload {
    const secret = this.configService.get('AUTH_ACCESS_TOKEN_SECRET');
    if (!secret) {
      this.onInvalidAccessToken();
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret,
      }) as AuthJwtPayload;
      if (payload.type !== JwtTokenType.Access) {
        this.onInvalidAccessToken();
      }
      return payload;
    } catch {
      this.onInvalidAccessToken();
    }
  }

  private extractBearerToken(authorization?: string): string {
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      this.onMissingBearerToken();
    }
    return token;
  }
}
