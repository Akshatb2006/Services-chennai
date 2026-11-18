import { tokens } from "@homecare/design-system";
import { colors, fontFamily, radius, shadow, size, space, type } from "@/theme";

describe("design tokens", () => {
  it("uses the approved brand palette from the shared design system", () => {
    expect(colors.ink).toBe("#171A17");
    expect(colors.citrus).toBe("#D5F36A");
    expect(colors.porcelain).toBe("#F5F3EC");
    expect(colors.card).toBe("#FFFFFF");
    expect(colors.olive).toBe("#92988A");
    expect(colors.stone).toBe("#E8E5DA");
    // single source of truth: theme values come straight from the shared tokens
    expect(colors.ink).toBe(tokens.color.brand.ink);
    expect(radius).toBe(tokens.radius);
    expect(space).toBe(tokens.space);
  });

  it("converts the type scale to React Native units", () => {
    expect(type["display-md"].fontSize).toBe(28); // mobile size
    expect(type["body-md"]).toMatchObject({ fontSize: 15, lineHeight: 23, fontFamily: fontFamily[400] });
    expect(type["heading-md"].fontFamily).toBe("Manrope_600SemiBold");
    expect(type["display-lg"].letterSpacing).toBeCloseTo(34 * -0.04);
    for (const style of Object.values(type)) {
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize as number);
    }
  });

  it("exposes component sizes that meet touch-target guidance", () => {
    expect(size.controlLg).toBeGreaterThanOrEqual(tokens.layout["touch-target-min"]);
    expect(size.controlMd).toBeGreaterThanOrEqual(tokens.layout["touch-target-min"]);
    expect(shadow.card).toMatch(/px .*#171A17/);
  });
});
