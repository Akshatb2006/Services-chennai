import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SplashOverlay } from "@/components/SplashOverlay";
import { queryClient } from "@/services/api/query-client";
import { usePreferences } from "@/store/preferences";
import { useSession } from "@/store/session";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Tabs are the base of the stack, so deep links (e.g. a service) always have a back target. */
export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });
  const hydrated = usePreferences((s) => s.hydrated);
  const [splashDone, setSplashDone] = useState(false);
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    usePreferences.getState().hydrate();
    // Restore the signed-in session from the stored refresh token (non-blocking).
    useSession.getState().restore();
  }, []);

  useEffect(() => {
    // Hand over from the native splash to the identical branded overlay once text can render.
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={splashDone ? "dark" : "light"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.porcelain } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="services/[serviceId]" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="requests/[id]" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="addresses/index" />
        <Stack.Screen name="addresses/edit" />
        <Stack.Screen name="request/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="sign-in" options={{ presentation: "modal" }} />
        <Stack.Screen name="onboarding/index" options={{ presentation: "fullScreenModal", animation: "fade", gestureEnabled: false }} />
      </Stack>
      <SplashOverlay ready={hydrated} onDone={() => setSplashDone(true)} />
    </QueryClientProvider>
  );
}
