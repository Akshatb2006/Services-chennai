import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Build variants on top of app.json (which holds the app's identity). eas.json sets APP_VARIANT per profile:
 *
 *   development  name "… (Dev)",     identifiers + ".dev",     scheme + "-dev"      (installs beside the others)
 *   preview      name "… (Preview)", identifiers + ".preview", scheme + "-preview"
 *   production   app.json unchanged
 *   (unset)      app.json unchanged: local `expo start`, tests and CI exports
 *
 * Production builds refuse to start while anything is still a placeholder, so a store binary can't be made
 * with the example identifiers, the example website or a missing / non-HTTPS API URL.
 */
const VARIANTS = {
  development: { id: ".dev", name: " (Dev)", scheme: "-dev" },
  preview: { id: ".preview", name: " (Preview)", scheme: "-preview" },
} as const;

const PLACEHOLDER_ID = /^com\.example\./;

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  const variant = process.env.APP_VARIANT;

  if (variant === "production") assertReleasable(base);
  const v = variant === "development" || variant === "preview" ? VARIANTS[variant] : null;
  if (!v) return base;

  return {
    ...base,
    name: base.name + v.name,
    scheme: `${String(base.scheme)}${v.scheme}`,
    ios: { ...base.ios, bundleIdentifier: base.ios?.bundleIdentifier + v.id },
    android: { ...base.android, package: base.android?.package + v.id },
  };
};

function assertReleasable(base: ExpoConfig) {
  const problems: string[] = [];
  for (const [label, id] of [
    ["ios.bundleIdentifier", base.ios?.bundleIdentifier],
    ["android.package", base.android?.package],
  ] as const) {
    if (!id || PLACEHOLDER_ID.test(id)) problems.push(`${label} is the placeholder "${id}". Set the final identifier in app.json (permanent once published).`);
  }
  // Environment values come from the EAS "production" environment (eas env:create). They are definitely
  // present on the EAS build server; the local pre-upload evaluation may not have them, so check them there.
  if (process.env.EAS_BUILD === "true") {
    if (!/^https:\/\/[^/]+$/.test(process.env.EXPO_PUBLIC_API_BASE_URL ?? "")) {
      problems.push("EXPO_PUBLIC_API_BASE_URL must be the API's https:// origin (no path or trailing slash).");
    }
    const web = process.env.EXPO_PUBLIC_WEB_URL ?? "";
    if (!/^https:\/\//.test(web) || web.includes("example.com")) {
      problems.push("EXPO_PUBLIC_WEB_URL must be the real https:// website (privacy policy and terms links).");
    }
  }
  if (problems.length) {
    throw new Error(`Refusing to configure a production build of ${base.name}:\n- ${problems.join("\n- ")}`);
  }
}
