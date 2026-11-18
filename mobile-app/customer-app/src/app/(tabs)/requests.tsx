import { useRouter } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/Button";
import { Inbox, UserRound } from "@/components/icons";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useSession } from "@/features/profile/session";
import { useRequests } from "@/features/requests/hooks";
import { RequestCard } from "@/features/requests/RequestCard";
import { errorMessage } from "@/services/api/client";
import { colors, layout, space } from "@/theme";

export default function RequestsScreen() {
  const router = useRouter();
  const { isSignedIn, isRestoring } = useSession();
  const requests = useRequests();

  let content;
  if (isRestoring) content = <LoadingState label="Restoring your session" />;
  else if (!isSignedIn)
    content = (
      <EmptyState
        icon={UserRound}
        title="Sign in to see your requests"
        body="Follow each request from review to completion."
        action={<PrimaryButton label="Sign in" onPress={() => router.push("/sign-in")} />}
      />
    );
  else if (requests.isPending) content = <LoadingState label="Loading your requests" />;
  else if (requests.isError) content = <ErrorState message={errorMessage(requests.error)} onRetry={() => void requests.refetch()} />;
  else
    content = (
      <FlatList
        data={requests.items}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <RequestCard request={item} onPress={() => router.push({ pathname: "/requests/[id]", params: { id: item.id } })} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: space[3] }} />}
        refreshControl={<RefreshControl refreshing={requests.isRefetching && !requests.isFetchingNextPage} onRefresh={() => void requests.refetch()} tintColor={colors.ink} />}
        onEndReached={() => requests.hasNextPage && !requests.isFetchingNextPage && requests.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={requests.isFetchingNextPage ? <LoadingState label="Loading more" /> : undefined}
        ListEmptyComponent={
          <EmptyState
            icon={Inbox}
            title="No requests yet"
            body="When you request a service, you can follow it here, from review to completion."
            action={<PrimaryButton label="Explore services" onPress={() => router.navigate("/services")} />}
          />
        }
      />
    );

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <AppText variant="display-md" accessibilityRole="header" style={styles.title}>
        Requests
      </AppText>
      <View style={styles.flex}>{content}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  title: { paddingHorizontal: layout.gutter, paddingTop: space[3] },
  flex: { flex: 1, justifyContent: "center" },
  list: { padding: layout.gutter, flexGrow: 1 },
});
