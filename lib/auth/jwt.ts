// Read the `exp` claim out of a JWT so we can refresh the access token just
// before it expires (proactive refresh) rather than waiting for a 401.
//
// Dependency-free: React Native / Hermes doesn't reliably expose `atob`, so we
// base64-decode by hand. We only need the numeric `exp`, so rather than
// JSON.parse the whole payload (which can choke on multi-byte UTF-8 fields once
// decoded byte-wise), we regex it out - the ASCII bytes of `"exp":<digits>`
// survive the byte-wise decode intact.

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64UrlDecode(input: string): string {
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  let out = "";
  for (let i = 0; i < str.length; ) {
    const e1 = B64.indexOf(str[i++]);
    const e2 = B64.indexOf(str[i++]);
    const e3 = B64.indexOf(str[i++]);
    const e4 = B64.indexOf(str[i++]);
    out += String.fromCharCode((e1 << 2) | (e2 >> 4));
    if (e3 !== -1 && str[i - 2] !== "=") out += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));
    if (e4 !== -1 && str[i - 1] !== "=") out += String.fromCharCode(((e3 & 3) << 6) | e4);
  }
  return out;
}

/** Access-token expiry in epoch ms, or null if it can't be determined. */
export function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const m = base64UrlDecode(payload).match(/"exp"\s*:\s*(\d+)/);
    return m ? parseInt(m[1], 10) * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * True if the token is expired or within `skewMs` of expiring (so we refresh a
 * little early). If the expiry can't be read, returns false: we'd rather send
 * the token and let the 401 sign-out backstop catch it than refresh on every
 * single request.
 */
export function isExpiringSoon(token: string, skewMs = 30_000): boolean {
  const exp = getTokenExpiryMs(token);
  if (exp == null) return false;
  return Date.now() >= exp - skewMs;
}
