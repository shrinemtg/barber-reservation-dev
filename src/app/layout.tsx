import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LineAuthProvider } from "@/components/line-auth/LineAuthProvider";
import { AuthStatus } from "@/components/line-auth/AuthStatus";

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
          <AuthStatus />
          {children}
        </LineAuthProvider>
      </body>
    </html>
  );
}
