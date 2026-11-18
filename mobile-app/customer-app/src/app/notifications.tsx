import { useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { Bell } from "@/components/icons";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useNotifications } from "@/features/notifications/hooks";
import { useSession } from "@/features/profile/session";
import { errorMessage } from "@/services/api/client";
import { colors, layout, radius, space } from "@/theme";

const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function NotificationsScreen() {
  const router = useRouter();
  const { isSignedIn } = useSession();
  const notifications = useNotifications();
  const empty = <EmptyState icon={Bell} title="No notifications yet" body="Updates about your requests will appear here." />;

  let content;
  if (!isSignedIn) content = empty;
  else if (notifications.isPending) content = <LoadingState label="Loading notifications" />;
  else if (notifications.isError) content = <ErrorState message={errorMessage(notifications.error)} onRetry={() => void notifications.refetch()} />;
  else
    content = (
      <FlatList
        data={notifications.data}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: space[3] }} />}
        refreshControl={<RefreshControl refreshing={notifications.isRefetching} onRefresh={() => void notifications.refetch()} tintColor={colors.ink} />}
        ListEmptyComponent={empty}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole={item.requestId ? "button" : undefined}
            disabled={!item.requestId}
            onPress={() => item.requestId && router.push({ pathname: "/requests/[id]", params: { id: item.requestId } })}
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.porcelain }]}
          >
            <AppText variant="heading-sm">{item.title}</AppText>
            <AppText color="textSecondary">{item.body}</AppText>
            <AppText variant="body-sm" color="textSecondary">
              {when.format(new Date(item.createdAt))}
            </AppText>
          </Pressable>
        )}
      />
    );

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Notifications" />
      <View style={styles.flex}>{content}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  flex: { flex: 1, justifyContent: "center" },
  list: { padding: layout.gutter, flexGrow: 1 },
  item: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space[4], gap: space[1] },
});
