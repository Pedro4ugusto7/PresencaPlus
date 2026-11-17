import * as Linking from 'expo-linking';
function read(params, hash, name) {
  const queryValue = params[name];
  if (typeof queryValue === 'string' && queryValue.length > 0) return queryValue;
  const hashValue = hash?.get(name);
  if (hashValue && hashValue.length > 0) return hashValue;
  return undefined;
}
export function recoveryFromUrl(url) {
  if (!url) return {};
  const parsed = Linking.parse(url);
  const hash = url.includes('#') ? new URLSearchParams(url.slice(url.indexOf('#') + 1)) : null;
  const params = parsed.queryParams ?? {};
  return {
    code: read(params, hash, 'code'),
    tokenHash: read(params, hash, 'token_hash'),
    accessToken: read(params, hash, 'access_token'),
    refreshToken: read(params, hash, 'refresh_token'),
    error: read(params, hash, 'error_description') ?? read(params, hash, 'error')
  };
}
export function hasRecoveryPayload(input) {
  return Boolean(input.code || input.tokenHash || input.accessToken && input.refreshToken || input.error);
}
