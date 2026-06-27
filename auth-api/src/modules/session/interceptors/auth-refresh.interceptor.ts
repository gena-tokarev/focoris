import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type {
  AuthTokenPairDto,
  RefreshResponseDto,
} from '../../../core/dto/auth-response.dto';
import { AuthSessionService } from '../session.service';
import type { AuthRequestLike, AuthResponseLike } from '../session.types';

@Injectable()
export class AuthRefreshInterceptor
  implements NestInterceptor<AuthTokenPairDto, RefreshResponseDto>
{
  constructor(private readonly authSessionService: AuthSessionService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<AuthTokenPairDto>,
  ): Observable<RefreshResponseDto> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthRequestLike>();
    const response = http.getResponse<AuthResponseLike>();
    const sessionMode = this.authSessionService.resolveSessionMode(request);

    return next.handle().pipe(
      map((tokens) => {
        if (sessionMode === 'cookie') {
          this.authSessionService.setAuthCookies(response, tokens);
        }

        return this.authSessionService.createRefreshResponse(
          sessionMode,
          tokens,
        );
      }),
    );
  }
}
