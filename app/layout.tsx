import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { ChatbotProvider } from "@/lib/ChatbotContext";
import { Toaster } from "react-hot-toast";
import ChatbotWidget from "@/components/ChatbotWidget";

// Fonts are declared via @font-face in globals.css (Google Fonts CDN),
// so production builds don't depend on fetching fonts at build time.

// Every route reads live session/auth state (AuthProvider + ChatbotWidget),
// so static prerendering isn't useful here — force dynamic rendering site-wide.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nivesh Ventures — Binary MLM Platform",
  description: "Track your team, income and rewards in one place.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nivesh Ventures",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0E1A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-body bg-base text-ink bg-grid-glow min-h-screen">
        <AuthProvider>
          <ChatbotProvider>
            {children}
            <ChatbotWidget />
            <Toaster
              position="top-center"
              toastOptions={{
                style: { background: "#131A33", color: "#E8E8F0", border: "1px solid rgba(255,255,255,0.1)" },
              }}
            />
          </ChatbotProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
