import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, useFonts } from "@expo-google-fonts/manrope";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SplashOverlay } from "@/components/SplashOverlay";
import { queryClient } from "@/services/api/query-client";
import { useSession } from "@/store/session";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });
  const status = useSession((s) => s.status);
  const [splashDone, setSplashDone] = useState(false);
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    // Restore the professional session from the stored refresh token.
    void useSession.getState().restore();
  }, []);
  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  if (!fontsReady) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={splashDone ? "dark" : "light"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.porcelain } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="register" options={{ gestureEnabled: false }} />
        <Stack.Screen name="jobs/[id]" />
        <Stack.Screen name="availability" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="documents" />
        <Stack.Screen name="notifications" />
      </Stack>
      <SplashOverlay ready={status !== "restoring"} onDone={() => setSplashDone(true)} />
    </QueryClientProvider>
  );
}
