# Device test checklist — Customer app & Homecare Pro

**Status:** none of these have been run. The build machine had no Xcode or Android SDK (verified 15 Nov 2026: `xcode-select -p` → Command Line Tools only; no `adb`, `emulator` or `simctl`).

What *was* verified:
- typecheck, lint and Jest suites
- `expo-doctor` (20/20 checks for both apps)
- `expo export` iOS and Android bundles
- browser runs at 390×844 against the real API

## Setup

1. **Builds.** Create development builds; Expo Go isn't enough for release-like behaviour:
   ```bash
   cd mobile-app/customer-app      # and mobile-app/professional-app
   npx eas-cli@latest build --profile development --platform ios
   npx eas-cli@latest build --profile development --platform android
   ```
   `eas.json` and the variant config are committed. The development profile installs as "Homecare (Dev)" /
   "Homecare Pro (Dev)" beside other builds and loads JS from `npx expo start` on the dev machine. The account
   owner still has to run `eas init` once per app (deployment checklist §6.1). iOS builds also need registered
   App IDs, so in practice they wait for the final bundle identifiers.
2. **API.** Run the API reachable from the device (LAN IP or a staging URL).
   - Set `EXPO_PUBLIC_API_BASE_URL` per build.
   - Use `OTP_PROVIDER=console` on **non-production** environments only. Codes then appear in the API logs.
3. **Devices.** Minimum:
   - iPhone with a notch (iOS 17+)
   - iPhone SE-size
   - Android 14 mid-range (gesture navigation)
   - low-end Android 10–11 (3-button navigation)
4. **Test data.** In the dashboard: one verified professional covering pincode `600020`, one customer request assigned and confirmed for tomorrow.

Record each case as Pass, Fail or N/A, with device, OS and build number.

---

## A. Session & secure storage (both apps)

| ID | Steps | Expected |
| --- | --- | --- |
| A1 | Sign in, then force-quit and reopen the app | Opens signed in, with no OTP screen |
| A2 | Sign in, set the device clock +31 days (or wait for expiry in staging with `REFRESH_TOKEN_TTL_DAYS=1`), reopen | Sent to sign-in; no crash or blank screen |
| A3 | Sign in on device X, then sign in with the same number on device Y | Both sessions work independently |
| A4 | In the dashboard (staff), have ops revoke the session (log the user out from another device and replay the token), then use the app | Next API call sends the user to sign-in |
| A5 | Log out, then reopen the app | Signed out; refresh token gone (inspect with a debug build if possible) |
| A6 | Install both apps, sign in to both with the **same** number, then log out of one | The other stays signed in (separate keys and audiences) |
| A7 | iOS: sign in, lock the device, reboot, unlock, open the app | Restores the session (Keychain item is `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`) |
| A8 | iOS: restore the device from an encrypted backup onto a new phone | The session does **not** carry over (`THIS_DEVICE_ONLY`); user signs in again |

## B. OTP entry & keyboard

| ID | Steps | Expected |
| --- | --- | --- |
| B1 | Request a code (staging SMS) | iOS suggests the code above the keyboard; Android autofill / SMS suggestion appears |
| B2 | Type a wrong code | Inline error; the keyboard stays open |
| B3 | Tap "Resend" before 30 s | Disabled, with a countdown |
| B4 | On the iPhone SE, focus the last field on New request (customer) and on Availability (Pro) | Field and primary button stay visible above the keyboard |
| B5 | Android with 3-button navigation: same as B4 | Same; nothing hidden behind the nav bar |
| B6 | Rotate the device (portrait-locked) | Stays portrait |

## C. Safe areas & layout

| ID | Steps | Expected |
| --- | --- | --- |
| C1 | Every tab, on a notched iPhone | No content under the notch or home indicator; the tab bar sits above the home indicator |
| C2 | Customer service detail page | Back button below the status bar; "Request this service" bar above the home indicator |
| C3 | Pro job detail with all three action buttons | Footer above the safe area; the content scrolls behind it |
| C4 | Largest system font size | Text wraps without truncating buttons or cutting labels |
| C5 | VoiceOver / TalkBack: walk the tab bar and the job card | Tabs announced as "Home, tab, 1 of 5"; job cards announced with state |

## D. Navigation & Android back

| ID | Steps | Expected |
| --- | --- | --- |
| D1 | Android: on the Services tab, press Back | Goes to Home, then exits on the next Back |
| D2 | Android: Back on the New request modal | Closes the modal without losing the previous screen |
| D3 | Android: Back on Pro sign-in after "Send code" | App exits (sign-in is the root); no blank screen |
| D4 | Android: predictive back gesture (Android 14) | Normal back (`predictiveBackGestureEnabled: false`) |
| D5 | iOS: swipe-back on stacked screens (service, job, addresses) | Returns to the previous screen |

## E. Phone, Maps & links (Pro app)

| ID | Steps | Expected |
| --- | --- | --- |
| E1 | Confirmed job → "Call +91 …" | Dialler opens with the number |
| E2 | Job awaiting confirmation | No call button; "Contact details are shared once Homecare confirms" |
| E3 | "Open in Maps" | Google Maps (Android) or Maps/Safari (iOS) opens the address |
| E4 | iPad or tablet without telephony: tap Call | "Couldn't open …" alert, no crash |
| E5 | Profile → Privacy / Terms / Help | Browser opens the website pages (placeholder domain until set) |

## F. Offline, timeouts & errors

| ID | Steps | Expected |
| --- | --- | --- |
| F1 | Airplane mode, open the Requests tab (customer) / Jobs tab (Pro) | Friendly "couldn't reach Homecare" error with Retry |
| F2 | Network link conditioner "100% loss" during submit | After about 15 s: "taking too long" message; no double submission |
| F3 | Back online, tap Retry / pull to refresh | Data loads |
| F4 | Airplane mode at cold start while signed in | Shows signed-out or loading without crashing; signs back in automatically on the next launch once online |
| F5 | Stop the API mid-session | Error states, no crash; the session is kept (only a 401 or 422 refresh clears it) |

## G. Professional job lifecycle

| ID | Steps | Expected |
| --- | --- | --- |
| G1 | New assignment (staff assigns) | In-app notification "New job assigned"; the job shows "Awaiting confirmation" |
| G2 | Staff confirms | Notification "Job confirmed"; the phone number is now visible |
| G3 | Before the appointment date, open the job | No Start button; "You can start on the appointment date" |
| G4 | On the appointment date: Start → confirm dialog | State "In progress"; the customer's request shows In progress |
| G5 | Mark completed | State Completed; the customer gets "Service completed" |
| G6 | Staff reassigns the job away | It moves to Cancelled/Reassigned with no address or customer details |
| G7 | Staff suspends the professional | Verification card shows "Account suspended"; job details hidden; Start unavailable |
| G8 | Try to go unavailable with a booked job | Refused, listing the affected job |

## H. Notifications (current state: in-app only)

| ID | Steps | Expected |
| --- | --- | --- |
| H1 | Trigger each notification type | Appears in the in-app list after pull-to-refresh |
| H2 | Check for an OS push | **None expected.** Push isn't integrated. Mark N/A until the push provider work is done. |
| H3 | Day-before reminder: confirmed job for tomorrow, scheduler running | "Job tomorrow" appears once, even with two API instances |

## I. Permissions

| ID | Steps | Expected |
| --- | --- | --- |
| I1 | First launch of each app | **No permission prompts.** Neither app uses camera, photos, location, contacts or notifications yet. |
| I2 | Pro → Documents | Upload buttons disabled, with an explanation; no camera or photo prompt |

When document upload is enabled (`expo-image-picker` / `expo-document-picker`):
- Add `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` (iOS).
- Add Android media permissions through the config plugin.
- Add cases I3–I6: deny, allow, "limited photos" (iOS) and permanently denied (link to Settings).

## J. Install & upgrade

| ID | Steps | Expected |
| --- | --- | --- |
| J1 | Fresh install, low-end Android | Splash → content in under 4 s on 4G; no ANR |
| J2 | Upgrade over the previous build while signed in | Stays signed in |
| J3 | Uninstall and reinstall | Signed out (Android), or signed out after Keychain behaviour on iOS: **record the actual behaviour** |
