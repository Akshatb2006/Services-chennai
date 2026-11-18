import { useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { Bell } from "@/components/icons";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useJobs, useNotifications } from "@/features/jobs/hooks";
import { errorMessage } from "@/services/api/client";
import { colors, layout, radius, space } from "@/theme";
import { formatDateTime } from "@/utils/format";

/** In-app notifications (push isn't connected yet; this list is the source of truth). */
export default function NotificationsScreen() {
  const router = useRouter();
  const notes = useNotifications();
  const jobs = useJobs("all");
  const jobFor = (requestId: string | null) => jobs.data?.find((j) => j.requestId === requestId && j.state !== "reassigned" && j.state !== "cancelled") ?? jobs.data?.find((j) => j.requestId === requestId);

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Notifications" />
      {notes.isPending ? (
        <LoadingState />
      ) : notes.isError ? (
        <ErrorState message={errorMessage(notes.error)} onRetry={() => void notes.refetch()} />
      ) : (
        <FlatList
          data={notes.data}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: space[3] }} />}
          refreshControl={<RefreshControl refreshing={notes.isRefetching} onRefresh={() => void notes.refetch()} tintColor={colors.ink} />}
          ListEmptyComponent={<EmptyState icon={Bell} title="No notifications yet" body="New jobs, confirmations and changes appear here." />}
          renderItem={({ item }) => {
            const job = jobFor(item.requestId);
            return (
              <Pressable
                accessibilityRole={job ? "button" : undefined}
                disabled={!job}
                onPress={() => job && router.push({ pathname: "/jobs/[id]", params: { id: job.id } })}
                style={({ pressed }) => [styles.item, !item.readAt && styles.unread, pressed && { backgroundColor: colors.porcelain }]}
              >
                <AppText variant="heading-sm">{item.title}</AppText>
                <AppText color="textSecondary">{item.body}</AppText>
                <AppText variant="body-sm" color="textSecondary">
                  {formatDateTime(item.createdAt)}
                </AppText>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  list: { padding: layout.gutter, flexGrow: 1 },
  item: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space[4], gap: space[1] },
  unread: { borderLeftWidth: 4, borderLeftColor: colors.citrus },
});
