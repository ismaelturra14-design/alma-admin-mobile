import type { AuthTokens } from '@/features/auth/types/auth';

type SessionExpiredListener = () => void;
type TokensRefreshedListener = (tokens: AuthTokens) => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();
const forbiddenListeners = new Set<SessionExpiredListener>();
const tokensRefreshedListeners = new Set<TokensRefreshedListener>();

export function subscribeToSessionExpired(
  listener: SessionExpiredListener,
): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

export function notifySessionExpired(): void {
  sessionExpiredListeners.forEach((listener) => listener());
}

export function subscribeToApiForbidden(
  listener: SessionExpiredListener,
): () => void {
  forbiddenListeners.add(listener);
  return () => forbiddenListeners.delete(listener);
}

export function notifyApiForbidden(): void {
  forbiddenListeners.forEach((listener) => listener());
}

export function subscribeToTokensRefreshed(
  listener: TokensRefreshedListener,
): () => void {
  tokensRefreshedListeners.add(listener);
  return () => tokensRefreshedListeners.delete(listener);
}

export function notifyTokensRefreshed(tokens: AuthTokens): void {
  tokensRefreshedListeners.forEach((listener) => listener(tokens));
}