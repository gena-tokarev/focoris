import { IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  refreshToken?: string;
}
