import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const defaultTitle = "花蓮災情即時通報｜志工協作與救援進度地圖";
const defaultDescription = "花蓮災情回報平台，整合志工通報、現場照片與救援狀態，支援地圖定位、案件更新與完成標記，協助救援團隊快速掌握即時需求。";
const defaultKeywords = ["花蓮災情", "災害通報", "志工協作", "救援進度", "即時地圖", "災難應變", "救援平台"];
const siteUrl = "https://hualien-disaster-relief-app.liwei-cup.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s｜花蓮災情即時通報",
  },
  description: defaultDescription,
  keywords: defaultKeywords,
  applicationName: "花蓮災情即時通報",
  authors: [{ name: "花蓮災情協作團隊" }],
  creator: "花蓮災情協作團隊",
  publisher: "花蓮災情協作團隊",
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: siteUrl,
    siteName: "花蓮災情即時通報",
    type: "website",
    locale: "zh-TW",
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
  alternates: {
    canonical: siteUrl,
  },
  referrer: "origin-when-cross-origin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
