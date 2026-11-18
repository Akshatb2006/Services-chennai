import { useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AvailabilityGrid } from "@/features/profile/AvailabilityGrid";
import { useMe, useUpdateMe } from "@/features/session/hooks";
import { ApiError, errorMessage } from "@/services/api/client";
import { colors, layout, radius, space } from "@/theme";

/** Weekly slots + availability switch. The API refuses changes that would break a booked job. */
export default function AvailabilityScreen() {
  const pro = useMe().data?.professional;
  const update = useUpdateMe();
  const [grid, setGrid] = useState(pro?.availability ?? []);
  const [available, setAvailable] = useState(pro?.availabilityStatus === "available");
  const [saved, setSaved] = useState(false);
  if (!pro) return null;

  const affected = update.error instanceof ApiError && update.error.code === "affects_assignments" ? Object.values(update.error.fields ?? {}) : [];
  const save = () => {
    setSaved(false);
    update.mutate({ availability: grid, availabilityStatus: available ? "available" : "unavailable" }, { onSuccess: () => setSaved(true) });
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Availability" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.flex}>
            <AppText variant="heading-sm">Available for new jobs</AppText>
            <AppText variant="body-sm" color="textSecondary">
              Turn off when you&apos;re on leave.
            </AppText>
          </View>
          <Switch accessibilityLabel="Available for new jobs" value={available} onValueChange={setAvailable} trackColor={{ true: colors.citrus, false: colors.borderStrong }} thumbColor={colors.white} {...({ activeThumbColor: colors.ink } as object)} ios_backgroundColor={colors.borderStrong} />
        </View>
        <View style={styles.block}>
          <AppText variant="heading-sm">Weekly slots</AppText>
          <AppText variant="body-sm" color="textSecondary">
            Morning, afternoon and evening on each day you can work.
          </AppText>
          <AvailabilityGrid value={grid} onChange={setGrid} />
        </View>
        {affected.length ? (
          <Notice tone="error">
            {errorMessage(update.error)}
            {"\n"}
            {affected.map((a) => `• ${a}`).join("\n")}
            {"\n"}Contact Homecare to move these jobs, then try again.
          </Notice>
        ) : update.error ? (
          <Notice tone="error">{errorMessage(update.error)}</Notice>
        ) : saved ? (
          <Notice>Saved.</Notice>
        ) : null}
        <PrimaryButton label="Save availability" block loading={update.isPending} onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space[10], gap: space[5] },
  card: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  block: { gap: space[3] },
  flex: { flex: 1 },
});
