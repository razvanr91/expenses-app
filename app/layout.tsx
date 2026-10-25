import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fieldnote Income — a clearer view of what you earn",
  description: "A calm, private place to keep track of your income in GBP.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
