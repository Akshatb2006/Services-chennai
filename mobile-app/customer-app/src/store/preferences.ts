import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

/**
 * Lightweight local UI state only (server data lives in TanStack Query).
 * `hasSeenOnboarding` is persisted so the intro shows once.
 */
type Preferences = {
  hydrated: boolean;
  hasSeenOnboarding: boolean;
  hydrate: () => Promise<void>;
  completeOnboarding: () => void;
};

const KEY = "homecare.onboarding.seen";
const storage = {
  get: async () => (Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) ?? null : SecureStore.getItemAsync(KEY)),
  set: async (v: string) => (Platform.OS === "web" ? globalThis.localStorage?.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
};

export const usePreferences = create<Preferences>((set) => ({
  hydrated: false,
  hasSeenOnboarding: false,
  hydrate: async () => {
    const seen = await storage.get().catch(() => null);
    set({ hydrated: true, hasSeenOnboarding: seen === "1" });
  },
  completeOnboarding: () => {
    set({ hasSeenOnboarding: true });
    storage.set("1").catch(() => {});
  },
}));
