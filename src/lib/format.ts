import type { SolverStep } from "@/types";

/** Iniciales para un asiento: "Ana López" → "AL"; "Invitada 07" → "07". */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const last = words.at(-1) ?? "";
  if (/^\d+$/.test(last)) return last.padStart(2, "0").slice(-2);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Texto para búsquedas: sin mayúsculas ni tildes ("Lucía" encuentra "lucia"). */
export const searchable = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");

export const signed =(value: number) => (value > 0 ? `+${value}` : String(value));

export const STEP_REASON: Record<SolverStep["reason"], string> = {
  affinity: "afinidad",
  "avoid-conflict": "evita conflicto",
  balance: "equilibrio",
  "forced-conflict": "conflicto inevitable",
  "no-capacity": "sin plazas"
};

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
