import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "License Store",
  description: "Digital license key store",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
