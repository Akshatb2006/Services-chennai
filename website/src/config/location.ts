/** Operating market configuration. Chennai is the launch city. */
export const location = {
  city: "Chennai",
  region: "Tamil Nadu",
  country: "India",
  coordinates: "13.0827° N · 80.2707° E",
  status: "Launching",
  /**
   * Neighbourhoods are listed ONLY once the business confirms coverage.
   * Leave empty until then — the UI shows "confirmed on enquiry" instead.
   */
  confirmedAreas: [] as string[],
};
