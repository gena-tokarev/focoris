import { Injectable } from '@nestjs/common';
import { IdentityService } from '../modules/identity/identity.service';
import { TokenService } from '../modules/token/token.service';
import { LogoutResponseDto, MeResponseDto, AuthTokenPairDto } from './dto/auth-response.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';

@Injectable()
export class AuthCoreService {
  constructor(
    private readonly identityService: IdentityService,
    private readonly tokenService: TokenService,
  ) {}

  async refresh(payload: RefreshRequestDto): Promise<AuthTokenPairDto> {
    return this.tokenService.refresh(payload);
  }

  async logout(payload: LogoutRequestDto): Promise<LogoutResponseDto> {
    return this.tokenService.logout(payload);
  }

  async me(userId: string): Promise<MeResponseDto> {
    const user = await this.identityService.findUserById(userId);

    return {
      user: this.identityService.toAuthUser(user),
    };
  }
}
