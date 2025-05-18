// DeployButton import removed
import { ThemeSwitcher } from "@/components/theme-switcher";
import ConditionalHeaderAuth from "@/components/conditional-header-auth";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";
import "../styles/custom-inputs.css";
import "../styles/form-fixes.css"; // Fix for flashy red background on invalid inputs
import { SettingsProvider } from "@/contexts/settings-context";
import { PermissionProvider } from "@/context/permission-context";
import { AuthProviderWrapper } from "@/components/ui/auth-provider-wrapper";
import { AuthSyncProvider } from "@/components/ui/auth-sync-provider";

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
          <AuthProviderWrapper>
          <PermissionProvider>
          <AuthSyncProvider>
          <main className="min-h-screen flex flex-col items-center">
            <div className="flex-1 w-full flex flex-col gap-4 items-center">
              <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
                <div className="w-full px-5 flex justify-between items-center p-3 text-sm">
                  <div className="flex gap-5 items-center font-semibold">
                    <Link href={"/"} className="flex items-center gap-3">
                      <div 
                        className="h-10 w-10 bg-white flex items-center justify-center" 
                        style={{ 
                          borderRadius: '6px',
                          borderWidth: '3px',
                          borderStyle: 'solid',
                          borderLeftColor: '#7351F1',
                          borderBottomColor: '#7351F1',
                          borderRightColor: '#563CB5', /* 25% darker than #7351F1 */
                          borderTopColor: '#563CB5', /* 25% darker than #7351F1 */
                        }}
                      >
                        <span className="text-2xl font-bold" style={{ color: '#7351F1' }}>D</span>
                      </div>
                      <h1 className="text-2xl font-bold">Data Modeler Pro</h1>
                    </Link>
                    {/* DeployButton removed */}
                  </div>
                  <ConditionalHeaderAuth />
                </div>
              </nav>
              <div className="flex flex-col gap-4 w-full px-5">
                {children}
              </div>
            </div>
          </main>
          </AuthSyncProvider>
          </PermissionProvider>
          </AuthProviderWrapper>
          </SettingsProvider>
        </ThemeProvider>
        <div id="overlay-root"></div>
      </body>
    </html>
  );
}
