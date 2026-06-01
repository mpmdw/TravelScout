import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TravelScout",
  description:
    "Map flight routes that avoid dangerous airspace, check flight status, and get live geopolitical risk via Claude.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
