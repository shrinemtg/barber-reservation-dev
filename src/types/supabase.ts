// Supabaseのテーブル型定義（雛形）
// 必要に応じて自動生成や手動で型を追加してください

export interface User {
  id: string;
  line_user_id: string;
  name: string;
  role: "customer" | "admin";
  created_at: string;
  updated_at: string;
}

export interface Menu {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  image?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  menu_id: string;
  staff_id: string;
  reserved_at: string;
  status: "reserved" | "canceled" | "completed";
  created_at: string;
  updated_at: string;
}

export interface ShopSetting {
  id: string;
  open_time: string;
  close_time: string;
  closed_days: string[];
  created_at: string;
  updated_at: string;
}

export interface ReservationReminder {
  id: string;
  reservation_id: string;
  sent_at: string;
  type: "before_day" | "on_day";
}

export interface ReservationMenu {
  id: string;
  reservation_id: string;
  menu_id: string;
  created_at: string;
}
