// The app talks to a fake API in tests (see __tests__/support/fake-api.ts).
process.env.EXPO_PUBLIC_API_BASE_URL = "http://api.test";

// Fonts load instantly in tests (the real TTFs are native assets).
jest.mock("@expo-google-fonts/manrope", () => ({
  useFonts: () => [true, null],
  Manrope_400Regular: 1,
  Manrope_500Medium: 1,
  Manrope_600SemiBold: 1,
  Manrope_700Bold: 1,
}));

// The splash overlay is purely decorative; skip its timers in tests.
jest.mock("@/components/SplashOverlay", () => ({ SplashOverlay: () => null }));

// In-memory SecureStore (the native keychain isn't available under Jest).
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 0,
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
    __store: store,
  };
});
