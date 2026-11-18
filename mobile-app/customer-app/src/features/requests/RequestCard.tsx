import { getService } from "@homecare/catalog";
import { ChevronRight } from "@/components/icons";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { colors, radius, space } from "@/theme";
import type { RequestStatus, ServiceRequest } from "@/types/request";
import { formatPreferredDate, preferredTimeLabels } from "./schema";
import { requestStatusStyles } from "./status";

export function StatusBadge({ status }: { status: RequestStatus }) {
  const s = requestStatusStyles[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.background }]} accessibilityLabel={`Status: ${s.label}`}>
      <AppText variant="label" style={{ color: s.foreground, fontSize: 12 }}>
        {s.label}
      </AppText>
    </View>
  );
}

/** One request in the list. Rendered only from real API data. */
export function RequestCard({ request, onPress }: { request: ServiceRequest; onPress?: () => void }) {
  const service = getService(request.service);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens request details"
      onPress={onPress}
      testID={`request-${request.id}`}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.porcelain }]}
    >
      <View style={styles.main}>
        <View style={styles.row}>
          <AppText variant="heading-sm" style={styles.flex} numberOfLines={1}>
            {service?.name ?? "Service request"}
          </AppText>
          <StatusBadge status={request.status} />
        </View>
        <AppText variant="body-sm" color="textSecondary">
          {request.appointment
            ? `${formatPreferredDate(request.appointment.date)} · ${preferredTimeLabels[request.appointment.slot]}${request.appointment.confirmed ? "" : " (to be confirmed)"}`
            : `${formatPreferredDate(request.preferredDate)} · ${preferredTimeLabels[request.preferredTime]}`}
        </AppText>
        <AppText variant="body-sm" color="textSecondary" numberOfLines={1}>
          {request.address.line1}
        </AppText>
      </View>
      <ChevronRight size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[4],
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  main: { flex: 1, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: space[2] },
  flex: { flex: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: space[2] + 2, paddingVertical: 4 },
});
