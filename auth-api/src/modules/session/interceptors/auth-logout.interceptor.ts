import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { LogoutResponseDto } from '../../../core/dto/auth-response.dto';
import { AuthSessionService } from '../session.service';
import type { AuthRequestLike, AuthResponseLike } from '../session.types';

@Injectable()
export class AuthLogoutInterceptor
  implements NestInterceptor<LogoutResponseDto, LogoutResponseDto>
{
  constructor(private readonly authSessionService: AuthSessionService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<LogoutResponseDto>,
  ): Observable<LogoutResponseDto> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthRequestLike>();
    const response = http.getResponse<AuthResponseLike>();
    const sessionMode = this.authSessionService.resolveSessionMode(request);

    return next.handle().pipe(
      map((result) => {
        if (sessionMode === 'cookie') {
          this.authSessionService.clearAuthCookies(response);
        }

        return result;
      }),
    );
  }
}
