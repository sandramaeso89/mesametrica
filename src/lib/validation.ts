import type { Guest, GuestRelation, SeatingPlan, Table } from "@/types";

export const LIMITS = {
  guests: 400,
  tables: 60,
  relations: 2000,
  capacityMin: 1,
  capacityMax: 30,
  name: 80,
  group: 60,
  needs: 200,
  eventName: 80
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export function isValidCapacity(value: number) {
  return Number.isInteger(value) && value >= LIMITS.capacityMin && value <= LIMITS.capacityMax;
}

/**
 * Convierte datos externos (Supabase, localStorage) en un plan coherente.
 *
 * Devuelve `null` si la estructura no es reconocible. Si lo es, corrige en
 * lugar de fallar: descarta relaciones con personas inexistentes, consigo
 * mismas o duplicadas; quita de las mesas ids desconocidos o repetidos; y deja
 * sin mesa a quien exceda la capacidad. Así un dato corrupto nunca rompe la
 * interfaz de quien abre la demo.
 */
export function parsePlan(input: unknown): SeatingPlan | null {
  if (!isRecord(input)) return null;
  if (!Array.isArray(input.guests) || !Array.isArray(input.tables) || !Array.isArray(input.relations)) return null;

  const guests: Guest[] = [];
  const guestIds = new Set<string>();
  for (const raw of input.guests.slice(0, LIMITS.guests)) {
    if (!isRecord(raw)) continue;
    const id = text(raw.id, 64);
    const name = text(raw.name, LIMITS.name);
    if (!id || !name || guestIds.has(id)) continue;
    const needs = text(raw.needs, LIMITS.needs);
    guests.push({ id, name, group: text(raw.group, LIMITS.group) || "Sin grupo", ...(needs ? { needs } : {}) });
    guestIds.add(id);
  }

  const relations: GuestRelation[] = [];
  const pairs = new Set<string>();
  for (const raw of input.relations.slice(0, LIMITS.relations)) {
    if (!isRecord(raw)) continue;
    const guestA = text(raw.guestA, 64);
    const guestB = text(raw.guestB, 64);
    const kind = raw.kind === "affinity" || raw.kind === "conflict" ? raw.kind : null;
    const weight = raw.weight === 1 || raw.weight === 2 || raw.weight === 3 ? raw.weight : null;
    if (!kind || !weight || guestA === guestB || !guestIds.has(guestA) || !guestIds.has(guestB)) continue;
    const key = guestA < guestB ? `${guestA}:${guestB}` : `${guestB}:${guestA}`;
    if (pairs.has(key)) continue;
    pairs.add(key);
    relations.push({ guestA, guestB, kind, weight });
  }

  const tables: Table[] = [];
  const tableIds = new Set<string>();
  const seated = new Set<string>();
  for (const raw of input.tables.slice(0, LIMITS.tables)) {
    if (!isRecord(raw)) continue;
    const id = text(raw.id, 64);
    const capacity = typeof raw.capacity === "number" ? raw.capacity : Number.NaN;
    if (!id || tableIds.has(id) || !isValidCapacity(capacity)) continue;
    const ids = Array.isArray(raw.guestIds) ? raw.guestIds : [];
    const guestIdsAtTable: string[] = [];
    for (const guestId of ids) {
      if (typeof guestId !== "string" || !guestIds.has(guestId) || seated.has(guestId)) continue;
      if (guestIdsAtTable.length >= capacity) break;
      guestIdsAtTable.push(guestId);
      seated.add(guestId);
    }
    tables.push({ id, name: text(raw.name, LIMITS.name) || "Mesa", capacity, guestIds: guestIdsAtTable });
    tableIds.add(id);
  }

  return {
    eventName: text(input.eventName, LIMITS.eventName) || "Evento sin nombre",
    guests,
    relations,
    tables,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date(0).toISOString()
  };
}
