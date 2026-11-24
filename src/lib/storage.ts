import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SeatingPlan } from "@/types";
import { parsePlan } from "./validation";

const STORAGE_KEY = "mesametrica-demo-plan";

export type StorageMode = "supabase" | "local";

let client: SupabaseClient | null | undefined;

function supabase() {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

const demoEventId = () => process.env.NEXT_PUBLIC_DEMO_EVENT_ID || null;

export function storageMode(): StorageMode {
  return supabase() && demoEventId() ? "supabase" : "local";
}

function readLocal(): SeatingPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? parsePlan(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

function writeLocal(plan: SeatingPlan) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // Almacenamiento lleno o bloqueado: la sesión sigue funcionando en memoria.
  }
}

export type LoadResult = { plan: SeatingPlan; source: "supabase" | "local" | "demo" };

/** Carga el plan desde Supabase, después desde este navegador y, si no hay nada válido, la demo. */
export async function loadPlan(fallback: SeatingPlan): Promise<LoadResult> {
  const db = supabase();
  const eventId = demoEventId();
  if (db && eventId) {
    const { data, error } = await db.from("seating_plans").select("payload").eq("id", eventId).maybeSingle();
    const remote = !error && data ? parsePlan(data.payload) : null;
    if (remote && remote.guests.length > 0) return { plan: remote, source: "supabase" };
  }
  const local = readLocal();
  if (local && local.guests.length > 0) return { plan: local, source: "local" };
  return { plan: fallback, source: "demo" };
}

/**
 * Guarda siempre en este navegador y, si Supabase está configurado, actualiza
 * la fila de la demo. Solo se permite UPDATE sobre esa fila (ver supabase/schema.sql).
 */
export async function savePlan(plan: SeatingPlan): Promise<StorageMode> {
  writeLocal(plan);
  const db = supabase();
  const eventId = demoEventId();
  if (!db || !eventId) return "local";
  const { data, error } = await db
    .from("seating_plans")
    .update({ payload: plan, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("La fila de demostración no existe o no se puede actualizar.");
  return "supabase";
}
