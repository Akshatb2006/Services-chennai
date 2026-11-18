import { Text, type TextProps } from "react-native";
import { colors, type ColorName, type TypeVariant, type as typeStyles } from "@/theme";

type Props = TextProps & { variant?: TypeVariant; color?: ColorName };

/** The only text primitive: applies the shared type scale and Manrope. */
export function AppText({ variant = "body-md", color = "text", style, ...rest }: Props) {
  return <Text {...rest} style={[typeStyles[variant], { color: colors[color] }, style]} />;
}
