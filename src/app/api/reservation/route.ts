import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import type { Reservation, ReservationMenu } from "@/types/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("予約API受信body:", body);
    // 必須項目チェック
    const { user_id, menu_ids, staff_id, reserved_at, status } = body;
    if (
      !user_id ||
      !menu_ids ||
      !Array.isArray(menu_ids) ||
      !menu_ids.length ||
      !reserved_at
    ) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }

    // staff_idの正規化
    const normalizedStaffId =
      !staff_id || staff_id === "none" || staff_id === "null" ? null : staff_id;

    // サーバー側で予約重複チェック（同じ日時・スタッフ・ユーザーでstatus='reserved'が存在する場合）
    let query = supabase
      .from("reservations")
      .select("id")
      .eq("reserved_at", reserved_at)
      .eq("user_id", user_id)
      .eq("status", "reserved");
    if (normalizedStaffId === null) {
      query = query.is("staff_id", null);
    } else {
      query = query.eq("staff_id", normalizedStaffId);
    }
    const { data: dup, error: dupError } = await query;
    if (dupError) {
      return NextResponse.json({ error: dupError.message }, { status: 500 });
    }
    if (dup && dup.length > 0) {
      return NextResponse.json(
        { error: "すでに同じ時間帯で予約が存在します" },
        { status: 409 }
      );
    }

    // reservationsに保存
    const { data: reservation, error } = await supabase
      .from("reservations")
      .insert([
        {
          user_id,
          staff_id: normalizedStaffId,
          reserved_at,
          status: status ?? "reserved",
        } as Partial<Reservation>,
      ])
      .select()
      .single();
    if (error || !reservation) {
      return NextResponse.json(
        { error: error?.message || "予約登録に失敗しました" },
        { status: 500 }
      );
    }

    // reservation_menusに全menu_idを保存
    const reservationMenus = menu_ids.map((menu_id: string) => ({
      reservation_id: reservation.id,
      menu_id,
    }));
    const { error: menuError } = await supabase
      .from("reservation_menus")
      .insert(reservationMenus);
    if (menuError) {
      // 予約本体は保存済みなので、ロールバック等は要検討
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }

    return NextResponse.json({ reservation, menu_ids }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "不正なリクエストです" },
      { status: 400 }
    );
  }
}

// 予約一覧取得API（GET）
export async function GET() {
  try {
    // reservationsを取得
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("*")
      .order("reserved_at", { ascending: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!reservations) {
      return NextResponse.json({ reservations: [] }, { status: 200 });
    }
    // reservation_menusをまとめて取得
    const { data: reservationMenus, error: menuError } = await supabase
      .from("reservation_menus")
      .select("reservation_id, menu_id");
    if (menuError) {
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }
    // 各予約にmenu_ids配列を付与
    const reservationMap = new Map();
    for (const r of reservations) {
      reservationMap.set(r.id, { ...r, menu_ids: [] });
    }
    for (const rm of reservationMenus || []) {
      if (reservationMap.has(rm.reservation_id)) {
        reservationMap.get(rm.reservation_id).menu_ids.push(rm.menu_id);
      }
    }
    const result = Array.from(reservationMap.values());
    return NextResponse.json({ reservations: result }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
