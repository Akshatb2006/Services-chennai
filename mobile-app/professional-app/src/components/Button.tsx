import type { LucideIcon } from "@/components/icons";
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, size, space, state } from "@/theme";
import { AppText } from "./AppText";

type BaseProps = Omit<PressableProps, "style" | "children"> & {
  label: string;
  icon?: LucideIcon;
  loading?: boolean;
  /** Stretch to the container width */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Electric Citrus fill, Carbon Ink label. One per screen. */
export function PrimaryButton({ label, icon: Icon, loading, disabled, block, style, ...rest }: BaseProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? colors.citrusPressed : colors.citrus },
        pressed && styles.pressed,
        block && styles.block,
        inactive && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={colors.ink} /> : <Content label={label} Icon={Icon} color="textOnAccent" />}
    </Pressable>
  );
}

type SecondaryProps = BaseProps & { tone?: "light" | "dark" };

/** Outline on light surfaces, raised ink on dark. */
export function SecondaryButton({ label, icon: Icon, loading, disabled, block, tone = "light", style, ...rest }: SecondaryProps) {
  const dark = tone === "dark";
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        dark
          ? { backgroundColor: pressed ? colors.ink : colors.inkRaised, borderColor: colors.borderInverse, borderWidth: 1 }
          : { backgroundColor: pressed ? colors.stone : colors.card, borderColor: colors.borderStrong, borderWidth: 1 },
        pressed && styles.pressed,
        block && styles.block,
        inactive && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={dark ? colors.white : colors.ink} /> : <Content label={label} Icon={Icon} color={dark ? "textInverse" : "text"} />}
    </Pressable>
  );
}

function Content({ label, Icon, color }: { label: string; Icon?: LucideIcon; color: "text" | "textInverse" | "textOnAccent" }) {
  return (
    <View style={styles.content}>
      <AppText variant="button" color={color}>
        {label}
      </AppText>
      {Icon ? <Icon size={size.iconSm + 2} color={colors[color]} strokeWidth={2.25} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: size.controlLg,
    paddingHorizontal: space[6],
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  block: { alignSelf: "stretch" },
  content: { flexDirection: "row", alignItems: "center", gap: space[2] },
  pressed: { transform: [{ scale: state.pressedScale }] },
  disabled: { opacity: state.disabledOpacity },
});
