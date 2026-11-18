import { useLocalSearchParams } from "expo-router";
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { openExternal } from "@/utils/links";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { Check, CircleCheckBig, Navigation, Phone, Play } from "@/components/icons";
import { Notice } from "@/components/Notice";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { JobStateBadge } from "@/features/jobs/JobCard";
import { useJob, useJobAction } from "@/features/jobs/hooks";
import { jobStateStyles } from "@/features/jobs/state";
import { ApiError, errorMessage } from "@/services/api/client";
import { colors, layout, radius, space } from "@/theme";
import { formatDateTime, formatDay, formatPhone, relativeDay, serviceName, slotLabel } from "@/utils/format";

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const job = useJob(id);
  const act = useJobAction(id);

  if (job.isPending) return <LoadingState label="Loading job" />;
  if (job.isError)
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Job" />
        {job.error instanceof ApiError && job.error.status === 404 ? <ErrorState title="Job not found" message="This job isn't assigned to you." /> : <ErrorState message={errorMessage(job.error)} onRetry={() => void job.refetch()} />}
      </SafeAreaView>
    );

  const j = job.data;
  const confirm = (title: string, body: string, action: "start" | "complete") =>
    Alert.alert(title, body, [
      { text: "Not yet", style: "cancel" },
      { text: title, onPress: () => act.mutate(action) },
    ]);
  const mapsUrl = j.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([j.address.line1, j.address.line2, j.address.city, j.address.pincode].filter(Boolean).join(", "))}` : null;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="Job" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]} refreshControl={<RefreshControl refreshing={job.isRefetching} onRefresh={() => void job.refetch()} tintColor={colors.ink} />}>
        <View style={styles.when}>
          <AppText variant="label" style={{ color: colors.citrus }}>
            {relativeDay(j.date)} · {slotLabel(j.slot)}
          </AppText>
          <AppText variant="display-md" color="textInverse">
            {serviceName(j.service)}
          </AppText>
          <View style={styles.row}>
            <JobStateBadge state={j.state} />
          </View>
          <AppText variant="body-sm" color="textInverseSecondary">
            {jobStateStyles[j.state].hint}
          </AppText>
        </View>

        {j.startBlockedReason && j.state !== "in_progress" ? <Notice>{j.startBlockedReason}</Notice> : null}

        {j.address ? (
          <View style={styles.card}>
            <AppText variant="label" color="textSecondary">
              Service address
            </AppText>
            <AppText>{[j.address.line1, j.address.line2, j.address.landmark].filter(Boolean).join(", ")}</AppText>
            <AppText>
              {j.address.city} {j.address.pincode}
            </AppText>
            {mapsUrl ? <SecondaryButton label="Open in Maps" icon={Navigation} onPress={() => void openExternal(mapsUrl)} /> : null}
          </View>
        ) : null}

        {j.customer ? (
          <View style={styles.card}>
            <AppText variant="label" color="textSecondary">
              Customer
            </AppText>
            <AppText variant="heading-sm">{j.customer.firstName}</AppText>
            {j.customer.phone ? (
              <SecondaryButton label={`Call ${formatPhone(j.customer.phone)}`} icon={Phone} onPress={() => void openExternal(`tel:${j.customer!.phone}`)} />
            ) : (
              <AppText variant="body-sm" color="textSecondary">
                Contact details are shared once Homecare confirms the appointment.
              </AppText>
            )}
          </View>
        ) : null}

        {j.details ? (
          <View style={styles.card}>
            <AppText variant="label" color="textSecondary">
              What the customer needs
            </AppText>
            <AppText>{j.details}</AppText>
            <AppText variant="body-sm" color="textSecondary">
              Customer preferred {formatDay(j.preferredDate)}, {slotLabel(j.preferredTime).toLowerCase()}.
            </AppText>
          </View>
        ) : null}

        <View style={styles.card}>
          <AppText variant="label" color="textSecondary">
            Assignment
          </AppText>
          <AppText variant="body-sm">Assigned {formatDateTime(j.assignedAt)}</AppText>
          <AppText variant="body-sm">{j.acknowledgedAt ? `You acknowledged it ${formatDateTime(j.acknowledgedAt)}` : "Not acknowledged yet"}</AppText>
        </View>

        {act.error ? <Notice tone="error">{errorMessage(act.error)}</Notice> : null}
      </ScrollView>

      {j.actions.length ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
          {j.actions.includes("start") ? (
            <PrimaryButton label="Start job" icon={Play} block loading={act.isPending} onPress={() => confirm("Start job", "Start only when you're at the customer's home and ready to begin.", "start")} />
          ) : null}
          {j.actions.includes("complete") ? (
            <PrimaryButton label="Mark completed" icon={CircleCheckBig} block loading={act.isPending} onPress={() => confirm("Mark completed", "The customer will be told the service is complete.", "complete")} />
          ) : null}
          {j.actions.includes("acknowledge") ? (
            <SecondaryButton label="Got it, I've seen this job" icon={Check} block loading={act.isPending && act.variables === "acknowledge"} onPress={() => act.mutate("acknowledge")} />
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  content: { paddingHorizontal: layout.gutter, gap: space[4] },
  when: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space[5], gap: space[2] },
  row: { flexDirection: "row" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space[4], gap: space[2] },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, gap: space[2], paddingHorizontal: layout.gutter, paddingTop: space[3], backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
});
