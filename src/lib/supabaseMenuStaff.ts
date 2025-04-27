import { supabase } from "./supabaseClient";
import type { Menu, Staff } from "@/types/supabase";

export async function fetchMenus(): Promise<Menu[]> {
  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchStaffs(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from("staffs")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}
