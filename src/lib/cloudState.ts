import type { AppState } from "../types";
import { supabase } from "./supabase";

export async function loadCloudState(userId: string): Promise<AppState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("app_states")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.state as AppState | null) ?? null;
}

export async function saveCloudState(userId: string, state: AppState): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("app_states").upsert({
    user_id: userId,
    state,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
