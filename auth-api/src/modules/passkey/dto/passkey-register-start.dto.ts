import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/server';

export interface PasskeyRegisterStartResponseDto {
  requestId: string;
  options: PublicKeyCredentialCreationOptionsJSON;
}
