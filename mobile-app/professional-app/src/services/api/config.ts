/** API base URL from the environment (EXPO_PUBLIC_API_BASE_URL). Empty until the backend exists. */
export const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
export const isApiConfigured = apiBaseUrl.length > 0;
