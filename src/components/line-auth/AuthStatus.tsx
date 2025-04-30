"use client";

import { useLineAuth } from "@/components/line-auth/LineAuthProvider";

export function AuthStatus() {
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
