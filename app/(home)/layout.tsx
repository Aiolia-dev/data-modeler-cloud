"use client";

import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "../globals.css";
import "../../styles/custom-inputs.css";
import { SettingsProvider } from "@/contexts/settings-context";
import { PermissionProvider } from "@/context/permission-context";

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground dark">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SettingsProvider>
            <PermissionProvider>
              {children}
              <div id="overlay-root"></div>
            </PermissionProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
