"use client";
import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { fetchStaffs, fetchMenus } from "@/lib/supabaseMenuStaff";
import type { Staff, Menu } from "@/types/supabase";
import { useLineAuth } from "@/components/line-auth/LineAuthProvider";

interface Reservation {
  id: string;
  user_id: string;
  staff_id: string | null;
  reserved_at: string;
  status: string;
  menu_ids: string[];
}

export function ReservationList() {
  const router = useRouter();
  const { user, isLoggedIn } = useLineAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [staffsLoading, setStaffsLoading] = useState(false);
  const [staffsError, setStaffsError] = useState<string | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menusLoading, setMenusLoading] = useState(true);
  const [menusError, setMenusError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isLoggedIn) return;
    setLoading(true);
    fetch("/api/reservation", {
      headers: {
        "x-line-user-id": user.userId,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setReservations(data.reservations || []);
        setLoading(false);
      })
      .catch(() => {
        setError("取得に失敗しました");
        setLoading(false);
      });
  }, [user, isLoggedIn]);

  useEffect(() => {
    setStaffsLoading(true);
    fetchStaffs()
      .then((data) => {
        setStaffs(data);
        setStaffsLoading(false);
      })
      .catch(() => {
        setStaffsError("スタッフ情報の取得に失敗しました");
        setStaffsLoading(false);
      });
  }, []);

  useEffect(() => {
    setMenusLoading(true);
    fetchMenus()
      .then((data) => {
        setMenus(data);
        setMenusLoading(false);
      })
      .catch(() => {
        setMenusError("メニュー情報の取得に失敗しました");
        setMenusLoading(false);
      });
  }, []);

  function getMenuNames(ids: string[] | string) {
    const arr = Array.isArray(ids) ? ids : [ids];
    return arr
      .map((id) => {
        const found = menus.find(
          (m) =>
            String(m.id).trim().toLowerCase() ===
            String(id).trim().toLowerCase()
        );
        return found ? found.name : `不明なメニュー（${id}）`;
      })
      .join(", ");
  }

  function getStaffName(id: string | null, staffs: Staff[]) {
    if (!id) return "指定なし";
    return staffs.find((s) => s.id === id)?.name || id;
  }

  if (menusLoading)
    return <div className="text-center py-8">メニュー情報を取得中...</div>;
  if (menusError)
    return <div className="text-center text-red-500 py-8">{menusError}</div>;

  return (
    <Card className="max-w-3xl mx-auto mt-8 p-4 shadow-xl rounded-2xl">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">予約一覧</h2>
        <Button variant="outline" onClick={() => router.push("/")}>
          トップに戻る
        </Button>
      </div>
      {loading && <div>読み込み中...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {staffsLoading && <div>スタッフ情報を取得中...</div>}
      {staffsError && <div className="text-red-500">{staffsError}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">予約日</th>
              <th className="border px-2 py-1">開始時間</th>
              <th className="border px-2 py-1">メニュー</th>
              <th className="border px-2 py-1">担当者</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  予約はありません
                </td>
              </tr>
            ) : (
              reservations.map((r) => {
                const dt = new Date(r.reserved_at);
                return (
                  <tr
                    key={r.id}
                    className={
                      "even:bg-gray-50 hover:bg-blue-50 transition-colors"
                    }
                  >
                    <td className="border px-2 py-1 whitespace-nowrap">
                      {dt.toLocaleDateString()}
                    </td>
                    <td className="border px-2 py-1 whitespace-nowrap">
                      {dt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="border px-2 py-1">
                      {getMenuNames(
                        Array.isArray(r.menu_ids) ? r.menu_ids : [r.menu_ids]
                      )}
                    </td>
                    <td className="border px-2 py-1">
                      {getStaffName(r.staff_id, staffs)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
