"use client";
import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

interface Reservation {
  id: string;
  user_id: string;
  staff_id: string | null;
  reserved_at: string;
  status: string;
  menu_ids: string[];
}

interface Menu {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  name: string;
}

// 仮のメニュー・スタッフ名リスト（本来はAPIやpropsで取得）
const menuList: Menu[] = [
  { id: "cut_full", name: "カット(シャンプー・シェービング付き)" },
  {
    id: "cut_no_shampoo_shave",
    name: "カット(シャンプーまたはシェービングなし)",
  },
  { id: "cut_only", name: "カットのみ" },
  { id: "buzzcut", name: "バリカン丸刈り" },
  { id: "perm_point", name: "ポイントパーマ" },
  { id: "perm_full", name: "フルパーマ" },
  { id: "perm_twist", name: "ツイストパーマ" },
  { id: "perm_pin", name: "ピンパーマ" },
  { id: "perm_spiral", name: "スパイラルパーマ" },
  { id: "perm_mix", name: "ミックスパーマ" },
  { id: "color", name: "カラー" },
  { id: "bleach", name: "ブリーチ" },
  { id: "mesh", name: "メッシュ・ウォービング・スライジング" },
  { id: "gray_color", name: "カラー白髪染め" },
  { id: "black_gray", name: "黒白髪染め" },
  { id: "gray_blur", name: "白髪ぼかし" },
  { id: "straight", name: "縮毛矯正" },
  { id: "straight_partial", name: "縮毛矯正部分" },
  { id: "ladies_regular", name: "レギュラーコース（40分）" },
  { id: "ladies_algae", name: "アルゲパックコース（45分）" },
  { id: "ladies_bridal", name: "ブライダルコース（90分）" },
  { id: "mist_shave", name: "ミストシェービング" },
  { id: "scalp_care", name: "頭皮ケアコース(10分)" },
  { id: "shoulder_massage", name: "肩もみコース(10分)" },
  { id: "facial_esthe", name: "美顔エステコース(10分)" },
  { id: "senior_discount", name: "シニア割（-300円）" },
  { id: "highschool_discount", name: "高校生割（-600円）" },
  { id: "junior_discount", name: "中学生割（-1000円）" },
  { id: "elementary_discount", name: "小学生割（-1200円）" },
];
const staffList: Staff[] = [
  { id: "staff1", name: "山田 太郎" },
  { id: "staff2", name: "佐藤 花子" },
];

function getMenuNames(ids: string[]) {
  return ids
    .map((id) => menuList.find((m) => m.id === id)?.name || id)
    .join(", ");
}
function getStaffName(id: string | null) {
  if (!id) return "指定なし";
  return staffList.find((s) => s.id === id)?.name || id;
}

export function ReservationList() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/reservation")
      .then((res) => res.json())
      .then((data) => {
        setReservations(data.reservations || []);
        setLoading(false);
      })
      .catch(() => {
        setError("取得に失敗しました");
        setLoading(false);
      });
  }, []);

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
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">日付</th>
              <th className="border px-2 py-1">時間</th>
              <th className="border px-2 py-1">メニュー</th>
              <th className="border px-2 py-1">担当者</th>
              <th className="border px-2 py-1">ステータス</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  予約はありません
                </td>
              </tr>
            ) : (
              reservations.map((r) => {
                const dt = new Date(r.reserved_at);
                let statusColor = "text-gray-500";
                if (r.status === "reserved")
                  statusColor = "text-blue-500 font-bold";
                if (r.status === "canceled")
                  statusColor = "text-red-500 font-bold";
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
                      {getMenuNames(r.menu_ids)}
                    </td>
                    <td className="border px-2 py-1">
                      {getStaffName(r.staff_id)}
                    </td>
                    <td className={`border px-2 py-1 ${statusColor}`}>
                      {r.status}
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
