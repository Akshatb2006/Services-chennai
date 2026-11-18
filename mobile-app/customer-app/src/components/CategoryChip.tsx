import { Pressable, StyleSheet } from "react-native";
import { colors, radius, size, space } from "@/theme";
import { AppText } from "./AppText";

type Props = { label: string; selected: boolean; onPress: () => void };

/** Filter chip. Selected = citrus fill with ink text (never citrus text). */
export function CategoryChip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.idle,
        pressed && !selected && { backgroundColor: colors.stone },
      ]}
    >
      <AppText variant="label" color={selected ? "textOnAccent" : "text"}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: size.controlSm + 4,
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
  },
  idle: { backgroundColor: colors.card, borderColor: colors.border },
  selected: { backgroundColor: colors.citrus, borderColor: colors.citrus },
});
