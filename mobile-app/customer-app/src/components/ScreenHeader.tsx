import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { layout, space } from "@/theme";
import { AppText } from "./AppText";
import { IconButton } from "./IconButton";
import { ArrowLeft, X } from "./icons";

/** Header for stacked screens: back (or close) + title. Falls back to Home when there's no history. */
export function ScreenHeader({ title, variant = "back", right }: { title: string; variant?: "back" | "close"; right?: ReactNode }) {
  const router = useRouter();
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));
  return (
    <View style={styles.row}>
      {variant === "back" ? <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={leave} /> : null}
      <AppText variant="heading-md" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      {right}
      {variant === "close" ? <IconButton icon={X} accessibilityLabel="Close" onPress={leave} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: layout.gutter, paddingVertical: space[3] },
  title: { flex: 1 },
});
