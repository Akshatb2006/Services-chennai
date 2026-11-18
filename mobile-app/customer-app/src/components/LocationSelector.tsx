import { ChevronDown, MapPin } from "@/components/icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { app } from "@/constants/app";
import { colors, radius, space } from "@/theme";
import { AppText } from "./AppText";
import { PrimaryButton } from "./Button";

/**
 * Shows the service city. Homecare only serves Chennai today; exact-area availability is
 * confirmed per request, so no neighbourhood list is invented here.
 */
export function LocationSelector() {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Location: ${app.city}`}
        accessibilityHint="Shows where Homecare is available"
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.6 }]}
      >
        <MapPin size={16} color={colors.ink} strokeWidth={2.25} />
        <AppText variant="heading-sm">{app.city}</AppText>
        <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2.25} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space[5] }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.pin}>
            <MapPin size={22} color={colors.ink} strokeWidth={2} />
          </View>
          <AppText variant="heading-lg" accessibilityRole="header">
            {app.name} is in {app.city}
          </AppText>
          <AppText color="textSecondary" style={styles.copy}>
            We currently serve homes in {app.city}. Availability for your exact area is confirmed when you send a request.
          </AppText>
          <PrimaryButton label="Got it" block onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: space[1], minHeight: 32 },
  backdrop: { flex: 1, backgroundColor: "rgba(23,26,23,0.45)" },
  sheet: {
    backgroundColor: colors.porcelain,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[3],
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: space[3] },
  pin: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.citrus, alignItems: "center", justifyContent: "center" },
  copy: { marginBottom: space[3] },
});
