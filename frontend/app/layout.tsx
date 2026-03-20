import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ديجيتال بلس",
  description: "Digital license key store",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="googlebot" content="noindex, nofollow, noarchive" />
        <meta name="X-Robots-Tag" content="noindex, noarchive" />
      </head>
      <body className="bg-gray-50 min-h-screen text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}