import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";
import { location } from "@/config/location";

export const alt = `${brand.name} — Home services in ${location.city}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          color: "white",
          background: "radial-gradient(60% 70% at 85% 30%, rgba(213,243,106,0.22), transparent 70%), #171A17",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, fontWeight: 600 }}>{brand.name}</div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 84, lineHeight: 1.02, letterSpacing: -3 }}>
          <span>Your home deserves</span>
          <span style={{ color: "#D5F36A" }}>better care.</span>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#D5F36A" }}>{`Home services in ${location.city}`}</div>
      </div>
    ),
    size,
  );
}
