import { IsString, MinLength } from 'class-validator';

export class GoogleAuthCodeExchangeDto {
  @IsString()
  @MinLength(1)
  code!: string;
}
