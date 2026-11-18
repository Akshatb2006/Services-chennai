import { Pressable, StyleSheet, View } from "react-native";
import { space } from "@/theme";
import { AppText } from "./AppText";

type Props = { title: string; actionLabel?: string; onAction?: () => void };

export function SectionHeader({ title, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <AppText variant="heading-md" accessibilityRole="header">
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12}>
          {({ pressed }) => (
            <AppText variant="label" color="textSecondary" style={pressed && { opacity: 0.6 }}>
              {actionLabel}
            </AppText>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: space[4] },
});
