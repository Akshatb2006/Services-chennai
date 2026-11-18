import { useState, type ComponentRef, type ReactNode, type Ref } from "react";
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { colors, radius, size, space, type } from "@/theme";
import { AppText } from "./AppText";

type Props = Omit<TextInputProps, "style" | "ref"> & {
  ref?: Ref<ComponentRef<typeof TextInput>>;
  label: string;
  error?: string;
  hint?: string;
  /** Fixed text before the input, e.g. "+91" */
  prefix?: ReactNode;
  multiline?: boolean;
};

/** Labelled input with error/hint text. The label doubles as the accessible name. */
export function TextField({ ref, label, error, hint, prefix, multiline, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText variant="label">{label}</AppText>
      <View style={[styles.field, multiline && styles.multiline, focused && styles.focused, !!error && styles.invalid]}>
        {prefix ? (
          <AppText variant="body-md" style={styles.prefix}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={hint}
          aria-invalid={!!error}
          placeholderTextColor={colors.textSecondary}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
          style={[type["body-md"], styles.input, multiline && styles.inputMultiline]}
        />
      </View>
      {error ? (
        <AppText variant="body-sm" color="error" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="body-sm" color="textSecondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  field: {
    minHeight: size.controlLg,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    gap: space[2],
  },
  multiline: { alignItems: "flex-start", paddingVertical: space[3] },
  focused: { borderColor: colors.ink },
  invalid: { borderColor: colors.error },
  prefix: { color: colors.text },
  // The field border shows focus; drop the browser outline in the web preview.
  input: { flex: 1, color: colors.text, lineHeight: undefined, paddingVertical: 0, minHeight: size.controlLg - 2, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}) },
  inputMultiline: { minHeight: 96 },
});
