import { fireEvent, render, screen } from "@testing-library/react-native";
import { services as catalog } from "@homecare/catalog";
import { PrimaryButton } from "@/components/Button";
import { CategoryChip } from "@/components/CategoryChip";
import { Inbox } from "@/components/icons";
import { ServiceCard } from "@/components/ServiceCard";
import { EmptyState } from "@/components/States";
import { requestFixtures } from "@/features/requests/__fixtures__/requests";
import { RequestCard } from "@/features/requests/RequestCard";
import { withMedia } from "@/features/services/media";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useRouter: () => ({ push: mockPush }) }));

const deepCleaning = withMedia(catalog.find((s) => s.slug === "deep-cleaning")!);

describe("components", () => {
  beforeEach(() => mockPush.mockClear());

  it("PrimaryButton renders its label and handles presses", async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Send request" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Send request" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("PrimaryButton ignores presses while disabled", async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Send" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Send" }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("ServiceCard shows name and tagline, no meta when none is confirmed, and opens details", async () => {
    await render(<ServiceCard service={deepCleaning} />);
    expect(screen.getByText("Deep Cleaning")).toBeTruthy();
    expect(screen.getByText("Top-to-bottom reset")).toBeTruthy();
    expect(screen.queryByText(/From|★/)).toBeNull();
    await fireEvent.press(screen.getByTestId("service-card-deep-cleaning"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/services/[serviceId]", params: { serviceId: "deep-cleaning" } });
  });

  it("ServiceCard renders business meta only when provided", async () => {
    await render(<ServiceCard service={{ ...deepCleaning, meta: { priceFrom: "₹999", duration: "3 hrs" } }} />);
    expect(screen.getByText("From ₹999 · 3 hrs")).toBeTruthy();
  });

  it("CategoryChip exposes its selected state", async () => {
    await render(<CategoryChip label="Cleaning" selected onPress={() => {}} />);
    expect(screen.getByRole("tab", { name: "Cleaning", selected: true })).toBeTruthy();
  });

  it("EmptyState renders title, body and action", async () => {
    await render(<EmptyState icon={Inbox} title="No requests yet" body="Body copy" action={<PrimaryButton label="Explore" />} />);
    expect(screen.getByText("No requests yet")).toBeTruthy();
    expect(screen.getByText("Body copy")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Explore" })).toBeTruthy();
  });

  it.each(requestFixtures.map((r) => [r.status, r] as const))("RequestCard renders the %s state", async (_status, request) => {
    await render(<RequestCard request={request} />);
    expect(screen.getByText("Deep Cleaning")).toBeTruthy();
    expect(screen.getByLabelText(/^Status: /)).toBeTruthy();
  });
});
