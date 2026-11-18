import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { BottomNavigation } from "@/components/BottomNavigation";
import { usePreferences } from "@/store/preferences";
import { colors } from "@/theme";

export default function TabLayout() {
  const router = useRouter();
  const reduced = useReduceMotion();
  const { hydrated, hasSeenOnboarding } = usePreferences();

  // First launch only: a short, skippable intro over the app (never a gate).
  useEffect(() => {
    if (hydrated && !hasSeenOnboarding) router.push("/onboarding");
  }, [hydrated, hasSeenOnboarding, router]);

  return (
    <Tabs
      tabBar={(props) => <BottomNavigation {...props} />}
      backBehavior="firstRoute"
      screenOptions={{
        headerShown: false,
        animation: reduced ? "none" : "fade",
        sceneStyle: { backgroundColor: colors.porcelain },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="services" options={{ title: "Services" }} />
      <Tabs.Screen name="requests" options={{ title: "Requests" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
