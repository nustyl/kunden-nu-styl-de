import { ImageResponse } from "next/og";

// Icon für "Zum Home-Bildschirm" auf iPhone/iPad (Safari kann kein SVG-Icon).
// Gleiches Motiv wie icon.svg; iOS rundet die Ecken selbst ab.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FF5A1F",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 100 100">
          <path d="M31 70V30h10.5L59 55.5V30h10v40H58.5L41 44.5V70z" fill="#fff" />
        </svg>
      </div>
    ),
    size
  );
}
