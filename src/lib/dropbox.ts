let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Get a valid Dropbox access token.
 *
 * If DROPBOX_REFRESH_TOKEN + DROPBOX_APP_KEY + DROPBOX_APP_SECRET are set,
 * uses the OAuth2 refresh flow and caches the token in memory.
 * Otherwise falls back to DROPBOX_ACCESS_TOKEN (backward compatible).
 *
 * Returns null if no credentials are configured.
 */
export async function getDropboxToken(): Promise<string | null> {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;

  // If refresh flow is configured, use it
  if (refreshToken && appKey && appSecret) {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (cachedToken && tokenExpiresAt - now > fiveMinutes) {
      return cachedToken;
    }

    return refreshAccessToken(refreshToken, appKey, appSecret);
  }

  // Fallback: use static access token
  return process.env.DROPBOX_ACCESS_TOKEN ?? null;
}

/**
 * Force-clear the cached token so the next call to getDropboxToken() refreshes.
 */
export function clearDropboxTokenCache() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

async function refreshAccessToken(
  refreshToken: string,
  appKey: string,
  appSecret: string
): Promise<string | null> {
  try {
    const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: appKey,
        client_secret: appSecret,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Dropbox token refresh failed:", res.status, errText);
      return null;
    }

    const data = await res.json();
    cachedToken = data.access_token;
    // expires_in is in seconds; subtract 30s as extra buffer
    tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000;

    return cachedToken;
  } catch (err) {
    console.error("Dropbox token refresh exception:", err);
    return null;
  }
}
