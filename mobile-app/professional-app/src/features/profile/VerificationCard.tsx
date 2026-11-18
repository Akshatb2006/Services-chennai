import type { MyProfessionalProfile } from "@homecare/contracts";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { BadgeCheck, Hourglass, ShieldAlert, type LucideIcon } from "@/components/icons";
import { colors, radius, space } from "@/theme";

const states: Record<MyProfessionalProfile["verificationStatus"], { icon: LucideIcon; title: string; body: string; tone: "ink" | "stone" | "error" }> = {
  pending: {
    icon: Hourglass,
    title: "Verification pending",
    body: "Homecare will contact you to check your ID and experience. You can't receive jobs until a team member verifies you. Keep your services, areas and availability up to date meanwhile.",
    tone: "stone",
  },
  verified: { icon: BadgeCheck, title: "Verified", body: "You can receive jobs that match your services, pincodes and availability.", tone: "ink" },
  rejected: {
    icon: ShieldAlert,
    title: "Verification not approved",
    body: "We couldn't verify your profile, so you won't receive jobs. Contact Homecare support if you think this is a mistake or your details have changed.",
    tone: "error",
  },
};

/** Explains the verification state and what happens next. Only staff can change it. */
export function VerificationCard({ profile }: { profile: MyProfessionalProfile }) {
  const s = states[profile.verificationStatus];
  const suspended = profile.accountStatus !== "active";
  const Icon = s.icon;
  const dark = s.tone === "ink";
  return (
    <View style={[styles.card, dark ? styles.ink : s.tone === "error" ? styles.error : styles.stone]} accessibilityRole="summary">
      <View style={[styles.icon, { backgroundColor: dark ? colors.citrus : colors.card }]}>
        <Icon size={20} color={s.tone === "error" ? colors.error : colors.ink} />
      </View>
      <View style={styles.flex}>
        <AppText variant="heading-sm" color={dark ? "textInverse" : "text"}>
          {suspended ? (profile.accountStatus === "suspended" ? "Account suspended" : "Account inactive") : s.title}
        </AppText>
        <AppText variant="body-sm" color={dark ? "textInverseSecondary" : "textSecondary"}>
          {suspended ? "You won't receive new jobs and can't update jobs right now. Contact Homecare support for details." : s.body}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: space[3], padding: space[4], borderRadius: radius.lg },
  ink: { backgroundColor: colors.ink },
  stone: { backgroundColor: colors.stone },
  error: { backgroundColor: "#F6E3E0" },
  icon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, gap: 2 },
});
