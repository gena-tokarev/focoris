import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type {
  LoginResponseDto,
  RegisterResponseDto,
} from '../../../core/dto/auth-response.dto';
import { AuthSessionService } from '../session.service';
import type {
  AuthenticatedSession,
  AuthRequestLike,
  AuthResponseLike,
} from '../session.types';

@Injectable()
export class AuthSessionInterceptor
  implements
    NestInterceptor<
      AuthenticatedSession,
      LoginResponseDto | RegisterResponseDto
    >
{
  constructor(private readonly authSessionService: AuthSessionService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<AuthenticatedSession>,
  ): Observable<LoginResponseDto | RegisterResponseDto> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthRequestLike>();
    const response = http.getResponse<AuthResponseLike>();
    const sessionMode = this.authSessionService.resolveSessionMode(request);

    return next.handle().pipe(
      map((session) => {
        if (sessionMode === 'cookie') {
          this.authSessionService.setAuthCookies(response, session.tokens);
        }

        return this.authSessionService.createLoginResponse(
          sessionMode,
          session,
        );
      }),
    );
  }
}
