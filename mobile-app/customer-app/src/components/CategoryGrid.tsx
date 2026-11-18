import type { Category, CategoryId } from "@homecare/catalog";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, radius, space } from "@/theme";
import { AppText } from "./AppText";
import { CategoryIcon } from "./CategoryIcon";

type Props = { categories: readonly Category[]; onSelect: (id: CategoryId) => void };

/** One compact row of category tiles (5 categories fit a 360pt-wide phone). */
export function CategoryGrid({ categories, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {categories.map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          accessibilityLabel={`${c.name} services`}
          onPress={() => onSelect(c.id)}
          style={({ pressed }) => [styles.item, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <View style={[styles.tile, c.id === "other" && styles.tileOther]}>
            <CategoryIcon icon={c.icon} size={24} color={colors.ink} />
          </View>
          <AppText variant="label" numberOfLines={1} style={styles.label}>
            {c.shortName}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: space[2] },
  item: { flex: 1, alignItems: "center", gap: space[2], minWidth: 0 },
  tile: {
    width: "100%",
    maxWidth: 64,
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tileOther: { backgroundColor: colors.stone, borderColor: colors.stone },
  label: { fontSize: 12, textAlign: "center" },
});
