/**
 * Decouples the HTTP client from the session store (avoids an import cycle).
 * The session store registers the real implementation at startup.
 */
type Bridge = {
  getAccessToken: () => Promise<string | null>;
  /** Refreshes using the stored refresh token. Returns the new access token, or null if the session ended. */
  refreshAccessToken: () => Promise<string | null>;
};

export const sessionBridge: Bridge = {
  getAccessToken: async () => null,
  refreshAccessToken: async () => null,
};

export function registerSessionBridge(impl: Bridge) {
  Object.assign(sessionBridge, impl);
}
