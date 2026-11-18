import { Redirect, Tabs } from "expo-router";
import { BottomNavigation } from "@/components/BottomNavigation";
import { LoadingState } from "@/components/States";
import { useMe } from "@/features/session/hooks";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { useSession } from "@/store/session";
import { colors } from "@/theme";

/** Signed-in, registered professionals only: everyone else goes to sign-in or registration. */
export default function TabLayout() {
  const status = useSession((s) => s.status);
  const me = useMe();
  const reduced = useReduceMotion();

  if (status === "restoring" || (status === "signedIn" && me.isPending)) return <LoadingState label="Loading" />;
  if (status === "signedOut") return <Redirect href="/sign-in" />;
  if (me.data && !me.data.professional) return <Redirect href="/register" />;

  return (
    <Tabs tabBar={(props) => <BottomNavigation {...props} />} backBehavior="firstRoute" screenOptions={{ headerShown: false, animation: reduced ? "none" : "fade", sceneStyle: { backgroundColor: colors.porcelain } }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="jobs" options={{ title: "Jobs" }} />
      <Tabs.Screen name="schedule" options={{ title: "Schedule" }} />
      <Tabs.Screen name="earnings" options={{ title: "Earnings" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
