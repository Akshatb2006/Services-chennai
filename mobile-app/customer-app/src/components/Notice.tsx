import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius, space } from "@/theme";
import { AppText } from "./AppText";
import { CircleAlert, Info } from "./icons";

/** Inline message. tone "error" is announced to screen readers. */
export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  const Icon = tone === "error" ? CircleAlert : Info;
  return (
    <View
      style={[styles.box, tone === "error" && styles.error]}
      accessibilityRole={tone === "error" ? "alert" : undefined}
      accessibilityLiveRegion={tone === "error" ? "assertive" : undefined}
    >
      <Icon size={18} color={tone === "error" ? colors.error : colors.ink} strokeWidth={2} />
      <AppText variant="body-sm" style={styles.text}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", gap: space[2], padding: space[4], borderRadius: radius.md, backgroundColor: colors.stone, alignItems: "flex-start" },
  error: { backgroundColor: "#F6E3E0" },
  text: { flex: 1 },
});
