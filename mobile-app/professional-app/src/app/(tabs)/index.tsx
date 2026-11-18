import { useRouter } from "expo-router";
import { Pressable, RefreshControl, StyleSheet, Switch, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Bell, BriefcaseBusiness } from "@/components/icons";
import { IconButton } from "@/components/IconButton";
import { Notice } from "@/components/Notice";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState, ErrorState } from "@/components/States";
import { JobCard } from "@/features/jobs/JobCard";
import { useJobs, useNotifications } from "@/features/jobs/hooks";
import { VerificationCard } from "@/features/profile/VerificationCard";
import { useMe, useUpdateMe } from "@/features/session/hooks";
import { errorMessage } from "@/services/api/client";
import { colors, radius, space } from "@/theme";
import { formatDateTime, isToday } from "@/utils/format";
import { greeting } from "@/utils/greeting";

export default function HomeScreen() {
  const router = useRouter();
  const me = useMe();
  const jobs = useJobs("upcoming");
  const notes = useNotifications();
  const update = useUpdateMe();
  const pro = me.data?.professional;
  if (!pro) return null;

  const today = (jobs.data ?? []).filter((j) => isToday(j.date));
  const upcoming = (jobs.data ?? []).filter((j) => !isToday(j.date)).slice(0, 3);
  const unread = (notes.data ?? []).filter((n) => !n.readAt).length;
  const open = (id: string) => router.push({ pathname: "/jobs/[id]", params: { id } });

  return (
    <ScreenContainer
      scrollProps={{ refreshControl: <RefreshControl refreshing={jobs.isRefetching} onRefresh={() => void Promise.all([jobs.refetch(), notes.refetch(), me.refetch()])} tintColor={colors.ink} /> }}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="body-sm" color="textSecondary">
            {greeting()}
          </AppText>
          <AppText variant="heading-lg" numberOfLines={1}>
            {pro.fullName.split(/\s+/)[0]}
          </AppText>
        </View>
        <View>
          <IconButton icon={Bell} accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"} onPress={() => router.push("/notifications")} />
          {unread ? <View style={styles.dot} /> : null}
        </View>
      </View>

      <VerificationCard profile={pro} />

      <View style={styles.availability}>
        <View style={styles.flex}>
          <AppText variant="heading-sm">{pro.availabilityStatus === "available" ? "Available for jobs" : "Not taking jobs"}</AppText>
          <AppText variant="body-sm" color="textSecondary">
            {pro.availabilityStatus === "available" ? "Homecare can assign you jobs in your slots." : "You won't be assigned new jobs."}
          </AppText>
        </View>
        <Switch
          accessibilityLabel="Available for jobs"
          value={pro.availabilityStatus === "available"}
          disabled={update.isPending}
          onValueChange={(on) => update.mutate({ availabilityStatus: on ? "available" : "unavailable" })}
          trackColor={{ true: colors.citrus, false: colors.borderStrong }}
          thumbColor={colors.white}
          {...({ activeThumbColor: colors.ink } as object)}
          ios_backgroundColor={colors.borderStrong}
        />
      </View>
      {update.error ? <Notice tone="error">{errorMessage(update.error)}</Notice> : null}

      <View style={styles.section}>
        <SectionHeader title="Today" />
        {jobs.isError ? (
          <ErrorState message={errorMessage(jobs.error)} onRetry={() => void jobs.refetch()} />
        ) : today.length ? (
          <View style={styles.list}>
            {today.map((j) => (
              <JobCard key={j.id} job={j} onPress={() => open(j.id)} />
            ))}
          </View>
        ) : (
          <AppText color="textSecondary">{jobs.isPending ? "Loading…" : "No jobs today."}</AppText>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Upcoming" actionLabel="All jobs" onAction={() => router.navigate("/jobs")} />
        {upcoming.length ? (
          <View style={styles.list}>
            {upcoming.map((j) => (
              <JobCard key={j.id} job={j} onPress={() => open(j.id)} />
            ))}
          </View>
        ) : jobs.isPending ? null : (
          <EmptyState icon={BriefcaseBusiness} title="No upcoming jobs" body={pro.verificationStatus === "verified" ? "New jobs appear here when Homecare assigns them to you." : "You'll get jobs once you're verified."} />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent activity" actionLabel={notes.data?.length ? "See all" : undefined} onAction={() => router.push("/notifications")} />
        {(notes.data ?? []).slice(0, 3).map((n) => (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            onPress={() => router.push("/notifications")}
            style={({ pressed }) => [styles.note, pressed && { backgroundColor: colors.porcelain }]}
          >
            <AppText variant="heading-sm">{n.title}</AppText>
            <AppText variant="body-sm" color="textSecondary" numberOfLines={2}>
              {n.body}
            </AppText>
            <AppText variant="body-sm" color="textSecondary">
              {formatDateTime(n.createdAt)}
            </AppText>
          </Pressable>
        ))}
        {!notes.isPending && !notes.data?.length ? <AppText color="textSecondary">Nothing yet.</AppText> : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingTop: space[3], marginBottom: space[5], gap: space[3] },
  flex: { flex: 1 },
  dot: { position: "absolute", top: 8, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.error, borderWidth: 2, borderColor: colors.card },
  availability: { flexDirection: "row", alignItems: "center", gap: space[3], marginTop: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  section: { marginTop: space[8] },
  list: { gap: space[3] },
  note: { padding: space[4], borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 2, marginBottom: space[2] },
});
