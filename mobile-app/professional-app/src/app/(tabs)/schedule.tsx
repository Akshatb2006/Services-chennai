import { addDays, todayInIndia } from "@homecare/contracts";
import { useRouter } from "expo-router";
import { RefreshControl, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { SecondaryButton } from "@/components/Button";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { ErrorState } from "@/components/States";
import { JobCard } from "@/features/jobs/JobCard";
import { useJobs } from "@/features/jobs/hooks";
import { AvailabilityGrid } from "@/features/profile/AvailabilityGrid";
import { useMe } from "@/features/session/hooks";
import { errorMessage } from "@/services/api/client";
import { colors, radius, space } from "@/theme";
import { relativeDay } from "@/utils/format";

/** Next 14 days of booked jobs, plus the weekly pattern Homecare schedules against. */
export default function ScheduleScreen() {
  const router = useRouter();
  const me = useMe();
  const jobs = useJobs("upcoming");
  const pro = me.data?.professional;
  const today = todayInIndia();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const byDay = days.map((d) => ({ date: d, jobs: (jobs.data ?? []).filter((j) => j.date === d) })).filter((d) => d.jobs.length);
  const later = (jobs.data ?? []).filter((j) => j.date > days[days.length - 1]);

  return (
    <ScreenContainer scrollProps={{ refreshControl: <RefreshControl refreshing={jobs.isRefetching} onRefresh={() => void jobs.refetch()} tintColor={colors.ink} /> }}>
      <AppText variant="display-md" accessibilityRole="header" style={styles.title}>
        Schedule
      </AppText>

      <SectionHeader title="Next 14 days" />
      {jobs.isError ? (
        <ErrorState message={errorMessage(jobs.error)} onRetry={() => void jobs.refetch()} />
      ) : byDay.length ? (
        <View style={styles.days}>
          {byDay.map((d) => (
            <View key={d.date} style={styles.day}>
              <AppText variant="label" color="textSecondary">
                {relativeDay(d.date)}
              </AppText>
              {d.jobs.map((j) => (
                <JobCard key={j.id} job={j} onPress={() => router.push({ pathname: "/jobs/[id]", params: { id: j.id } })} />
              ))}
            </View>
          ))}
          {later.length ? <AppText color="textSecondary">+{later.length} more later. See Jobs.</AppText> : null}
        </View>
      ) : (
        <AppText color="textSecondary" style={styles.empty}>
          {jobs.isPending ? "Loading…" : "Nothing booked in the next two weeks."}
        </AppText>
      )}

      <View style={styles.section}>
        <SectionHeader title="Weekly availability" />
        <View style={styles.card}>
          <AppText variant="body-sm" color="textSecondary">
            {pro?.availabilityStatus === "available" ? "Homecare assigns jobs only in these slots." : "You're marked unavailable, so no new jobs are assigned."}
          </AppText>
          <AvailabilityGrid value={pro?.availability ?? []} />
          <SecondaryButton label="Edit availability" block onPress={() => router.push("/availability")} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: space[3], marginBottom: space[5] },
  days: { gap: space[5] },
  day: { gap: space[2] },
  empty: { marginBottom: space[2] },
  section: { marginTop: space[8] },
  card: { gap: space[4], padding: space[4], borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
});
