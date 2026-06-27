import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server';

export interface PasskeyLoginStartResponseDto {
  requestId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}
