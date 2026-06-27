import { IsObject, IsString } from 'class-validator';

export class PasskeyFinishRequestDto {
  @IsString()
  requestId!: string;

  @IsObject()
  credential!: Record<string, unknown>;
}
