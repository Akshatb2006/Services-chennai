import type { ProJob } from "@homecare/contracts";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ChevronRight, MapPin } from "@/components/icons";
import { colors, radius, space } from "@/theme";
import { relativeDay, serviceName, slotLabel } from "@/utils/format";
import { jobStateStyles } from "./state";

export function JobStateBadge({ state }: { state: ProJob["state"] }) {
  const s = jobStateStyles[state];
  return (
    <View style={[styles.badge, { backgroundColor: s.background }]} accessibilityLabel={`Status: ${s.label}`}>
      <AppText variant="label" style={{ color: s.foreground, fontSize: 12 }}>
        {s.label}
      </AppText>
    </View>
  );
}

/** Compact job card: when, what, where. */
export function JobCard({ job, onPress }: { job: ProJob; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens job details"
      testID={`job-${job.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.porcelain }]}
    >
      <View style={styles.when}>
        <AppText variant="label" color="textInverse" numberOfLines={1}>
          {relativeDay(job.date)}
        </AppText>
        <AppText variant="body-sm" style={styles.slot}>
          {slotLabel(job.slot)}
        </AppText>
      </View>
      <View style={styles.main}>
        <View style={styles.row}>
          <AppText variant="heading-sm" numberOfLines={1} style={styles.flex}>
            {serviceName(job.service)}
          </AppText>
          <ChevronRight size={18} color={colors.textSecondary} />
        </View>
        {job.address ? (
          <View style={styles.row}>
            <MapPin size={14} color={colors.textSecondary} />
            <AppText variant="body-sm" color="textSecondary" numberOfLines={1} style={styles.flex}>
              {job.address.line1} · {job.address.pincode}
            </AppText>
          </View>
        ) : null}
        <JobStateBadge state={job.state} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: space[3], padding: space[3], backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  when: { width: 84, borderRadius: radius.md, backgroundColor: colors.ink, padding: space[2], justifyContent: "center", gap: 2 },
  slot: { color: colors.citrus },
  main: { flex: 1, gap: 6, alignItems: "flex-start" },
  row: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "stretch" },
  flex: { flex: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: space[2] + 2, paddingVertical: 3 },
});
