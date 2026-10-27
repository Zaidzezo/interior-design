import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BuildSpace — Your ideas. To scale.",
  description:
    "A considered space for planning beautiful interiors. Draw, furnish, and explore your design in 2D and 3D.",
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
