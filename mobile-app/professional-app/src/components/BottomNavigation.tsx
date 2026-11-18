import type { BottomTabBarProps } from "expo-router/js-tabs";
import { BriefcaseBusiness, CalendarDays, House, UserRound, Wallet, type LucideIcon } from "@/components/icons";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { colors, radius, size, space } from "@/theme";
import { AppText } from "./AppText";

/** Route name → icon. Labels come from each screen's `title`. */
export const tabIcons: Record<string, LucideIcon> = {
  index: House,
  jobs: BriefcaseBusiness,
  schedule: CalendarDays,
  earnings: Wallet,
  profile: UserRound,
};

/**
 * Custom bottom navigation (same system as the customer app, in the Pro app's operational dark
 * variant): Carbon Ink bar, citrus pill behind the active icon, 64pt + safe-area inset.
 */
export function BottomNavigation({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space[2]) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const focused = index === state.index;
        const { options } = descriptors[route.key];
        const label = typeof options.title === "string" ? options.title : route.name;
        const Icon = tabIcons[route.name] ?? House;

        const onPress = () => {
          const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={Platform.OS === "ios" ? `${label}, tab, ${index + 1} of ${state.routes.length}` : label}
            testID={`tab-${route.name}`}
            onPress={onPress}
            onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
            android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: true, radius: 40 }}
            style={styles.item}
          >
            <View style={[styles.indicator, focused && styles.indicatorActive]}>
              <Icon size={size.iconMd + 2} color={focused ? colors.ink : colors.textInverseSecondary} strokeWidth={focused ? 2.25 : 1.9} />
            </View>
            <AppText variant="label" color={focused ? "textInverse" : "textInverseSecondary"} style={styles.label} numberOfLines={1}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.ink,
    paddingTop: space[2],
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: size.tabBar - space[2], gap: 3 },
  indicator: { width: 56, height: 30, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  indicatorActive: { backgroundColor: colors.citrus },
  label: { fontSize: 11 },
});
