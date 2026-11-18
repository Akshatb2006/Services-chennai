import { act } from "@testing-library/react-native";
import { fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";
import { queryClient } from "@/services/api/query-client";
import { useSession } from "@/store/session";
import { createFakeProApi, job, profile, signInDirectly, VALID_CODE } from "./support/fake-pro-api";

const appDir = "./src/app";

beforeEach(() => {
  (SecureStore as unknown as { __store: Map<string, string> }).__store.clear();
  queryClient.clear();
  useSession.setState({ status: "signedOut", accessToken: null });
});
afterEach(() => jest.restoreAllMocks());

const confirmAlerts = () => jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => buttons?.[buttons.length - 1]?.onPress?.());

describe("Homecare Pro app", () => {
  it("sends signed-out users to sign-in", async () => {
    createFakeProApi();
    await renderRouter(appDir, { initialUrl: "/" });
    await waitFor(() => expect(screen).toHavePathname("/sign-in"));
    expect(screen.getByText("Work with Homecare")).toBeTruthy();
  });

  it("signs in a new number, registers, and shows pending verification", async () => {
    const api = createFakeProApi({ professional: null });
    await renderRouter(appDir, { initialUrl: "/sign-in" });
    await fireEvent.changeText(screen.getByLabelText("Mobile number"), "98400 12345");
    await fireEvent.press(screen.getByRole("button", { name: "Send code" }));
    await fireEvent.changeText(await screen.findByLabelText("6-digit code"), VALID_CODE);
    await waitFor(() => expect(screen).toHavePathname("/register"));

    await fireEvent.press(screen.getByRole("button", { name: "Submit for verification" }));
    expect((await screen.findAllByText(/Enter the full name|Choose at least one/)).length).toBeGreaterThan(0);
    await fireEvent.changeText(screen.getByLabelText("Full name"), "Lakshmi Devi");
    await fireEvent.press(screen.getByRole("tab", { name: "Cleaning" }));
    await fireEvent.changeText(screen.getByLabelText("Pincodes you can work in"), "600020, 600041");
    await fireEvent.press(screen.getByRole("button", { name: "Submit for verification" }));

    await waitFor(() => expect(screen).toHavePathname("/"));
    expect(await screen.findByText("Verification pending")).toBeTruthy();
    const post = api.state.calls.find((c) => c.path === "/pro/me" && c.method === "POST");
    expect(post?.body).toMatchObject({ fullName: "Lakshmi Devi", categories: ["cleaning"], pincodes: ["600020", "600041"] });
    expect(post?.body).not.toHaveProperty("verificationStatus");
  });

  it.each([
    ["rejected", "Verification not approved"],
    ["verified", "Verified"],
  ] as const)("explains the %s state", async (status, title) => {
    const api = createFakeProApi({ professional: profile({ verificationStatus: status }) });
    await signInDirectly(api);
    await renderRouter(appDir, { initialUrl: "/" });
    expect(await screen.findByText(title)).toBeTruthy();
  });

  it("shows today's confirmed job from the API, then starts and completes it", async () => {
    const api = createFakeProApi({ jobs: [job()] });
    await signInDirectly(api);
    confirmAlerts();
    await renderRouter(appDir, { initialUrl: "/" });
    await fireEvent.press(await screen.findByTestId(`job-${job().id}`));
    expect(screen).toHavePathname(`/jobs/${job().id}`);
    expect(await screen.findByText("2BHK deep clean, kitchen first")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Call \+91 98400 12345/ })).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Start job" }));
    expect(await screen.findByRole("button", { name: "Mark completed" })).toBeTruthy();
    expect(screen.getAllByText("In progress").length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole("button", { name: "Mark completed" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Mark completed" })).toBeNull());
    // (The launch-time session restore also POSTs /pro/auth/refresh.)
    expect(api.state.calls.filter((c) => c.method === "POST" && c.path.startsWith("/pro/jobs")).map((c) => c.path)).toEqual([`/pro/jobs/${job().id}/start`, `/pro/jobs/${job().id}/complete`]);
  });

  it("explains why a job awaiting confirmation can't start, and hides the customer's phone", async () => {
    const pending = job({ state: "awaiting_confirmation", actions: ["acknowledge"], customer: { firstName: "Kavya", phone: null }, startBlockedReason: "Waiting for Homecare to confirm the appointment with the customer." });
    const api = createFakeProApi({ jobs: [pending] });
    await signInDirectly(api);
    await renderRouter(appDir, { initialUrl: `/jobs/${pending.id}` });
    expect(await screen.findByText(/Waiting for Homecare to confirm/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Start job" })).toBeNull();
    expect(screen.getByText(/Contact details are shared once Homecare confirms/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Got it, I've seen this job" }));
    expect(await screen.findByText(/You acknowledged it/)).toBeTruthy();
  });

  it("shows only jobs the API returns, per tab", async () => {
    const done = job({ id: "00000000-0000-4000-8000-0000000000j2", state: "completed", actions: [], service: "plumbing" });
    const api = createFakeProApi({ jobs: [job(), done] });
    await signInDirectly(api);
    await renderRouter(appDir, { initialUrl: "/jobs" });
    expect(await screen.findByTestId(`job-${job().id}`)).toBeTruthy();
    expect(screen.queryByTestId(`job-${done.id}`)).toBeNull();
    await fireEvent.press(screen.getByRole("tab", { name: "Completed" }));
    expect(await screen.findByTestId(`job-${done.id}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole("tab", { name: "Cancelled" }));
    expect(await screen.findByText("No cancelled jobs")).toBeTruthy();
  });

  it("shows the server's refusal when going unavailable would affect a booked job", async () => {
    const api = createFakeProApi({ jobs: [job()] });
    await signInDirectly(api);
    await renderRouter(appDir, { initialUrl: "/" });
    await act(async () => fireEvent(await screen.findByLabelText("Available for jobs"), "valueChange", false));
    expect(await screen.findByText(/would affect 1 upcoming job/)).toBeTruthy();
    expect(api.state.me.professional?.availabilityStatus).toBe("available");
  });

  it("never shows invented earnings", async () => {
    const api = createFakeProApi();
    await signInDirectly(api);
    await renderRouter(appDir, { initialUrl: "/earnings" });
    expect(await screen.findByText("Earnings aren't available yet")).toBeTruthy();
    expect(screen.queryByText(/₹/)).toBeNull();
  });

  it("lists notifications from the API", async () => {
    const api = createFakeProApi({
      notifications: [{ id: "n1", type: "job_assigned", title: "New job assigned", body: "Deep Cleaning, Mon 16 Nov, morning.", requestId: job().requestId, readAt: null, createdAt: "2026-11-15T09:00:00.000Z" }],
    });
    await signInDirectly(api);
    await renderRouter(appDir, { initialUrl: "/notifications" });
    expect(await screen.findByText("New job assigned")).toBeTruthy();
  });

  it("logs out back to sign-in", async () => {
    const api = createFakeProApi();
    await signInDirectly(api);
    confirmAlerts();
    await renderRouter(appDir, { initialUrl: "/profile" });
    await fireEvent.press(await screen.findByRole("button", { name: "Log out" }));
    await waitFor(() => expect(screen).toHavePathname("/sign-in"));
    expect(useSession.getState().status).toBe("signedOut");
  });
});
