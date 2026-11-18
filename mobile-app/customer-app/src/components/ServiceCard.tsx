import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ArrowUpRight } from "@/components/icons";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, size, space } from "@/theme";
import type { Service } from "@/types/service";
import { AppText } from "./AppText";

type Props = {
  service: Service;
  /** grid: fills its column; rail: fixed width for horizontal lists */
  variant?: "grid" | "rail";
  style?: StyleProp<ViewStyle>;
};

/** Compact 4:3 photo card. Meta (price, rating, duration) renders only when the business has confirmed it. */
export function ServiceCard({ service, variant = "grid", style }: Props) {
  const router = useRouter();
  const meta = service.meta;
  const metaLine = [meta?.priceFrom && `From ${meta.priceFrom}`, meta?.duration, meta?.rating != null && `★ ${meta.rating.toFixed(1)}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${service.name}. ${service.tagline}`}
      accessibilityHint="Opens service details"
      testID={`service-card-${service.slug}`}
      onPress={() => router.push({ pathname: "/services/[serviceId]", params: { serviceId: service.slug } })}
      style={({ pressed }) => [styles.card, variant === "rail" ? styles.rail : styles.grid, pressed && styles.pressed, style]}
    >
      <View style={styles.media}>
        <Image
          source={service.image}
          accessibilityLabel={service.alt}
          contentFit="cover"
          transition={150}
          recyclingKey={service.slug}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="heading-sm" numberOfLines={2} style={styles.title}>
            {service.name}
          </AppText>
          {variant === "rail" ? <ArrowUpRight size={size.iconSm} color={colors.textSecondary} strokeWidth={2} /> : null}
        </View>
        <AppText variant="body-sm" color="textSecondary" numberOfLines={1}>
          {service.tagline}
        </AppText>
        {metaLine ? (
          <AppText variant="body-sm" style={styles.meta} numberOfLines={1}>
            {metaLine}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  grid: { flex: 1 },
  rail: { width: 216 },
  pressed: { transform: [{ scale: 0.98 }], borderColor: colors.borderStrong },
  media: { aspectRatio: size.cardImageRatio, backgroundColor: colors.stone },
  body: { paddingHorizontal: space[3], paddingTop: space[3], paddingBottom: space[3] + 2, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: space[1] },
  title: { flex: 1 },
  meta: { marginTop: space[1] },
});
