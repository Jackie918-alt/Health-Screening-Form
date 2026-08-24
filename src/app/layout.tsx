import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Rounded geometric display face — the closest web font to the We Kongsi wordmark.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "We Kongsi — Agent Voice Survey | Kaji Selidik Suara Ejen",
  description:
    "Share the challenges you face as a We Kongsi agent and tell us where the company should improve. Kongsi cabaran anda sebagai ejen We Kongsi dan beritahu kami bidang yang perlu kami perbaiki.",
  icons: { icon: "/brand/wekongsi-badge.png" },
};

export const viewport: Viewport = {
  themeColor: "#072438",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-MY"
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
