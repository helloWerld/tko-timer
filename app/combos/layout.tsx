import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

// Brand-pinned Jabster fonts (OFL, copied from the Jabster style-guide repo):
// Anton for headlines + big numbers, Barlow SemiCondensed for subtext.
const anton = localFont({
  src: "./fonts/Anton-Regular.ttf",
  variable: "--font-anton",
  display: "swap",
});
const barlow = localFont({
  src: [
    { path: "./fonts/BarlowSemiCondensed-SemiBold.ttf", weight: "600" },
    { path: "./fonts/BarlowSemiCondensed-Bold.ttf", weight: "700" },
  ],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jabster Combo Trainer",
  description:
    "309 progressive punch-combo reels with voice callouts — pick a reel, follow the ladder.",
};

export const viewport: Viewport = {
  themeColor: "#F2ECD8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function CombosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${anton.variable} ${barlow.variable}`}>{children}</div>
  );
}
