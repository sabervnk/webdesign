// Browser mutations must carry same-origin evidence; absent headers fail closed.
export function mutationOriginAllowed(request: Request, trustedOrigin: string): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const supplied = request.headers.get('origin');
  if (supplied !== null) return supplied === trustedOrigin;
  const referer = request.headers.get('referer');
  if (referer) {
    try { return new URL(referer).origin === trustedOrigin; } catch { return false; }
  }
  return request.headers.get('sec-fetch-site') === 'same-origin';
}
