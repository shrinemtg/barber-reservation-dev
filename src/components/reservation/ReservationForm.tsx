"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Calendar } from "../ui/calendar";
import clsx from "clsx";
import { Checkbox } from "../ui/checkbox";
import { ReservationConfirm } from "./ReservationConfirm";
import { CalendarDays } from "lucide-react";
import { ja } from "date-fns/locale";
import { fetchMenus, fetchStaffs } from "@/lib/supabaseMenuStaff";
import type { Menu, Staff } from "@/types/supabase";
import { ReservationComplete } from "./ReservationComplete";
import Image from "next/image";
import { useLineAuth } from "@/components/line-auth/LineAuthProvider";

// 定休日判定
function isClosed(date: Date) {
  const day = date.getDay(); // 0:日, 1:月, 2:火...
  const d = date.getDate();
  // 毎週火曜
  if (day === 2) return true;
  // 第2・第3月曜
  if (day === 1) {
    const week = Math.floor((d - 1) / 7) + 1;
    if (week === 2 || week === 3) return true;
  }
  return false;
}

// 祝日判定（簡易: 土日を祝日扱い）
function isHoliday(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// カット・パーマの所要時間取得
function getMenuDuration(
  menuId: string,
  menuGroups: { label: string; items: Menu[] }[]
): number {
  for (const group of menuGroups) {
    const found = group.items.find((item: Menu) => item.id === menuId);
    if (found && found.duration) return found.duration;
  }
  return 30; // デフォルト30分
}

// ダミーの既存予約（例: 10:00, 13:00, 15:30が埋まり）
const dummyReserved = ["10:00", "13:00", "15:30"];

// 時間帯リスト生成（空き枠判定付き）
function getTimeSlots(
  date: Date | undefined,
  menuIds: string[],
  menuGroups: { label: string; items: Menu[] }[],
  durationOverride?: number
) {
  if (!date) return [];
  const slots = [];
  let start, end;
  if (isHoliday(date)) {
    start = 8 * 60; // 8:00
    end = 19 * 60; // 19:00
  } else {
    start = 8 * 60 + 30; // 8:30
    end = 19 * 60 + 30; // 19:30
  }
  // 合計durationを計算
  let duration = durationOverride;
  if (!duration) {
    duration = 0;
    for (const id of menuIds) {
      duration += getMenuDuration(id, menuGroups);
    }
    if (duration === 0) duration = getMenuDuration(menuIds[0], menuGroups);
  }
  for (let t = start; t <= end; t += 30) {
    const h = Math.floor(t / 60)
      .toString()
      .padStart(2, "0");
    const m = (t % 60).toString().padStart(2, "0");
    const time = `${h}:${m}`;
    // 予約済み or 所要時間分の枠が重複する場合は埋まり扱い
    let isReserved = false;
    for (const reserved of dummyReserved) {
      const [rh, rm] = reserved.split(":").map(Number);
      const reservedStart = rh * 60 + rm;
      const reservedEnd = reservedStart + duration;
      const slotStart = t;
      const slotEnd = t + duration;
      // 枠が重複していれば埋まり
      if (slotStart < reservedEnd && slotEnd > reservedStart) {
        isReserved = true;
        break;
      }
    }
    slots.push({
      time,
      isReserved,
    });
  }
  return slots;
}

// 定休日リスト生成（今月分のみ）
function getClosedDays(month: Date) {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const days: Date[] = [];
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, mon, d);
    if (date.getMonth() !== mon) break;
    if (isClosed(date)) days.push(date);
  }
  return days;
}

export function ReservationForm() {
  const {
    isLoggedIn,
    user,
    loading: authLoading,
    error: authError,
  } = useLineAuth();
  // useState, useMemo, useEffect すべてここで宣言
  const [date, setDate] = useState<Date | undefined>();
  const [menu, setMenu] = useState<string[]>([]);
  const [staff, setStaff] = useState("none");
  const [selectedTime, setSelectedTime] = useState("");
  const [month, setMonth] = useState(new Date());
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [menuGroups, setMenuGroups] = useState<
    { label: string; items: Menu[] }[]
  >([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const closed = useMemo(() => (date ? isClosed(date) : false), [date]);
  const closedDays = useMemo(() => getClosedDays(month), [month]);

  // 合計金額計算
  const totalPrice = useMemo(() => {
    if (!menuGroups.length) return 0;
    let sum = 0;
    for (const group of menuGroups) {
      if (!group.items) continue;
      for (const item of group.items as Menu[]) {
        if (menu.includes(item.id)) sum += item.price;
      }
    }
    return sum;
  }, [menu, menuGroups]);

  // 合計所要時間（分）
  const sumDuration = useMemo(() => {
    if (!menuGroups.length) return 0;
    let sum = 0;
    for (const group of menuGroups) {
      if (!group.items) continue;
      for (const item of group.items as Menu[]) {
        if (menu.includes(item.id)) sum += item.duration;
      }
    }
    return sum;
  }, [menu, menuGroups]);

  // 時間帯リスト生成（複数メニュー選択時は合計durationで枠を占有）
  const timeSlots = useMemo(
    () => getTimeSlots(date, menu, menuGroups, sumDuration),
    [date, menu, sumDuration, menuGroups]
  );

  // 選択中メニューの画像・説明取得（複数対応）
  const selectedMenuItems = useMemo(() => {
    if (!menuGroups.length) return [];
    const items: Menu[] = [];
    for (const group of menuGroups) {
      if (!group.items) continue;
      for (const item of group.items as Menu[]) {
        if (menu.includes(item.id)) items.push(item);
      }
    }
    return items;
  }, [menu, menuGroups]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const menus = await fetchMenus();
        // カテゴリ名の正規化マップ
        const normalizeCategory = (cat: string | undefined): string => {
          if (!cat) return "その他";
          const map: { [key: string]: string } = {
            カット: "カット",
            cut: "カット",
            パーマ: "パーマ",
            perm: "パーマ",
            カラー: "カラー",
            color: "カラー",
            縮毛矯正: "縮毛矯正",
            straight: "縮毛矯正",
            レディースシェービング: "レディースシェービング",
            レディースシェイビング: "レディースシェービング",
            ladies_shaving: "レディースシェービング",
            オプション: "オプション",
            option: "オプション",
            その他: "その他",
            other: "その他",
          };
          return map[cat.trim()] || cat.trim();
        };
        // カテゴリごとにグループ化
        const categoryMap: { [key: string]: Menu[] } = {};
        for (const menu of menus) {
          const cat = normalizeCategory(menu.category);
          if (!categoryMap[cat]) categoryMap[cat] = [];
          categoryMap[cat].push(menu);
        }
        // カットカテゴリの重複排除（name+priceでユニーク化）
        if (categoryMap["カット"]) {
          const seen = new Set<string>();
          categoryMap["カット"] = categoryMap["カット"].filter((item) => {
            const key = `${item.name}_${item.price}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          // 表示順を指定
          const cutOrder = [
            "カット（シャンプー・シェービング付き）",
            "カット（シャンプーまたはシェービングなし）",
            "カットのみ",
          ];
          categoryMap["カット"] = categoryMap["カット"].sort((a, b) => {
            const aIdx = cutOrder.indexOf(a.name);
            const bIdx = cutOrder.indexOf(b.name);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return 0;
          });
        }
        // パーマカテゴリの重複排除（name+priceでユニーク化）
        if (categoryMap["パーマ"]) {
          const seen = new Set<string>();
          categoryMap["パーマ"] = categoryMap["パーマ"].filter((item) => {
            const key = `${item.name}_${item.price}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
        // カラーカテゴリの重複排除（name+priceでユニーク化）
        if (categoryMap["カラー"]) {
          const seen = new Set<string>();
          categoryMap["カラー"] = categoryMap["カラー"].filter((item) => {
            const key = `${item.name}_${item.price}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
        // 表示順を明示的に指定
        const categoryOrder = [
          "カット",
          "パーマ",
          "カラー",
          "縮毛矯正",
          "レディースシェービング",
          "オプション",
        ];
        // すべてのカテゴリが必ずグループとして生成されるよう修正
        const groups = categoryOrder.map((cat) => ({
          label: cat,
          items: categoryMap[cat] || [],
        }));
        setMenuGroups(groups);
        const staffsData = await fetchStaffs();
        setStaffs(staffsData);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setLoadError(e.message);
        } else {
          setLoadError("データ取得に失敗しました");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 未ログイン・認証中・エラー時のUI
  if (authLoading) return <div className="text-center py-8">LINE認証中...</div>;
  if (authError)
    return (
      <div className="text-center text-red-500 py-8">
        認証エラー: {authError}
      </div>
    );
  if (!isLoggedIn || !user)
    return <div className="text-center py-8">LINEログインが必要です</div>;

  // ここでローディング・エラーのreturn
  if (loading)
    return (
      <div className="text-center py-8">メニュー・担当者情報を取得中...</div>
    );
  if (loadError)
    return <div className="text-center text-red-500 py-8">{loadError}</div>;

  // メニュー選択ハンドラ
  function handleMenuChange(id: string) {
    setMenu((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  // 予約内容をReservationConfirmに渡すためのデータ整形
  const selectedStaff = staffs.find((s) => s.id === staff);

  // 予約確定時の処理（API呼び出し）
  async function handleConfirm() {
    setValidationError(null);
    if (!user) {
      setValidationError("LINEログイン情報が取得できませんでした");
      return;
    }
    // 送信データ整形
    const reservationData = {
      user_id: user.userId, // LINE認証ユーザーIDをセット
      user_name: user.displayName, // プロフィール名も送信
      picture_url: user.pictureUrl, // プロフィール画像も送信
      menu_ids: menu, // 複数選択したメニューID配列
      staff_id: staff !== "none" ? staff : null,
      reserved_at:
        date && selectedTime
          ? new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
              Number(selectedTime.split(":")[0]),
              Number(selectedTime.split(":")[1])
            ).toISOString()
          : "",
      status: "reserved",
    };
    try {
      const res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationData),
      });
      const result = await res.json();
      if (!res.ok) {
        setValidationError(result.error || "予約登録に失敗しました");
        return;
      }
      setShowConfirm(false);
      setIsComplete(true);
    } catch {
      setValidationError("通信エラーが発生しました");
    }
  }

  // 予約内容の重複チェック（ダミー）
  function isDuplicateReservation(date: Date | undefined, time: string) {
    if (!date || !time) return false;
    // 例：dummyReservedの時間と一致する場合は重複とみなす
    return dummyReserved.includes(time);
  }

  // バリデーション付きで確認画面に進む
  function handleShowConfirm() {
    setValidationError(null);
    if (!date) {
      setValidationError("日付を選択してください");
      return;
    }
    if (closed) {
      setValidationError("定休日です。別の日を選択してください");
      return;
    }
    if (!menu.length) {
      setValidationError("メニューを選択してください");
      return;
    }
    if (!selectedTime) {
      setValidationError("時間帯を選択してください");
      return;
    }
    if (isDuplicateReservation(date, selectedTime)) {
      setValidationError(
        "その時間帯はすでに予約が入っています。別の時間を選択してください。"
      );
      return;
    }
    setShowConfirm(true);
  }

  // パーマカテゴリの判定用ヘルパー
  const isPermSelected = menuGroups
    .find((g) => g.label.startsWith("パーマ"))
    ?.items.some((item) => menu.includes(item.id));

  if (showConfirm) {
    return (
      <ReservationConfirm
        date={date!}
        time={selectedTime}
        menuItems={selectedMenuItems}
        staff={selectedStaff?.id !== "none" ? selectedStaff : undefined}
        totalPrice={totalPrice}
        onBack={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
      />
    );
  }

  if (isComplete) {
    return <ReservationComplete />;
  }

  return (
    <Card className="max-w-md mx-auto p-0 mt-8 shadow-xl rounded-2xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="text-blue-400 w-6 h-6" />
          <h2 className="text-xl font-bold">予約登録フォーム</h2>
        </div>
        {validationError && (
          <div className="mb-4 text-red-600 font-semibold text-center text-sm border border-red-200 bg-red-50 rounded">
            {validationError}
          </div>
        )}
        <div className="mb-4 pb-4 border-b">
          <label className="block mb-1 font-semibold">希望日</label>
          {/* 日付エラー表示 */}
          {validationError === "日付を選択してください" && (
            <div className="mb-2 text-sm text-red-500">{validationError}</div>
          )}
          <div className="w-full max-w-xl mx-auto flex justify-around items-center">
            <div className="flex-1" />
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="max-w-full w-[px] border rounded"
              month={month}
              onMonthChange={setMonth}
              modifiers={{ closed: closedDays }}
              modifiersClassNames={{
                closed: "bg-gray-200 text-gray-400",
                selected: "bg-blue-500 text-white !important",
                today: "border-blue-400 text-blue-600 font-bold",
              }}
              locale={ja}
            />
            <div className="flex-1" />
          </div>
          {closed && (
            <div className="text-red-500 text-sm mt-2">
              定休日です。別の日を選択してください。
            </div>
          )}
        </div>
        <div className="mb-4 pb-4 border-b">
          <label className="block mb-1 font-semibold">
            メニュー（複数選択可）
          </label>
          {/* メニューエラー表示 */}
          {validationError === "メニューを選択してください" && (
            <div className="mb-2 text-sm text-red-500">{validationError}</div>
          )}
          {!date && (
            <div className="mb-2 text-sm text-red-500">
              先に希望日を選択してください
            </div>
          )}
          {closed && (
            <div className="mb-2 text-sm text-red-500">
              定休日です。別の日を選択してください
            </div>
          )}
          <div className="space-y-2">
            {menuGroups.map((group) => {
              const isCut = group.label === "カット";
              const isPerm = group.label.startsWith("パーマ");
              // 代表画像名マップを利用
              const categoryImageMap: { [key: string]: string } = {
                カット: "cut-full.png",
                パーマ: "pa-ma.png",
                カラー: "color-hair.png",
                縮毛矯正: "hair-straightening.png",
                レディースシェービング: "ladies-shaving.png",
                オプション: "option.png",
              };
              const imageFile = categoryImageMap[group.label];
              return (
                <div key={group.label} className="mb-6">
                  <div className="relative w-full h-28 rounded overflow-hidden mb-2">
                    {imageFile && (
                      <Image
                        src={`/menu/${imageFile}`}
                        alt={group.label}
                        className="w-full h-full object-cover filter brightness-75"
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        priority={group.label === "カット"}
                      />
                    )}
                    <span className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white drop-shadow-lg">
                        {group.label.replace(/（.*?）/, "")}
                      </span>
                      {isPerm && (
                        <span className="text-sm text-white drop-shadow mt-1">
                          カット・シェービング付き
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 mt-2">
                    {group.items.map((item: Menu) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 border-b pb-2 mb-2"
                      >
                        <Checkbox
                          checked={menu.includes(item.id)}
                          onCheckedChange={() => handleMenuChange(item.id)}
                          disabled={
                            !date || closed || (isCut && isPermSelected)
                          }
                          className="text-blue-500 w-6 h-6 mt-1"
                        />
                        <div className="flex flex-col">
                          <label className="font-medium cursor-pointer">
                            {/* 割引オプションは金額を1回だけ表示 */}
                            {item.id.endsWith("discount")
                              ? item.name
                              : `${item.name}${
                                  item.price && !item.name.match(/（.*?円）/)
                                    ? `（${item.price.toLocaleString()}円）`
                                    : ""
                                }`}
                          </label>
                          <span className="text-xs text-gray-600 mt-1">
                            {item.description}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {/* 選択中メニュー名リスト */}
          {selectedMenuItems.length > 0 && (
            <div className="mb-2">
              <div className="font-bold">選択中のメニュー</div>
              <ul className="list-disc list-inside text-sm text-gray-800">
                {selectedMenuItems.map((item) => (
                  <li key={item.id}>{item.name.replace(/（.*?円）/, "")}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {/* 合計金額・所要時間表示 */}
        <div className="mb-4 pb-4 border-b text-right">
          <div className="font-bold text-lg">
            合計金額:{" "}
            <span className="text-pink-500">
              {totalPrice.toLocaleString()}円
            </span>
          </div>
          <div className="text-xs text-gray-500">
            合計所要時間: {sumDuration}分
          </div>
        </div>
        <div className="mb-4 pb-4 border-b">
          <label className="block mb-1 font-semibold">担当者（任意）</label>
          <Select value={staff} onValueChange={setStaff} disabled={closed}>
            <SelectTrigger>
              <SelectValue placeholder="担当者を選択（任意）" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">指定なし</SelectItem>
              {staffs.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-semibold">時間帯</label>
          {/* 時間帯エラー表示 */}
          {validationError === "時間帯を選択してください" && (
            <div className="mb-2 text-sm text-red-500">{validationError}</div>
          )}
          {closed && (
            <div className="mb-2 text-sm text-red-500">
              定休日のため時間帯は選択できません
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((slot) => (
              <Button
                key={slot.time}
                variant={
                  slot.isReserved
                    ? "outline"
                    : selectedTime === slot.time
                    ? "default"
                    : "secondary"
                }
                className={clsx(
                  "w-full py-2",
                  slot.isReserved &&
                    "bg-gray-200 text-gray-400 cursor-not-allowed",
                  selectedTime === slot.time &&
                    "bg-blue-500 text-white border-blue-500 ring-2 ring-blue-300 !bg-blue-500 !text-white !border-blue-500 !hover:bg-blue-500 !hover:text-white"
                )}
                disabled={slot.isReserved || closed || !date}
                onClick={() => setSelectedTime(slot.time)}
              >
                {slot.time}
              </Button>
            ))}
          </div>
        </div>
        <Button
          className="w-full mt-4 text-white bg-blue-500 hover:bg-blue-600 border-0 shadow-md transition"
          disabled={!date || closed || !selectedTime || !menu.length}
          onClick={handleShowConfirm}
        >
          予約内容を確認
        </Button>
      </div>
    </Card>
  );
}
