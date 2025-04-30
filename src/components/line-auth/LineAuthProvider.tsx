"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import liff from "@line/liff";

interface LineUser {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

interface LineAuthContextProps {
  isLoggedIn: boolean;
  user: LineUser | null;
  loading: boolean;
  error: string | null;
  logout: () => void;
}

const LineAuthContext = createContext<LineAuthContextProps | undefined>(
  undefined
);

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "2007328810-3L9dmDjQ"; // 仮置き

export function LineAuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<LineUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initLiff() {
      setLoading(true);
      setError(null);
      try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        setIsLoggedIn(true);
        const profile = await liff.getProfile();
        setUser({
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        });
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message || "LIFF初期化エラー");
        } else {
          setError("LIFF初期化エラー");
        }
      } finally {
        setLoading(false);
      }
    }
    initLiff();
  }, []);

  function logout() {
    liff.logout();
    window.location.reload();
  }

  return (
    <LineAuthContext.Provider
      value={{ isLoggedIn, user, loading, error, logout }}
    >
      {children}
    </LineAuthContext.Provider>
  );
}

export function useLineAuth() {
  const ctx = useContext(LineAuthContext);
  if (!ctx) throw new Error("useLineAuth must be used within LineAuthProvider");
  return ctx;
}
