import { formatPhone } from "@homecare/contracts";
import Constants from "expo-constants";
import { useRouter, type Href } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { openExternal } from "@/utils/links";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/Button";
import { Bell, ChevronRight, FileText, LifeBuoy, LogOut, MapPin, ShieldCheck, UserRound, type LucideIcon } from "@/components/icons";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/States";
import { app, legalLinks } from "@/constants/app";
import { useSignOut } from "@/features/auth/hooks";
import { useSession } from "@/features/profile/session";
import { colors, radius, space } from "@/theme";

type Row = { icon: LucideIcon; label: string; onPress?: () => void; requiresAccount?: boolean; destructive?: boolean };

export default function ProfileScreen() {
  const router = useRouter();
  const { isSignedIn, isRestoring, customer } = useSession();
  const signOut = useSignOut();
  const go = (href: Href) => () => router.push(href);

  const account: Row[] = [
    { icon: UserRound, label: "Personal information", requiresAccount: true, onPress: go("/profile/edit") },
    { icon: MapPin, label: "Saved addresses", requiresAccount: true, onPress: go("/addresses") },
    { icon: Bell, label: "Notifications", requiresAccount: true, onPress: go("/notifications") },
  ];
  const support: Row[] = [
    { icon: LifeBuoy, label: "Help and support", onPress: () => void openExternal(`${app.webUrl}/#faq`) },
    { icon: ShieldCheck, label: "Privacy policy", onPress: () => void openExternal(legalLinks.privacy) },
    { icon: FileText, label: "Terms of service", onPress: () => void openExternal(legalLinks.terms) },
  ];
  const confirmSignOut = () =>
    Alert.alert("Log out?", "You'll need a new code to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => signOut.mutate() },
    ]);

  return (
    <ScreenContainer>
      <AppText variant="display-md" accessibilityRole="header" style={styles.title}>
        Profile
      </AppText>

      {isRestoring ? (
        <LoadingState label="Restoring your session" />
      ) : (
        <View style={styles.account}>
          <View style={styles.avatar}>
            <UserRound size={24} color={colors.ink} strokeWidth={2} />
          </View>
          <AppText variant="heading-md" color="textInverse">
            {isSignedIn ? (customer?.fullName ?? "Your account") : "Your account"}
          </AppText>
          <AppText variant="body-sm" color="textInverseSecondary" style={[styles.accountBody, isSignedIn && customer?.profileComplete && { marginBottom: 0 }]}>
            {isSignedIn
              ? customer
                ? formatPhone(customer.phone)
                : " "
              : "Sign in with your mobile number to save addresses and follow your requests."}
          </AppText>
          {!isSignedIn ? <PrimaryButton label="Sign in" onPress={() => router.push("/sign-in")} /> : null}
          {isSignedIn && customer && !customer.profileComplete ? (
            <PrimaryButton label="Complete your profile" onPress={() => router.push("/profile/edit")} />
          ) : null}
        </View>
      )}

      <Section title="Account" rows={account} locked={!isSignedIn} />
      <Section title="Support" rows={support} />
      {isSignedIn ? <Section title="" rows={[{ icon: LogOut, label: signOut.isPending ? "Logging out…" : "Log out", onPress: confirmSignOut, destructive: true }]} /> : null}

      <AppText variant="body-sm" color="textSecondary" style={styles.version}>
        {app.name} {Constants.expoConfig?.version ?? ""}
      </AppText>
    </ScreenContainer>
  );
}

function Section({ title, rows, locked = false }: { title: string; rows: Row[]; locked?: boolean }) {
  return (
    <View style={styles.section}>
      {title ? (
        <AppText variant="label" color="textSecondary" style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      <View style={styles.group}>
        {rows.map(({ icon: Icon, label, onPress, requiresAccount, destructive }, i) => {
          const disabled = (requiresAccount && locked) || !onPress;
          return (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              accessibilityHint={requiresAccount && locked ? "Available after you sign in" : undefined}
              disabled={disabled}
              onPress={onPress}
              style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { backgroundColor: colors.porcelain }]}
            >
              <View style={styles.rowIcon}>
                <Icon size={18} color={destructive ? colors.error : colors.ink} strokeWidth={2} />
              </View>
              <AppText variant="body-md" style={[styles.flex, disabled && { color: colors.textSecondary }, destructive && { color: colors.error }]}>
                {label}
              </AppText>
              {requiresAccount && locked ? (
                <AppText variant="body-sm" color="textSecondary">
                  Sign in
                </AppText>
              ) : destructive ? null : (
                <ChevronRight size={18} color={colors.textSecondary} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: space[3], marginBottom: space[5] },
  account: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space[5], gap: space[1] },
  avatar: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.citrus, alignItems: "center", justifyContent: "center", marginBottom: space[3] },
  accountBody: { marginBottom: space[4], maxWidth: 300 },
  section: { marginTop: space[6] },
  sectionTitle: { marginBottom: space[2], marginLeft: space[1] },
  group: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 56, paddingHorizontal: space[4] },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  rowIcon: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.stone, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  version: { textAlign: "center", marginTop: space[8] },
});
