import type { Metadata } from "next";
import { Overpass, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense } from "react";
import { SiteHeader, SiteHeaderView } from "@/components/site-header";
import { BrandGradientDefs } from "@/components/brand";
import "./globals.css";

const overpass = Overpass({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StoryForge",
  description: "Write, narrate and storyboard faceless YouTube stories with AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${overpass.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <BrandGradientDefs />
        <TooltipProvider>
          <Suspense fallback={<SiteHeaderView pathname={null} />}>
            <SiteHeader />
          </Suspense>
          <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-20 sm:px-6">{children}</main>
        </TooltipProvider>
        <Toaster theme="dark" richColors position="bottom-right" />
      </body>
    </html>
  );
}
