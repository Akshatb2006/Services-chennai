import { getService } from "@homecare/catalog";
import { useLocalSearchParams } from "expo-router";
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { SecondaryButton } from "@/components/Button";
import { CircleAlert } from "@/components/icons";
import { Notice } from "@/components/Notice";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { addressLabelNames, formatAddress } from "@/features/addresses/hooks";
import { useSession } from "@/features/profile/session";
import { useCancelRequest, useRequest, useRequestHistory } from "@/features/requests/hooks";
import { StatusBadge } from "@/features/requests/RequestCard";
import { formatPreferredDate, preferredTimeLabels } from "@/features/requests/schema";
import { requestStatusStyles } from "@/features/requests/status";
import { ApiError, errorMessage } from "@/services/api/client";
import { colors, layout, radius, space } from "@/theme";

const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function RequestDetailScreen() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const { isSignedIn } = useSession();
  const request = useRequest(id);
  const history = useRequestHistory(id);
  const cancel = useCancelRequest(id);

  const confirmCancel = () =>
    Alert.alert("Cancel this request?", "You can send a new request any time.", [
      { text: "Keep request", style: "cancel" },
      { text: "Cancel request", style: "destructive", onPress: () => cancel.mutate(undefined) },
    ]);

  let content;
  if (!isSignedIn) content = <EmptyState icon={CircleAlert} title="Sign in to view this request" />;
  else if (request.isPending) content = <LoadingState label="Loading request" />;
  else if (request.isError)
    content =
      request.error instanceof ApiError && request.error.status === 404 ? (
        <ErrorState title="Request not found" message="It may have been removed, or it belongs to another account." />
      ) : (
        <ErrorState message={errorMessage(request.error)} onRetry={() => void request.refetch()} />
      );
  else {
    const r = request.data;
    const status = requestStatusStyles[r.status];
    content = (
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={request.isRefetching} onRefresh={() => void Promise.all([request.refetch(), history.refetch()])} tintColor={colors.ink} />}
      >
        {created ? <Notice>Request sent. We&apos;ll review it and update you here. It isn&apos;t a confirmed booking yet.</Notice> : null}
        <View style={styles.head}>
          <AppText variant="display-md" accessibilityRole="header">
            {getService(r.service)?.name ?? "Service request"}
          </AppText>
          <StatusBadge status={r.status} />
          <AppText color="textSecondary">{status.description}</AppText>
        </View>

        {r.appointment ? (
          <View style={[styles.card, r.appointment.confirmed && styles.appointmentConfirmed]}>
            <Row
              label={r.appointment.confirmed ? "Appointment confirmed" : "Proposed appointment (not yet confirmed)"}
              value={`${formatPreferredDate(r.appointment.date)} · ${preferredTimeLabels[r.appointment.slot]}`}
            />
            <Row label="Professional" value={r.appointment.professionalFirstName} />
          </View>
        ) : null}

        <View style={styles.card}>
          <Row label="You asked for" value={`${formatPreferredDate(r.preferredDate)} · ${preferredTimeLabels[r.preferredTime]}`} />
          <Row label={addressLabelNames[r.address.label]} value={formatAddress(r.address)} />
          <Row label="Details" value={r.details} />
          {r.cancelReason ? <Row label="Cancellation reason" value={r.cancelReason} /> : null}
        </View>

        <View style={styles.section}>
          <AppText variant="heading-md" accessibilityRole="header">
            History
          </AppText>
          {history.isPending ? (
            <LoadingState label="Loading history" />
          ) : history.isError ? (
            <Notice tone="error">{errorMessage(history.error)}</Notice>
          ) : (
            <View style={styles.timeline}>
              {history.data.map((e, i) => (
                <View key={e.id} style={styles.event}>
                  <View style={styles.rail}>
                    <View style={[styles.dot, i === history.data.length - 1 && styles.dotCurrent]} />
                    {i < history.data.length - 1 ? <View style={styles.line} /> : null}
                  </View>
                  <View style={styles.eventBody}>
                    <AppText variant="heading-sm">{requestStatusStyles[e.toStatus].label}</AppText>
                    <AppText variant="body-sm" color="textSecondary">
                      {when.format(new Date(e.createdAt))}
                      {e.note ? ` · ${e.note}` : ""}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {cancel.error ? <Notice tone="error">{errorMessage(cancel.error)}</Notice> : null}
        {r.canCancel ? <SecondaryButton label="Cancel request" block loading={cancel.isPending} onPress={confirmCancel} /> : null}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Request" />
      {content}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space[10], gap: space[6] },
  head: { gap: space[2], alignItems: "flex-start" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space[4], gap: space[4] },
  appointmentConfirmed: { borderColor: colors.ink, borderWidth: 2 },
  row: { gap: 2 },
  section: { gap: space[4] },
  timeline: { gap: 0 },
  event: { flexDirection: "row", gap: space[3] },
  rail: { alignItems: "center", width: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.borderStrong, marginTop: 4 },
  dotCurrent: { backgroundColor: colors.ink },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  eventBody: { flex: 1, paddingBottom: space[4], gap: 2 },
});
