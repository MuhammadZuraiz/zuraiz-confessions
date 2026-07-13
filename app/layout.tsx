import type { Metadata } from "next";
import { Fraunces, Courier_Prime } from "next/font/google";
import { config } from "@/lib/config";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-serif",
});

const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-type",
});

export const metadata: Metadata = {
  title: config.siteName,
  description: "A private post office for two.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${courierPrime.variable}`}>
      <body>{children}</body>
    </html>
  );
}
