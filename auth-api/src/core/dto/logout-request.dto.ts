import { IsOptional, IsString, MinLength } from 'class-validator';

export class LogoutRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  refreshToken?: string;
}
