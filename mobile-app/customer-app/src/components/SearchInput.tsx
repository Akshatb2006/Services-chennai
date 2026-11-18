import { Search, X } from "@/components/icons";
import type { ComponentRef, Ref } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { colors, radius, size, space, type } from "@/theme";
import { AppText } from "./AppText";

type Props = Omit<TextInputProps, "style" | "ref"> & {
  ref?: Ref<ComponentRef<typeof TextInput>>;
  value?: string;
  onChangeText?: (text: string) => void;
  /** Render as a tappable field that opens search elsewhere (e.g. on Home). */
  onPressLauncher?: () => void;
};

export function SearchInput({ ref, value = "", onChangeText, onPressLauncher, placeholder = "Search for a service", ...rest }: Props) {
  if (onPressLauncher) {
    return (
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        accessibilityHint="Opens the service catalogue with search"
        onPress={onPressLauncher}
        style={({ pressed }) => [styles.field, pressed && { backgroundColor: colors.porcelain }]}
      >
        <Search size={size.iconMd} color={colors.textSecondary} strokeWidth={2} />
        <AppText color="textSecondary" style={styles.flex} numberOfLines={1}>
          {placeholder}
        </AppText>
      </Pressable>
    );
  }
  return (
    <View style={styles.field}>
      <Search size={size.iconMd} color={colors.textSecondary} strokeWidth={2} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        accessibilityLabel={placeholder}
        style={[type["body-md"], styles.input]}
        {...rest}
      />
      {value.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={12} onPress={() => onChangeText?.("")} style={styles.clear}>
          <X size={size.iconSm} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: size.controlLg,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flex: { flex: 1 },
  input: { flex: 1, color: colors.text, height: "100%", paddingVertical: 0, lineHeight: undefined, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}) },
  clear: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.textSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
});
