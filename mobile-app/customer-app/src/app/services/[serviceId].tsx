import { getCategory, sharedNotes } from "@homecare/catalog";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check, Info } from "@/components/icons";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { ErrorState, LoadingState } from "@/components/States";
import { useService } from "@/features/services/hooks";
import { colors, layout, radius, shadow, space } from "@/theme";

export default function ServiceDetailScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: service, isPending } = useService(serviceId);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (isPending) return <LoadingState label="Loading service" />;
  if (!service) {
    return (
      <SafeAreaView style={styles.root}>
        <ErrorState title="Service not found" message="This service isn't in the catalogue." />
        <View style={styles.center}>
          <SecondaryButton label="Back to services" onPress={() => router.replace("/services")} />
        </View>
      </SafeAreaView>
    );
  }

  const meta = service.meta;
  const facts = [meta?.priceFrom && `From ${meta.priceFrom}`, meta?.duration, meta?.rating != null && `★ ${meta.rating.toFixed(1)}${meta.reviewCount ? ` (${meta.reviewCount})` : ""}`].filter(Boolean);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={service.image} accessibilityLabel={service.alt} contentFit="cover" transition={150} style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.body}>
          <AppText variant="label" color="textSecondary">
            {getCategory(service.category).name}
          </AppText>
          <AppText variant="display-md" accessibilityRole="header" style={styles.name}>
            {service.name}
          </AppText>
          <AppText variant="body-lg" color="textSecondary">
            {service.summary}
          </AppText>
          {facts.length ? (
            <AppText variant="label" style={styles.facts}>
              {facts.join(" · ")}
            </AppText>
          ) : null}
          <AppText style={styles.description}>{service.description}</AppText>

          <Block title="What's included">
            {service.includes.map((item) => (
              <View key={item} style={styles.item}>
                <View style={styles.check}>
                  <Check size={13} color={colors.ink} strokeWidth={3} />
                </View>
                <AppText style={styles.flex}>{item}</AppText>
              </View>
            ))}
          </Block>

          <Block title="Good to know">
            {[...service.goodToKnow, ...sharedNotes].map((item) => (
              <View key={item} style={styles.item}>
                <Info size={18} color={colors.textSecondary} strokeWidth={2} style={styles.infoIcon} />
                <AppText color="textSecondary" style={styles.flex}>
                  {item}
                </AppText>
              </View>
            ))}
          </Block>
        </View>
      </ScrollView>

      <IconButton icon={ArrowLeft} tone="glass" accessibilityLabel="Back" onPress={back} style={[styles.back, { top: insets.top + space[2] }]} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        <PrimaryButton
          label={service.slug === "other-services" ? "Describe what you need" : "Request this service"}
          block
          onPress={() => router.push({ pathname: "/request/new", params: { service: service.slug } })}
        />
      </View>
    </View>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <AppText variant="heading-md" accessibilityRole="header" style={styles.blockTitle}>
        {title}
      </AppText>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  center: { alignItems: "center" },
  hero: { aspectRatio: 4 / 3.2, backgroundColor: colors.stone },
  body: { paddingHorizontal: layout.gutter, paddingTop: space[5] },
  name: { marginTop: space[1], marginBottom: space[2] },
  facts: { marginTop: space[3] },
  description: { marginTop: space[4] },
  block: { marginTop: space[8] },
  blockTitle: { marginBottom: space[4] },
  list: { gap: space[3] },
  item: { flexDirection: "row", gap: space[3], alignItems: "flex-start" },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.citrus,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  infoIcon: { marginTop: 2 },
  flex: { flex: 1 },
  back: { position: "absolute", left: layout.gutter, borderWidth: 0 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.gutter,
    paddingTop: space[3],
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    boxShadow: shadow.raised,
  },
});
