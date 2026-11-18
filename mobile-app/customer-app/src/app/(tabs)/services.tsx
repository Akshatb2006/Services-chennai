import { categories, type CategoryId } from "@homecare/catalog";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SearchX } from "@/components/icons";
import { useCallback, useRef, useState, type ComponentRef } from "react";
import { FlatList, ScrollView, StyleSheet, View, type TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/Button";
import { CategoryChip } from "@/components/CategoryChip";
import { SearchInput } from "@/components/SearchInput";
import { ServiceCard } from "@/components/ServiceCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { filterServices } from "@/features/services/filter";
import { useServices } from "@/features/services/hooks";
import { colors, layout, space } from "@/theme";

const isCategory = (v: string | undefined): v is CategoryId => categories.some((c) => c.id === v);

export default function ServicesScreen() {
  const router = useRouter();
  // The selected category lives in the URL, so Home can deep-link straight to a filter.
  const params = useLocalSearchParams<{ category?: string; focus?: string }>();
  const category = isCategory(params.category) ? params.category : "all";
  const [query, setQuery] = useState("");
  const searchRef = useRef<ComponentRef<typeof TextInput>>(null);
  const { data, isPending, isError, refetch } = useServices();

  useFocusEffect(
    useCallback(() => {
      if (params.focus === "1") {
        const t = setTimeout(() => searchRef.current?.focus(), 250);
        router.setParams({ focus: undefined });
        return () => clearTimeout(t);
      }
    }, [params.focus, router]),
  );

  const results = data ? filterServices(data, { category, query }) : [];
  const select = (id: CategoryId | "all") => router.setParams({ category: id });

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.top}>
        <AppText variant="display-md" accessibilityRole="header">
          Services
        </AppText>
        <SearchInput ref={searchRef} value={query} onChangeText={setQuery} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        <CategoryChip label="All" selected={category === "all"} onPress={() => select("all")} />
        {categories.map((c) => (
          <CategoryChip key={c.id} label={c.name} selected={category === c.id} onPress={() => select(c.id)} />
        ))}
      </ScrollView>

      {isPending ? (
        <LoadingState label="Loading services" />
      ) : isError ? (
        <ErrorState message="We couldn't load services. Check your connection and try again." onRetry={refetch} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(s) => s.slug}
          numColumns={2}
          renderItem={({ item }) => <ServiceCard service={item} />}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          ListEmptyComponent={
            <EmptyState
              icon={SearchX}
              title={`No services match “${query.trim()}”`}
              body="Try another word, or tell us what you need and we'll get back to you."
              action={
                <PrimaryButton
                  label="Describe what you need"
                  onPress={() => router.push({ pathname: "/request/new", params: { service: "other-services" } })}
                />
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  top: { paddingHorizontal: layout.gutter, paddingTop: space[3], gap: space[4] },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: space[2], paddingHorizontal: layout.gutter, paddingVertical: space[4] },
  list: { paddingHorizontal: layout.gutter, paddingBottom: space[8], gap: space[3], flexGrow: 1 },
  column: { gap: space[3] },
});
