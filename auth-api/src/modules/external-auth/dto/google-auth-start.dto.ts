import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { ExternalAuthPlatform } from '../external-auth.types';

export class GoogleAuthStartDto {
  @IsString()
  @MinLength(1)
  redirectUri!: string;

  @IsOptional()
  @IsString()
  @IsIn(['web', 'native'])
  platform?: ExternalAuthPlatform;
}
