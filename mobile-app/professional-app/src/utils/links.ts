import { Alert, Linking } from "react-native";

/**
 * Opens a phone, maps or web link. If the device can't handle it (no dialler on a tablet,
 * no browser profile, simulator), tells the person instead of failing silently.
 */
export async function openExternal(url: string, what = "this link") {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Couldn't open " + what, url.startsWith("tel:") ? `Call ${url.slice(4)} from your phone app.` : url);
  }
}
