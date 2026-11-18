import { fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";
import { act } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";
import { queryClient } from "@/services/api/query-client";
import { usePreferences } from "@/store/preferences";
import { useSession } from "@/store/session";
import { chennaiAddress, createFakeApi, pausedServices, signInDirectly, VALID_CODE } from "./support/fake-api";

// Use the real route tree in src/app.
const appDir = "./src/app";

beforeEach(() => {
  usePreferences.setState({ hydrated: true, hasSeenOnboarding: true, hydrate: async () => {} });
  (SecureStore as unknown as { __store: Map<string, string> }).__store.clear();
  // Keep the (static) catalogue cached; drop everything account-related.
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "services" });
  // Session restore runs on mount; with no stored token it settles as signed out.
  useSession.setState({ status: "signedOut", accessToken: null });
  createFakeApi();
});

describe("navigation", () => {
  it("opens on Home with the four tabs", async () => {
    await renderRouter(appDir, { initialUrl: "/" });
    expect(screen).toHavePathname("/");
    expect(screen.getByText("What does your home need today?")).toBeTruthy();
    for (const tab of ["index", "services", "requests", "profile"]) expect(screen.getByTestId(`tab-${tab}`)).toBeTruthy();
  });

  it("switches tabs from the bottom navigation", async () => {
    await renderRouter(appDir, { initialUrl: "/" });
    await fireEvent.press(screen.getByTestId("tab-requests"));
    expect(screen).toHavePathname("/requests");
    expect(await screen.findByText("Sign in to see your requests")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("tab-profile"));
    expect(screen).toHavePathname("/profile");
  });

  it("filters the catalogue from a Home category", async () => {
    await renderRouter(appDir, { initialUrl: "/" });
    await fireEvent.press(screen.getByLabelText("Laundry services"));
    expect(screen).toHavePathname("/services");
    expect(screen).toHaveSearchParams({ category: "laundry" });
    expect(screen.getByTestId("service-card-ironing")).toBeTruthy();
    expect(screen.queryByTestId("service-card-plumbing")).toBeNull();
  });

  it("searches the catalogue and shows an empty state", async () => {
    await renderRouter(appDir, { initialUrl: "/services" });
    await fireEvent.changeText(screen.getByLabelText("Search for a service"), "plumb");
    expect(screen.getByTestId("service-card-plumbing")).toBeTruthy();
    expect(screen.queryByTestId("service-card-deep-cleaning")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Search for a service"), "zzzz");
    expect(screen.getByText("No services match “zzzz”")).toBeTruthy();
  });

  it("opens service details from a card and goes back", async () => {
    await renderRouter(appDir, { initialUrl: "/services" });
    await fireEvent.press(screen.getByTestId("service-card-kitchen-cleaning"));
    expect(screen).toHavePathname("/services/kitchen-cleaning");
    expect(await screen.findByText("What's included")).toBeTruthy();
    expect(screen.getByText("Countertops and backsplash")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Back"));
    expect(screen).toHavePathname("/services");
  });

  it("asks signed-out customers to sign in before requesting", async () => {
    await renderRouter(appDir, { initialUrl: "/services/plumbing" });
    await fireEvent.press(screen.getByRole("button", { name: "Request this service" }));
    expect(screen).toHavePathname("/request/new");
    expect(await screen.findByText("Sign in to send a request")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(screen).toHavePathname("/sign-in");
  });

  it("signs in with a phone number and code, then completes the profile", async () => {
    const api = createFakeApi();
    await renderRouter(appDir, { initialUrl: "/profile" });
    await fireEvent.press(await screen.findByRole("button", { name: "Sign in" }));
    expect(screen).toHavePathname("/sign-in");

    await fireEvent.changeText(screen.getByLabelText("Mobile number"), "98400 12345");
    await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText(/Sent to \+91 98400 12345/)).toBeTruthy();
    expect(api.state.calls[0]).toMatchObject({ path: "/auth/send-otp", body: { phone: "+919840012345" } });

    await fireEvent.changeText(screen.getByLabelText("6-digit code"), "000000");
    expect(await screen.findByText(/incorrect or has expired/)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("6-digit code"), VALID_CODE);

    expect(await screen.findByLabelText("Full name")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Full name"), "Asha Raman");
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen).toHavePathname("/profile"));
    expect(await screen.findByText("Asha Raman")).toBeTruthy();
    expect(useSession.getState().status).toBe("signedIn");
  });

  it("validates the request form, submits a request that is under review, and cancels it", async () => {
    const api = createFakeApi({ profileComplete: true, addresses: [chennaiAddress] });
    await signInDirectly(api);
    const alert = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());

    await renderRouter(appDir, { initialUrl: "/request/new?service=plumbing" });
    expect(await screen.findByRole("tab", { name: "Plumbing", selected: true })).toBeTruthy();
    expect(await screen.findByRole("radio", { checked: true })).toBeTruthy(); // default address preselected

    await fireEvent.press(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByText(/at least 10 characters/)).toBeTruthy();
    expect(api.state.calls.some((c) => c.path === "/requests" && c.method === "POST")).toBe(false);

    await fireEvent.changeText(screen.getByLabelText("What do you need?"), "Kitchen tap is leaking badly");
    await fireEvent.press(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => expect(screen).toHavePathname(`/requests/${api.state.requests[0].id}`));
    expect(api.state.calls.find((c) => c.path === "/requests" && c.method === "POST")?.body).toMatchObject({
      service: "plumbing",
      addressId: chennaiAddress.id,
      preferredTime: "flexible",
      details: "Kitchen tap is leaking badly",
    });
    expect(await screen.findByText("Under review")).toBeTruthy();
    expect(screen.getByText(/isn't a confirmed booking yet/)).toBeTruthy();
    expect(screen.queryByText("Confirmed")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Cancel request" }));
    expect(await screen.findAllByText("Cancelled")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel request" })).toBeNull();
    alert.mockRestore();
  });

  it("hides services that operations has paused", async () => {
    pausedServices.add("laundry");
    queryClient.removeQueries({ queryKey: ["services"] });
    await renderRouter(appDir, { initialUrl: "/services?category=laundry" });
    expect(await screen.findByTestId("service-card-ironing")).toBeTruthy();
    expect(screen.queryByTestId("service-card-laundry")).toBeNull();
    pausedServices.clear();
    queryClient.removeQueries({ queryKey: ["services"] });
  });

  it("lists my requests and opens one", async () => {
    const api = createFakeApi({ profileComplete: true, addresses: [chennaiAddress] });
    await signInDirectly(api);
    await fetch("http://api.test/requests", {
      method: "POST",
      headers: { Authorization: `Bearer ${api.state.accessToken}` },
      body: JSON.stringify({ service: "laundry", addressId: chennaiAddress.id, preferredDate: "2026-11-20", preferredTime: "evening", details: "Two loads of laundry" }),
    });
    await renderRouter(appDir, { initialUrl: "/requests" });
    const card = await screen.findByTestId(`request-${api.state.requests[0].id}`);
    expect(screen.getByText("Laundry")).toBeTruthy();
    await fireEvent.press(card);
    expect(screen).toHavePathname(`/requests/${api.state.requests[0].id}`);
    expect(await screen.findByText("Two loads of laundry")).toBeTruthy();
  });

  it("shows not found for an unknown service", async () => {
    await renderRouter(appDir, { initialUrl: "/services/not-a-service" });
    expect(await screen.findByText("Service not found")).toBeTruthy();
  });

  it("shows onboarding once on first launch", async () => {
    usePreferences.setState({ hydrated: true, hasSeenOnboarding: false });
    await renderRouter(appDir, { initialUrl: "/" });
    expect(await screen.findByText("Your home,\ntaken care of.")).toBeTruthy();
    expect(screen).toHavePathname("/onboarding");
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "Get started" })));
    expect(usePreferences.getState().hasSeenOnboarding).toBe(true);
    expect(screen).toHavePathname("/");
  });
});
