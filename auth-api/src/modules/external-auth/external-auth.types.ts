export type ExternalAuthPlatform = 'web' | 'native';

export interface ExternalAuthRedirectContext {
  redirectUri: string;
  platform: ExternalAuthPlatform;
}

export interface StoredExternalAuthCode extends ExternalAuthRedirectContext {
  userId: string;
}
