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
    icon: "/logo1.png",
    shortcut: "/logo1.png",
    apple: "/logo1.png",
  },
  openGraph: {
    title: "Nivesh Ventures",
    description: "Track your team, income and rewards in one place.",
    url: "/",
    type: "website",
    images: [{ url: "/logo1.png", width: 512, height: 512, alt: "Nivesh Ventures" }],
  },
  twitter: {
    card: "summary",
    title: "Nivesh Ventures",
    description: "Track your team, income and rewards in one place.",
    images: ["/logo1.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nivesh Ventures",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0D1A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { MotionProvider } from "@/components/motion/MotionProvider";
import { LenisProvider } from "@/components/motion/LenisProvider";
import { GlobalCursorTrail } from "@/components/motion/GlobalCursorTrail";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-body bg-base text-ink bg-grid-glow min-h-screen relative overflow-x-hidden">
        {/* Fixed animated background blobs from the auth pages */}
        <div className="auth-blob auth-blob-purple" style={{ position: "fixed", zIndex: -10 }} />
        <div className="auth-blob auth-blob-orange" style={{ position: "fixed", zIndex: -10 }} />
        <div className="auth-blob auth-blob-purple2" style={{ position: "fixed", zIndex: -10 }} />
        <AuthProvider>
          <MotionProvider>
            <GlobalCursorTrail />
            <LenisProvider>
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
            </LenisProvider>
          </MotionProvider>
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('SW registered: ', registration.scope);
                    },
                    function(err) {
                      console.log('SW registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

