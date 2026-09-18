import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NU STYL Kundenportal",
  description: "Beiträge & Reels ansehen, freigeben und kommentieren.",
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#17161a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
