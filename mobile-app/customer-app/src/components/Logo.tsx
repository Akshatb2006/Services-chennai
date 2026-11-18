import { StyleSheet, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { app } from "@/constants/app";
import { colors, fontFamily } from "@/theme";
import { AppText } from "./AppText";

/** Temporary mark (roofline on a citrus tile), identical to the website's. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Rect width={28} height={28} rx={8} fill={colors.citrus} />
      <Path d="M7.5 14.5 14 9l6.5 5.5M10 13v6.5h8V13" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Wordmark({ tone = "dark", size = 28 }: { tone?: "dark" | "light"; size?: number }) {
  return (
    <View style={styles.row} accessible accessibilityRole="image" accessibilityLabel={app.name}>
      <LogoMark size={size} />
      <AppText
        color={tone === "light" ? "textInverse" : "text"}
        style={{ fontFamily: fontFamily[700], fontSize: size * 0.68, lineHeight: size, letterSpacing: -0.02 * size * 0.68 }}
      >
        {app.name}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 8 } });
