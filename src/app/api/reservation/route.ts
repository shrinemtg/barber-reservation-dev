import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import type { Reservation } from "@/types/supabase";

export async function POST(req: NextRequest) {
  try {
    console.log("SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    console.log("予約API受信body:", body);
    // ヘッダーからLINEユーザーID取得
    const lineUserId = req.headers.get("x-line-user-id");
    if (!lineUserId) {
      return NextResponse.json(
        { error: "認証情報がありません" },
        { status: 401 }
      );
    }
    // 必須項目チェック
    const { user_name, picture_url, menu_ids, staff_id, reserved_at, status } =
      body;
    if (
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

    // --- 追加: usersテーブルにLINEユーザーIDがなければ自動登録 ---
    const { data: existingUser, error: userFetchError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("line_user_id", lineUserId)
      .single();
    if (userFetchError && userFetchError.code !== "PGRST116") {
      // PGRST116: No rows found
      return NextResponse.json(
        { error: userFetchError.message },
        { status: 500 }
      );
    }
    const userRecord = existingUser
      ? (
          await supabaseAdmin
            .from("users")
            .update({
              name: user_name || existingUser.name,
              picture_url: picture_url || existingUser.picture_url,
            })
            .eq("id", existingUser.id)
            .select()
            .single()
        ).data || existingUser
      : (
          await supabaseAdmin
            .from("users")
            .insert([
              {
                line_user_id: lineUserId,
                name: user_name || "LINEユーザー",
                picture_url: picture_url || null,
                role: "customer",
              },
            ])
            .select()
            .single()
        ).data;
    if (!userRecord) {
      return NextResponse.json(
        { error: "ユーザー情報の取得・登録に失敗しました" },
        { status: 500 }
      );
    }
    // --- ここまで追加 ---

    // staff_idの正規化
    const normalizedStaffId =
      !staff_id || staff_id === "none" || staff_id === "null" ? null : staff_id;

    // サーバー側で予約重複チェック（同じ日時・スタッフ・ユーザーでstatus='reserved'が存在する場合）
    let query = supabaseAdmin
      .from("reservations")
      .select("id")
      .eq("reserved_at", reserved_at)
      .eq("user_id", userRecord.id)
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
    const insertResult = await supabaseAdmin
      .from("reservations")
      .insert([
        {
          user_id: userRecord.id, // UUIDをセット
          staff_id: normalizedStaffId,
          reserved_at,
          status: status ?? "reserved",
        } as Partial<Reservation>,
      ])
      .select()
      .single();
    if (insertResult.error || !insertResult.data) {
      return NextResponse.json(
        { error: insertResult.error?.message || "予約登録に失敗しました" },
        { status: 500 }
      );
    }
    const reservation = insertResult.data;

    // reservation_menusに全menu_idを保存
    const reservationMenus = menu_ids.map((menu_id: string) => ({
      reservation_id: reservation.id,
      menu_id,
    }));
    const { error: menuError } = await supabaseAdmin
      .from("reservation_menus")
      .insert(reservationMenus);
    if (menuError) {
      // 予約本体は保存済みなので、ロールバック等は要検討
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }

    return NextResponse.json({ reservation, menu_ids }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "不正なリクエストです" },
      { status: 400 }
    );
  }
}

// 予約一覧取得API（GET）
export async function GET(req: NextRequest) {
  try {
    // LINEユーザーIDをヘッダーから取得
    const lineUserId = req.headers.get("x-line-user-id");
    if (!lineUserId) {
      return NextResponse.json(
        { error: "認証情報がありません" },
        { status: 401 }
      );
    }
    // ユーザー情報取得
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("line_user_id", lineUserId)
      .single();
    if (userError || !user) {
      return NextResponse.json(
        { error: "ユーザー情報取得失敗" },
        { status: 401 }
      );
    }
    // 予約データ取得
    let reservationsQuery = supabaseAdmin
      .from("reservations")
      .select("*")
      .order("reserved_at", { ascending: true });
    if (user.role !== "admin") {
      reservationsQuery = reservationsQuery.eq("user_id", user.id);
    }
    const { data: reservations, error } = await reservationsQuery;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!reservations) {
      return NextResponse.json({ reservations: [] }, { status: 200 });
    }
    // reservation_menusをまとめて取得
    const { data: reservationMenus, error: menuError } = await supabaseAdmin
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
  } catch {
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// PATCH: 予約ステータス更新（キャンセル等）
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { reservation_id, status } = body;
    const lineUserId = req.headers.get("x-line-user-id");
    if (!lineUserId) {
      return NextResponse.json(
        { error: "認証情報がありません" },
        { status: 401 }
      );
    }
    if (!reservation_id || !status) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }
    // ユーザー情報取得
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("line_user_id", lineUserId)
      .single();
    if (userError || !user) {
      return NextResponse.json(
        { error: "ユーザー情報取得失敗" },
        { status: 401 }
      );
    }
    // 予約取得
    const { data: reservation, error: resError } = await supabaseAdmin
      .from("reservations")
      .select("*")
      .eq("id", reservation_id)
      .single();
    if (resError || !reservation) {
      return NextResponse.json(
        { error: "予約が見つかりません" },
        { status: 404 }
      );
    }
    // 権限チェック
    if (user.role !== "admin" && reservation.user_id !== user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    // ステータス更新
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("reservations")
      .update({ status })
      .eq("id", reservation_id)
      .select()
      .single();
    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message || "更新に失敗しました" },
        { status: 500 }
      );
    }
    return NextResponse.json({ reservation: updated }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "不正なリクエストです" },
      { status: 400 }
    );
  }
}
