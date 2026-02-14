import { Injectable } from '@nestjs/common';
import { LoginRequestDto } from './dto/login-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import {
  LoginResponseDto,
  LogoutResponseDto,
  MeResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  login(_payload: LoginRequestDto): LoginResponseDto {
    throw new Error('AUTH_NOT_IMPLEMENTED');
  }

  refresh(_payload: RefreshRequestDto): RefreshResponseDto {
    throw new Error('AUTH_NOT_IMPLEMENTED');
  }

  logout(_payload: LogoutRequestDto): LogoutResponseDto {
    throw new Error('AUTH_NOT_IMPLEMENTED');
  }

  me(_accessToken: string): MeResponseDto {
    throw new Error('AUTH_NOT_IMPLEMENTED');
  }
}
