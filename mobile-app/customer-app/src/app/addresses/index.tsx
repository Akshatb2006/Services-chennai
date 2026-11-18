import { useRouter } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/Button";
import { MapPin, Plus } from "@/components/icons";
import { Notice } from "@/components/Notice";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { addressLabelNames, formatAddress, useAddresses, useDeleteAddress, useUpdateAddress } from "@/features/addresses/hooks";
import { errorMessage } from "@/services/api/client";
import { colors, layout, radius, space } from "@/theme";
import type { Address } from "@/types/customer";

export default function AddressesScreen() {
  const router = useRouter();
  const addresses = useAddresses();
  const remove = useDeleteAddress();
  const update = useUpdateAddress();

  const confirmDelete = (a: Address) =>
    Alert.alert("Delete address?", formatAddress(a), [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(a.id) },
    ]);

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Saved addresses" />
      {addresses.isPending ? (
        <LoadingState label="Loading addresses" />
      ) : addresses.isError ? (
        <ErrorState message={errorMessage(addresses.error)} onRetry={() => void addresses.refetch()} />
      ) : (
        <FlatList
          data={addresses.data}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: space[3] }} />}
          ListHeaderComponent={remove.error || update.error ? <Notice tone="error">{errorMessage(remove.error ?? update.error)}</Notice> : undefined}
          ListEmptyComponent={<EmptyState icon={MapPin} title="No saved addresses" body="Add the address where you'd like the service." />}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`address-${item.id}`}>
              <View style={styles.cardTop}>
                <AppText variant="heading-sm">{addressLabelNames[item.label]}</AppText>
                {item.isDefault ? (
                  <View style={styles.badge}>
                    <AppText variant="label" style={{ fontSize: 12 }}>
                      Default
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText color="textSecondary">{formatAddress(item)}</AppText>
              <View style={styles.actions}>
                <Action label="Edit" onPress={() => router.push({ pathname: "/addresses/edit", params: { id: item.id } })} />
                {!item.isDefault ? <Action label="Make default" onPress={() => update.mutate({ id: item.id, input: { isDefault: true } })} /> : null}
                <Action label="Delete" destructive onPress={() => confirmDelete(item)} />
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={styles.footer}>
              <PrimaryButton label="Add address" icon={Plus} block onPress={() => router.push("/addresses/edit")} />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function Action({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={styles.action}>
      <AppText variant="label" style={destructive ? { color: colors.error } : undefined}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  list: { paddingHorizontal: layout.gutter, paddingBottom: space[8], gap: space[3], flexGrow: 1 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space[4], gap: space[2] },
  cardTop: { flexDirection: "row", alignItems: "center", gap: space[2] },
  badge: { backgroundColor: colors.citrus, borderRadius: radius.pill, paddingHorizontal: space[2], paddingVertical: 2 },
  actions: { flexDirection: "row", gap: space[5], marginTop: space[1] },
  action: { minHeight: 32, justifyContent: "center" },
  footer: { marginTop: space[5] },
});
