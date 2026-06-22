// Origin of the I Want My MTG API. The generated paths already carry the
// `/api/v1/...` prefix, so this is the origin only. Override per build with
// EXPO_PUBLIC_API_URL (e.g. a local server during development).
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://iwantmymtg.net";
