import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Refresh-token storage: iOS Keychain / Android Keystore via SecureStore.
 * The access token is never persisted (memory only). On web (dev preview only) nothing is persisted.
 */
const REFRESH_KEY = "homecare.session.refresh";
const secure = Platform.OS !== "web";
const options: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

export async function getRefreshToken(): Promise<string | null> {
  return secure ? SecureStore.getItemAsync(REFRESH_KEY, options) : null;
}

export async function setRefreshToken(token: string): Promise<void> {
  if (secure) await SecureStore.setItemAsync(REFRESH_KEY, token, options);
}

export async function clearRefreshToken(): Promise<void> {
  if (secure) await SecureStore.deleteItemAsync(REFRESH_KEY, options);
}
