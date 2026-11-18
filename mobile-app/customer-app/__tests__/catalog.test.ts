import { categories, serviceSlugs, services as catalog } from "@homecare/catalog";
import { filterServices } from "@/features/services/filter";
import { withMedia } from "@/features/services/media";

const services = catalog.map(withMedia);
const names = (list: { name: string }[]) => list.map((s) => s.name);

describe("service catalogue", () => {
  it("matches the website taxonomy", () => {
    expect(categories.map((c) => c.id)).toEqual(["cleaning", "household", "laundry", "maintenance", "other"]);
    expect(services).toHaveLength(13);
    expect(services.map((s) => s.slug)).toEqual([...serviceSlugs]);
  });

  it("gives every service its own photo and alt text", () => {
    const images = new Set(services.map((s) => s.image));
    expect(images.size).toBe(services.length);
    services.forEach((s) => expect(s.alt.length).toBeGreaterThan(10));
  });

  it("never ships invented prices, ratings or durations", () => {
    services.forEach((s) => expect(s.meta).toBeUndefined());
  });
});

describe("filterServices", () => {
  it("returns everything for 'all' with no query", () => {
    expect(filterServices(services, { category: "all", query: "" })).toHaveLength(13);
  });

  it("filters by category", () => {
    expect(names(filterServices(services, { category: "cleaning", query: "" }))).toEqual([
      "Home Cleaning",
      "Deep Cleaning",
      "Bathroom Cleaning",
      "Kitchen Cleaning",
    ]);
    expect(names(filterServices(services, { category: "maintenance", query: "" }))).toEqual(["Plumbing", "Electrical", "AC Servicing"]);
  });

  it("searches by word prefix and ranks name matches first", () => {
    const ac = names(filterServices(services, { category: "all", query: "ac" }));
    expect(ac[0]).toBe("AC Servicing");
    expect(ac).not.toContain("Laundry"); // "machine" must not match "ac"
    expect(names(filterServices(services, { category: "all", query: "plumber" }))).toEqual(["Plumbing"]);
    expect(names(filterServices(services, { category: "all", query: "  Deep  " }))[0]).toBe("Deep Cleaning");
  });

  it("combines category and search", () => {
    expect(names(filterServices(services, { category: "laundry", query: "iron" }))).toEqual(["Ironing"]);
    expect(filterServices(services, { category: "laundry", query: "plumb" })).toEqual([]);
  });

  it("returns nothing for unmatched queries", () => {
    expect(filterServices(services, { category: "all", query: "zzzz" })).toEqual([]);
  });
});
