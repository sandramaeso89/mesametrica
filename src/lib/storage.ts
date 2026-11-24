import { createClient } from "@supabase/supabase-js";
import type { SeatingPlan } from "@/types";

const STORAGE_KEY = "mesametrica-demo-plan";

function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key) : null;
}

export async function loadPlan(fallback: SeatingPlan): Promise<SeatingPlan> {
  const eventId = process.env.NEXT_PUBLIC_DEMO_EVENT_ID;
  const supabase = supabaseClient();
  if (supabase && eventId) {
    const { data } = await supabase.from("seating_plans").select("payload").eq("id", eventId).maybeSingle();
    if (data?.payload) return data.payload as SeatingPlan;
  }
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as SeatingPlan;
  }
  return fallback;
}

export async function savePlan(plan: SeatingPlan) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  const eventId = process.env.NEXT_PUBLIC_DEMO_EVENT_ID;
  const supabase = supabaseClient();
  if (!supabase || !eventId) return { mode: "local" as const };
  const { error } = await supabase.from("seating_plans").upsert({ id: eventId, payload: plan, updated_at: new Date().toISOString() });
  if (error) throw error;
  return { mode: "supabase" as const };
}
