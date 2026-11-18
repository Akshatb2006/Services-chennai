import type { LucideIcon } from "@/components/icons";
import { CircleAlert } from "@/components/icons";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors, radius, space } from "@/theme";
import { AppText } from "./AppText";
import { SecondaryButton } from "./Button";

type EmptyProps = { icon: LucideIcon; title: string; body?: string; action?: ReactNode };

export function EmptyState({ icon: Icon, title, body, action }: EmptyProps) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.badge}>
        <Icon size={26} color={colors.ink} strokeWidth={1.75} />
      </View>
      <AppText variant="heading-md" style={styles.center} accessibilityRole="header">
        {title}
      </AppText>
      {body ? (
        <AppText color="textSecondary" style={[styles.center, styles.body]}>
          {body}
        </AppText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

type ErrorProps = { title?: string; message: string; onRetry?: () => void };

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorProps) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <View style={[styles.badge, { backgroundColor: "#F6E3E0" }]}>
        <CircleAlert size={26} color={colors.error} strokeWidth={1.75} />
      </View>
      <AppText variant="heading-md" style={styles.center}>
        {title}
      </AppText>
      <AppText color="textSecondary" style={[styles.center, styles.body]}>
        {message}
      </AppText>
      {onRetry ? (
        <View style={styles.action}>
          <SecondaryButton label="Try again" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingHorizontal: space[8], paddingVertical: space[12], gap: space[2] },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.stone,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space[3],
  },
  center: { textAlign: "center" },
  body: { maxWidth: 300 },
  action: { marginTop: space[4] },
});
