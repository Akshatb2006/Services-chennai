import type { LucideIcon } from "@/components/icons";
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, size, state } from "@/theme";

type Props = Omit<PressableProps, "style" | "children"> & {
  icon: LucideIcon;
  /** Required: icon-only controls need a spoken name */
  accessibilityLabel: string;
  tone?: "card" | "ink" | "glass";
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon: Icon, tone = "card", style, ...rest }: Props) {
  const bg = tone === "ink" ? colors.ink : tone === "glass" ? "rgba(255,255,255,0.92)" : colors.card;
  const fg = tone === "ink" ? colors.white : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor: tone === "card" ? colors.border : "transparent" },
        pressed && { transform: [{ scale: 0.94 }], opacity: 1 - state.pressedOverlay * 2 },
        style,
      ]}
      {...rest}
    >
      <Icon size={size.iconMd} color={fg} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: size.controlMd,
    height: size.controlMd,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
