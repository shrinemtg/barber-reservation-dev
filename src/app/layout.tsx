import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LineAuthProvider } from "@/components/line-auth/LineAuthProvider";
import { AuthStatus } from "@/components/line-auth/AuthStatus";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Barber Reservation App",
  description: "Barber Reservation App for LINE integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LineAuthProvider>
          <nav className="w-full bg-white border-b shadow-sm mb-2">
            <div className="max-w-3xl mx-auto flex items-center gap-6 px-4 py-2">
              <Link href="/" className="font-bold text-blue-600 text-lg">
                理容室予約
              </Link>
              <Link
                href="/reservation/list"
                className="text-blue-500 hover:underline"
              >
                予約一覧
              </Link>
            </div>
          </nav>
          <AuthStatus />
          {children}
        </LineAuthProvider>
      </body>
    </html>
  );
}
