import type { ReactNode } from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const aeonikPro = localFont({
  src: [
    {
      path: "../public/fonts/aeonikpro-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/aeonikpro-medium.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-aeonik-pro",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agent",
  description: "Chat with your agent — thinking, tools, streaming, and approvals.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${aeonikPro.variable} ${geistMono.variable} h-full light`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-neutral-0 font-sans text-fg">
        <ThemeProvider>
          <Toaster>
            <TooltipProvider delay={150}>{children}</TooltipProvider>
          </Toaster>
        </ThemeProvider>
      </body>
    </html>
  );
}
