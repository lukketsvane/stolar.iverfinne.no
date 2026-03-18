import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stolar — Stolkatalog",
  description:
    "Visuell database over stolar frå norske og internasjonale samlingar.",
  openGraph: {
    title: "Stolar.",
    description: "Visuell database over stolar.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nn">
      <body
        className={`${sans.variable} font-sans antialiased bg-white text-neutral-900`}
      >
        {children}
        <Script
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
          type="module"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
