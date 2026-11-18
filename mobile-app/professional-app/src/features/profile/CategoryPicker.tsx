import { categories } from "@homecare/catalog";
import { StyleSheet, View } from "react-native";
import { CategoryChip } from "@/components/CategoryChip";
import { space } from "@/theme";

/** Multi-select service categories (from the shared catalogue). */
export function CategoryPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <View style={styles.wrap} accessibilityRole="list">
      {categories.map((c) => {
        const on = value.includes(c.id);
        return <CategoryChip key={c.id} label={c.name} selected={on} onPress={() => onChange(on ? value.filter((x) => x !== c.id) : [...value, c.id])} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: "row", flexWrap: "wrap", gap: space[2] } });

/** "600020, 600041" → ["600020","600041"] */
export const parsePincodes = (s: string) => [...new Set(s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean))];
