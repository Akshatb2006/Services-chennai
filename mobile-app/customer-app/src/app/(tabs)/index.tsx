import { categories } from "@homecare/catalog";
import { useRouter } from "expo-router";
import { ArrowRight, Bell } from "@/components/icons";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { CategoryGrid } from "@/components/CategoryGrid";
import { IconButton } from "@/components/IconButton";
import { LocationSelector } from "@/components/LocationSelector";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SearchInput } from "@/components/SearchInput";
import { SectionHeader } from "@/components/SectionHeader";
import { ServiceCard } from "@/components/ServiceCard";
import { usePopularServices } from "@/features/services/hooks";
import { colors, layout, radius, space } from "@/theme";
import { greeting } from "@/utils/greeting";

export default function HomeScreen() {
  const router = useRouter();
  const popular = usePopularServices();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <AppText variant="body-sm" color="textSecondary">
            {greeting()}
          </AppText>
          <LocationSelector />
        </View>
        <IconButton icon={Bell} accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} />
      </View>

      <AppText variant="display-md" accessibilityRole="header" style={styles.title}>
        What does your home need today?
      </AppText>

      <SearchInput onPressLauncher={() => router.navigate({ pathname: "/services", params: { focus: "1" } })} />

      <View style={styles.section}>
        <SectionHeader title="Explore services" />
        <CategoryGrid categories={categories} onSelect={(id) => router.navigate({ pathname: "/services", params: { category: id } })} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Popular" actionLabel="See all" onAction={() => router.navigate({ pathname: "/services", params: { category: "all" } })} />
        <FlatList
          horizontal
          data={popular.data}
          keyExtractor={(s) => s.slug}
          renderItem={({ item }) => <ServiceCard service={item} variant="rail" />}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: space[3] }} />}
          style={styles.rail}
          contentContainerStyle={{ paddingHorizontal: layout.gutter }}
          accessibilityLabel="Popular services"
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens a request form for a service that isn't listed"
        onPress={() => router.push({ pathname: "/request/new", params: { service: "other-services" } })}
        style={({ pressed }) => [styles.banner, pressed && { backgroundColor: colors.inkRaised }]}
      >
        <View style={styles.bannerText}>
          <AppText variant="heading-md" color="textInverse">
            Need something else?
          </AppText>
          <AppText variant="body-sm" color="textInverseSecondary">
            Describe it and we&apos;ll get back to you.
          </AppText>
        </View>
        <View style={styles.bannerIcon}>
          <ArrowRight size={20} color={colors.ink} strokeWidth={2.25} />
        </View>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: space[3] },
  title: { marginTop: space[6], marginBottom: space[5], maxWidth: 320 },
  section: { marginTop: space[8] },
  rail: { marginHorizontal: -layout.gutter },
  banner: {
    marginTop: space[8],
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: space[5],
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
  },
  bannerText: { flex: 1, gap: 2 },
  bannerIcon: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.citrus, alignItems: "center", justifyContent: "center" },
});
