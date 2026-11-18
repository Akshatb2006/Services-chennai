import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ClipboardList, Search, Sparkles, type LucideIcon } from "@/components/icons";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/Button";
import { Wordmark } from "@/components/Logo";
import { usePreferences } from "@/store/preferences";
import { colors, layout, radius, space } from "@/theme";

const points: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Search, title: "Find household services", body: "Cleaning, daily help, laundry and repairs." },
  { icon: Sparkles, title: "Discover what your home needs", body: "See what each service includes." },
  { icon: ClipboardList, title: "Manage your requests", body: "Follow every request in one place." },
];

/** One concise intro screen, shown once. Skippable; never blocks exploring the app. */
export default function OnboardingScreen() {
  const router = useRouter();
  const complete = usePreferences((s) => s.completeOnboarding);
  const done = () => {
    complete();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Image
          source={require("@/assets/images/onboarding.jpg")}
          accessibilityLabel="A bright, tidy living room"
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.scrim} />
        <SafeAreaView edges={["top"]} style={styles.heroTop}>
          <Wordmark tone="light" size={28} />
          <Pressable accessibilityRole="button" onPress={done} hitSlop={12} style={styles.skip}>
            <AppText variant="label" color="textInverse">
              Skip
            </AppText>
          </Pressable>
        </SafeAreaView>
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        <AppText variant="display-lg" accessibilityRole="header">
          {"Your home,\ntaken care of."}
        </AppText>
        <View style={styles.points}>
          {points.map(({ icon: Icon, title, body }) => (
            <View key={title} style={styles.point}>
              <View style={styles.pointIcon}>
                <Icon size={20} color={colors.ink} strokeWidth={2} />
              </View>
              <View style={styles.flex}>
                <AppText variant="heading-sm">{title}</AppText>
                <AppText variant="body-sm" color="textSecondary">
                  {body}
                </AppText>
              </View>
            </View>
          ))}
        </View>
        <PrimaryButton label="Get started" block onPress={done} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  hero: { flex: 1, minHeight: 200 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(23,26,23,0.35)" },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: layout.gutter, paddingTop: space[3] },
  skip: { minHeight: 44, justifyContent: "center", paddingHorizontal: space[2] },
  sheet: {
    backgroundColor: colors.porcelain,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: -radius.xl,
    paddingHorizontal: layout.gutter,
    paddingTop: space[8],
    paddingBottom: space[4],
    gap: space[6],
  },
  points: { gap: space[4] },
  point: { flexDirection: "row", gap: space[4], alignItems: "center" },
  pointIcon: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.citrus, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
});
