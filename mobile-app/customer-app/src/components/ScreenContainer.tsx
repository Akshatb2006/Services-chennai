import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, layout, space } from "@/theme";

type Props = {
  children: ReactNode;
  /** Wrap content in a ScrollView (default). Use false for screens that own a FlatList. */
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle">;
};

/** Porcelain screen with safe-area handling and the standard 20pt gutter. Tab screens leave the bottom to the tab bar. */
export function ScreenContainer({ children, scroll = true, edges = ["top"], contentStyle, scrollProps }: Props) {
  return (
    <SafeAreaView edges={edges} style={styles.root}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, contentStyle]}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space[8] },
});
