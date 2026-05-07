import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://barterchain-mvp.vercel.app"),
  title: "BarterChain MVP | Multi-hop barter chains",
  description:
    "BarterChain helps people swap useful items through circular multi-hop trade chains instead of hard-to-find direct matches.",
  applicationName: "BarterChain MVP",
  keywords: [
    "barter",
    "circular economy",
    "swap chain",
    "multi-hop trading",
    "reuse",
  ],
  openGraph: {
    title: "BarterChain MVP",
    description:
      "A landing page MVP for circular barter chains that connect multiple people in one trade loop.",
    url: "https://barterchain-mvp.vercel.app",
    siteName: "BarterChain MVP",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BarterChain MVP",
    description:
      "Discover multi-hop barter chains for useful things that deserve a new owner.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

