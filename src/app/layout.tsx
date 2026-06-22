
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#0B132B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "RecruitPulse",
  description: "Secure Client Resource Tracking System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RecruitPulse",
  },
};

import { InstallPrompt } from "@/components/ui/InstallPrompt";

import { SettingsProvider } from "@/providers/SettingsProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} font-sans h-full antialiased bg-slate-50`}>
      <body className="h-full flex flex-col">
        <AuthProvider>
          <SettingsProvider>
            {children}
            <InstallPrompt />
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
