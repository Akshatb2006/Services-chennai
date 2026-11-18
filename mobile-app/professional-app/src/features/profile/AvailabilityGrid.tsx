import { timeSlots, weekdayLabels, type TimeSlot } from "@homecare/contracts";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Check } from "@/components/icons";
import { colors, radius } from "@/theme";
import { slotLabel } from "@/utils/format";

type Slot = { weekday: number; slot: TimeSlot };

/** Weekly working pattern: 7 days × 3 slots, 44pt cells. Read-only when onChange is omitted. */
export function AvailabilityGrid({ value, onChange }: { value: Slot[]; onChange?: (v: Slot[]) => void }) {
  const has = (weekday: number, slot: TimeSlot) => value.some((a) => a.weekday === weekday && a.slot === slot);
  const toggle = (weekday: number, slot: TimeSlot) =>
    onChange?.(has(weekday, slot) ? value.filter((a) => !(a.weekday === weekday && a.slot === slot)) : [...value, { weekday, slot }]);
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <View style={styles.label} />
        {weekdayLabels.map((d) => (
          <AppText key={d} variant="label" color="textSecondary" style={styles.head}>
            {d.slice(0, 2)}
          </AppText>
        ))}
      </View>
      {timeSlots.map((slot) => (
        <View key={slot} style={styles.row}>
          <AppText variant="label" style={styles.label}>
            {slotLabel(slot).slice(0, 3)}
          </AppText>
          {weekdayLabels.map((d, weekday) => {
            const on = has(weekday, slot);
            return (
              <Pressable
                key={d}
                disabled={!onChange}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: !onChange }}
                accessibilityLabel={`${d} ${slot}`}
                onPress={() => toggle(weekday, slot)}
                style={[styles.cell, on && styles.cellOn]}
              >
                {on ? <Check size={16} color={colors.ink} strokeWidth={3} /> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  label: { width: 36 },
  head: { flex: 1, textAlign: "center", fontSize: 12 },
  cell: { flex: 1, height: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  cellOn: { backgroundColor: colors.citrus, borderColor: colors.citrus },
});

export const everyDay = (slots: TimeSlot[] = ["morning", "afternoon"]): Slot[] => [1, 2, 3, 4, 5, 6].flatMap((weekday) => slots.map((slot) => ({ weekday, slot })));
