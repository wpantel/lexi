import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

// Display face for headings and numerals. Body text and Hangul stay on system fonts.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Lexi",
  description: "Learn the 1,000 most useful words of a new language with spaced repetition.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: "#f4f6fb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={display.variable}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
