import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://spatialposters.app"),
  title: "SpatialPosters — Dynamic Poster Generator for Stremio",
  description: "Dynamic movie & TV show poster generator for Stremio: clean posters, vector logos, rating badges, and trend badges rendered in real time.",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/App.png",
    apple: "/App.png",
  },
  openGraph: {
    title: "SpatialPosters",
    description: "Dynamic poster generator for Stremio",
    images: ["/pictorium.png"],
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#e85d2a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://api.themoviedb.org" />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:bg-accent-orange focus:text-white focus:px-4 focus:py-2 focus:rounded-xl">
          Skip to main content
        </a>
        <main id="main-content">{children}</main>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "var(--color-accent-orange)",
              color: "white",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 600,
              boxShadow: "0 8px 24px rgb(var(--accent-rgb) / 0.3)",
              border: "none",
            },
          }}
          duration={2500}
          closeButton={false}
          richColors={false}
          theme="dark"
        />
      </body>
    </html>
  );
}
