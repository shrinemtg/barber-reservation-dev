import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {
  LineAuthProvider,
  useLineAuth,
} from "@/components/line-auth/LineAuthProvider";

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

function AuthStatus() {
  const { isLoggedIn, user, loading, error, logout } = useLineAuth();
  if (loading) return <div className="p-2 text-gray-500">LINE認証中...</div>;
  if (error) return <div className="p-2 text-red-500">認証エラー: {error}</div>;
  if (isLoggedIn && user)
    return (
      <div className="p-2 flex items-center gap-2">
        <img
          src={user.pictureUrl}
          alt="icon"
          className="w-8 h-8 rounded-full"
        />
        <span>{user.displayName} でログイン中</span>
        <button
          className="ml-2 text-xs text-blue-600 underline"
          onClick={logout}
        >
          ログアウト
        </button>
      </div>
    );
  return null;
}

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
