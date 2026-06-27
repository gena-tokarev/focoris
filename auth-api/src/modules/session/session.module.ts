import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthSessionService } from './session.service';
import { AuthLogoutInterceptor } from './interceptors/auth-logout.interceptor';
import { AuthRefreshInterceptor } from './interceptors/auth-refresh.interceptor';
import { AuthSessionInterceptor } from './interceptors/auth-session.interceptor';

@Module({
  imports: [ConfigModule],
  providers: [
    AuthLogoutInterceptor,
    AuthRefreshInterceptor,
    AuthSessionInterceptor,
    AuthSessionService,
  ],
  exports: [
    AuthLogoutInterceptor,
    AuthRefreshInterceptor,
    AuthSessionInterceptor,
    AuthSessionService,
  ],
})
export class SessionModule {}
