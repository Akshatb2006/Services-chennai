import Constants from "expo-constants";
import { useRouter, type Href } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { openExternal } from "@/utils/links";
import { AppText } from "@/components/AppText";
import { BriefcaseBusiness, CalendarClock, ChevronRight, FileText, FileUp, LifeBuoy, LogOut, ShieldCheck, type LucideIcon } from "@/components/icons";
import { ScreenContainer } from "@/components/ScreenContainer";
import { app, legalLinks } from "@/constants/app";
import { VerificationCard } from "@/features/profile/VerificationCard";
import { useMe, useSignOut } from "@/features/session/hooks";
import { colors, radius, space } from "@/theme";
import { categoryName, formatPhone } from "@/utils/format";

type Row = { icon: LucideIcon; label: string; onPress: () => void; destructive?: boolean };

export default function ProfileScreen() {
  const router = useRouter();
  const me = useMe();
  const signOut = useSignOut();
  const pro = me.data?.professional;
  if (!me.data || !pro) return null;
  const go = (href: Href) => () => router.push(href);

  const rows: Row[] = [
    { icon: BriefcaseBusiness, label: "Services & areas", onPress: go("/profile/edit") },
    { icon: CalendarClock, label: "Availability", onPress: go("/availability") },
    { icon: FileUp, label: "Verification documents", onPress: go("/documents") },
  ];
  const support: Row[] = [
    { icon: LifeBuoy, label: "Help and support", onPress: () => void openExternal(`${app.webUrl}/professionals`) },
    { icon: ShieldCheck, label: "Privacy policy", onPress: () => void openExternal(legalLinks.privacy) },
    { icon: FileText, label: "Terms of service", onPress: () => void openExternal(legalLinks.terms) },
  ];
  const confirmSignOut = () =>
    Alert.alert("Log out?", "You'll need a new code to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => signOut.mutate(undefined, { onSuccess: () => router.replace("/sign-in") }) },
    ]);

  return (
    <ScreenContainer>
      <AppText variant="display-md" accessibilityRole="header" style={styles.title}>
        Profile
      </AppText>
      <View style={styles.head}>
        <AppText variant="heading-lg">{pro.fullName}</AppText>
        <AppText color="textSecondary">{formatPhone(me.data.phone)}</AppText>
        <AppText variant="body-sm" color="textSecondary">
          {pro.categories.map(categoryName).join(", ")} · {pro.pincodes.length} pincode{pro.pincodes.length === 1 ? "" : "s"}
        </AppText>
      </View>
      <VerificationCard profile={pro} />
      <Group rows={rows} />
      <Group rows={support} />
      <Group rows={[{ icon: LogOut, label: signOut.isPending ? "Logging out…" : "Log out", onPress: confirmSignOut, destructive: true }]} />
      <AppText variant="body-sm" color="textSecondary" style={styles.version}>
        {app.name} {Constants.expoConfig?.version ?? ""}
      </AppText>
    </ScreenContainer>
  );
}

function Group({ rows }: { rows: Row[] }) {
  return (
    <View style={styles.group}>
      {rows.map(({ icon: Icon, label, onPress, destructive }, i) => (
        <Pressable key={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { backgroundColor: colors.porcelain }]}>
          <View style={styles.rowIcon}>
            <Icon size={18} color={destructive ? colors.error : colors.ink} strokeWidth={2} />
          </View>
          <AppText style={[styles.flex, destructive && { color: colors.error }]}>{label}</AppText>
          {destructive ? null : <ChevronRight size={18} color={colors.textSecondary} />}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: space[3], marginBottom: space[4] },
  head: { gap: 2, marginBottom: space[4] },
  group: { marginTop: space[5], backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 56, paddingHorizontal: space[4] },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  rowIcon: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.stone, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  version: { textAlign: "center", marginTop: space[8] },
});
