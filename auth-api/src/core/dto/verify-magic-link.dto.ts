import { IsString, MinLength } from 'class-validator';

export class VerifyMagicLinkDto {
  @IsString()
  @MinLength(1)
  token!: string;
}
