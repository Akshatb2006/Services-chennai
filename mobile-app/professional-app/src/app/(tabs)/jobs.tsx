import type { ProJobScope } from "@homecare/contracts";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { CategoryChip } from "@/components/CategoryChip";
import { BriefcaseBusiness } from "@/components/icons";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { JobCard } from "@/features/jobs/JobCard";
import { useJobs } from "@/features/jobs/hooks";
import { errorMessage } from "@/services/api/client";
import { colors, layout, space } from "@/theme";

const scopes: { value: ProJobScope; label: string; empty: string }[] = [
  { value: "upcoming", label: "Upcoming", empty: "Jobs Homecare assigns to you appear here." },
  { value: "completed", label: "Completed", empty: "Jobs you complete appear here." },
  { value: "cancelled", label: "Cancelled", empty: "Cancelled or reassigned jobs appear here." },
];

export default function JobsScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<ProJobScope>("upcoming");
  const jobs = useJobs(scope);
  const meta = scopes.find((s) => s.value === scope)!;

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <AppText variant="display-md" accessibilityRole="header" style={styles.title}>
        Jobs
      </AppText>
      <View style={styles.tabs} accessibilityRole="tablist">
        {scopes.map((s) => (
          <CategoryChip key={s.value} label={s.label} selected={scope === s.value} onPress={() => setScope(s.value)} />
        ))}
      </View>
      {jobs.isPending ? (
        <LoadingState label="Loading jobs" />
      ) : jobs.isError ? (
        <ErrorState message={errorMessage(jobs.error)} onRetry={() => void jobs.refetch()} />
      ) : (
        <FlatList
          data={jobs.data}
          keyExtractor={(j) => j.id}
          renderItem={({ item }) => <JobCard job={item} onPress={() => router.push({ pathname: "/jobs/[id]", params: { id: item.id } })} />}
          ItemSeparatorComponent={() => <View style={{ height: space[3] }} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={jobs.isRefetching} onRefresh={() => void jobs.refetch()} tintColor={colors.ink} />}
          ListEmptyComponent={<EmptyState icon={BriefcaseBusiness} title={`No ${meta.label.toLowerCase()} jobs`} body={meta.empty} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  title: { paddingHorizontal: layout.gutter, paddingTop: space[3] },
  tabs: { flexDirection: "row", gap: space[2], paddingHorizontal: layout.gutter, paddingVertical: space[4] },
  list: { paddingHorizontal: layout.gutter, paddingBottom: space[8], flexGrow: 1 },
});
