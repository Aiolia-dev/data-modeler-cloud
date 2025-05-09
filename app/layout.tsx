// DeployButton import removed
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";
import "../styles/custom-inputs.css";
import "../styles/form-fixes.css"; // Fix for flashy red background on invalid inputs
import { SettingsProvider } from "@/contexts/settings-context";
import { PermissionProvider } from "@/context/permission-context";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
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
          <main className="min-h-screen flex flex-col items-center">
            <div className="flex-1 w-full flex flex-col gap-4 items-center">
              <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
                <div className="w-full px-5 flex justify-between items-center p-3 text-sm">
                  <div className="flex gap-5 items-center font-semibold">
                    <Link href={"/"}>DataModel Pro</Link>
                    {/* DeployButton removed */}
                  </div>
                  {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
                </div>
              </nav>
              <div className="flex flex-col gap-4 w-full px-5">
                {children}
              </div>
            </div>
          </main>
          </PermissionProvider>
          </SettingsProvider>
        </ThemeProvider>
        <div id="overlay-root"></div>
      </body>
    </html>
  );
}
