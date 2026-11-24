import type { GuestRelation, PlanAnalysis, SeatingPlan, SolverStep, Table } from "@/types";

/**
 * Pesos del modelo. Un conflicto pesa más que una afinidad del mismo nivel:
 * sentar juntas a dos personas enfrentadas hace más daño que separar a dos amigas.
 */
export const AFFINITY_POINTS = 3;
export const CONFLICT_PENALTY = 7;

const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

export type RelationIndex = Map<string, GuestRelation>;

export function indexRelations(relations: GuestRelation[]): RelationIndex {
  return new Map(relations.map((relation) => [pairKey(relation.guestA, relation.guestB), relation]));
}

export function relationBetween(index: RelationIndex, a: string, b: string) {
  return index.get(pairKey(a, b));
}

/** Valor de sentar a `guestId` con las personas de `seatedIds`. */
export function placementValue(guestId: string, seatedIds: string[], index: RelationIndex) {
  let value = 0;
  for (const other of seatedIds) {
    if (other === guestId) continue;
    const relation = relationBetween(index, guestId, other);
    if (!relation) continue;
    value += relation.kind === "affinity" ? relation.weight * AFFINITY_POINTS : -relation.weight * CONFLICT_PENALTY;
  }
  return value;
}

function hasConflictWith(guestId: string, seatedIds: string[], index: RelationIndex) {
  return seatedIds.some((other) => relationBetween(index, guestId, other)?.kind === "conflict");
}

/**
 * Objetivo de la mejora local, lexicográfico: primero minimizar los conflictos
 * en la misma mesa (ponderados) y solo después maximizar las afinidades. Así
 * ninguna suma de afinidades compensa sentar juntas a dos personas enfrentadas.
 */
const CONFLICT_PRIORITY = 10_000;

function pairScore(index: RelationIndex, a: string, b: string) {
  const relation = relationBetween(index, a, b);
  if (!relation) return 0;
  return relation.kind === "affinity" ? relation.weight * AFFINITY_POINTS : -relation.weight * CONFLICT_PRIORITY;
}

/** Valor de `guestId` en una mesa, ignorando a `skip` (quien deja su sitio en un intercambio). */
function seatScore(index: RelationIndex, guestId: string, seated: string[], skip?: string) {
  let total = 0;
  for (const other of seated) if (other !== guestId && other !== skip) total += pairScore(index, guestId, other);
  return total;
}

function objective(tables: Table[], index: RelationIndex) {
  let total = 0;
  for (const table of tables) {
    for (let i = 0; i < table.guestIds.length; i += 1) {
      for (let j = i + 1; j < table.guestIds.length; j += 1) total += pairScore(index, table.guestIds[i], table.guestIds[j]);
    }
  }
  return total;
}

export type SolverResult = {
  plan: SeatingPlan;
  steps: SolverStep[];
  /** Movimientos o intercambios aplicados en la fase de mejora local. */
  improvements: number;
};

/**
 * Genera una distribución en dos fases, siempre determinista:
 *
 * 1. Colocación voraz. Se ordena a los invitados por la suma de pesos de sus
 *    relaciones (los más "difíciles" primero; empate por nombre). Cada uno va a
 *    la mesa con plaza que maximiza su valor, descartando las mesas donde tendría
 *    un conflicto siempre que exista alternativa. Empates: mesa menos llena y,
 *    después, orden de las mesas.
 * 2. Mejora local. Se prueban movimientos a plazas libres e intercambios entre
 *    mesas y se aplica cualquiera que mejore estrictamente el objetivo, hasta que
 *    no quede ninguno. Para salir de óptimos locales se repite desde
 *    perturbaciones pseudoaleatorias con semilla fija (búsqueda local iterada):
 *    el resultado sigue siendo idéntico para la misma entrada.
 */
export function solveSeating(plan: SeatingPlan): SolverResult {
  const index = indexRelations(plan.relations);
  const weightOf = new Map<string, number>(plan.guests.map((guest) => [guest.id, 0]));
  for (const relation of plan.relations) {
    weightOf.set(relation.guestA, (weightOf.get(relation.guestA) ?? 0) + relation.weight);
    weightOf.set(relation.guestB, (weightOf.get(relation.guestB) ?? 0) + relation.weight);
  }

  const order = [...plan.guests].sort((a, b) =>
    (weightOf.get(b.id) ?? 0) - (weightOf.get(a.id) ?? 0) || a.name.localeCompare(b.name, "es") || a.id.localeCompare(b.id)
  );
  const tables: Table[] = plan.tables.map((table) => ({ ...table, guestIds: [] }));
  const steps: SolverStep[] = [];

  for (const guest of order) {
    const open = tables
      .map((table, position) => ({ table, position }))
      .filter(({ table }) => table.guestIds.length < table.capacity);

    if (open.length === 0) {
      steps.push({ guestId: guest.id, tableId: null, value: 0, reason: "no-capacity", partners: [] });
      continue;
    }

    const safe = open.filter(({ table }) => !hasConflictWith(guest.id, table.guestIds, index));
    const pool = safe.length > 0 ? safe : open;
    const ranked = pool
      .map(({ table, position }) => ({
        table,
        position,
        value: placementValue(guest.id, table.guestIds, index),
        fill: table.guestIds.length / table.capacity
      }))
      .sort((a, b) => b.value - a.value || a.fill - b.fill || a.position - b.position);

    const best = ranked[0];
    const partners = best.table.guestIds.filter((id) => relationBetween(index, guest.id, id)?.kind === "affinity");
    const reason: SolverStep["reason"] = safe.length === 0
      ? "forced-conflict"
      : best.value > 0
        ? "affinity"
        : safe.length < open.length ? "avoid-conflict" : "balance";

    best.table.guestIds.push(guest.id);
    steps.push({ guestId: guest.id, tableId: best.table.id, value: best.value, reason, partners });
  }

  const improvements = improveLocally(tables, index, plan.guests.length);
  return { plan: { ...plan, tables, updatedAt: new Date().toISOString() }, steps, improvements };
}

/** Generador pseudoaleatorio con semilla fija (mulberry32): mismas entradas, mismas perturbaciones. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Primera mejora: recorre movimientos e intercambios y aplica el primero que
 * sube el objetivo. Cada evaluación es incremental (solo mira las dos mesas
 * afectadas), así que escala a cientos de invitados.
 */
function localSearch(tables: Table[], index: RelationIndex, maxPasses = 40) {
  let applied = 0;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let improved = false;
    for (let t1 = 0; t1 < tables.length; t1 += 1) {
      for (let t2 = 0; t2 < tables.length; t2 += 1) {
        if (t1 === t2) continue;
        const from = tables[t1].guestIds;
        const to = tables[t2].guestIds;
        for (let i = 0; i < from.length; i += 1) {
          const guest = from[i];
          const leave = seatScore(index, guest, from);

          if (to.length < tables[t2].capacity && seatScore(index, guest, to) > leave) {
            from.splice(i, 1);
            to.push(guest);
            applied += 1;
            improved = true;
            i -= 1;
            continue;
          }

          if (t2 < t1) continue;
          for (let j = 0; j < to.length; j += 1) {
            const other = to[j];
            const delta = seatScore(index, guest, to, other) + seatScore(index, other, from, guest)
              - leave - seatScore(index, other, to);
            if (delta > 0) {
              from[i] = other;
              to[j] = guest;
              applied += 1;
              improved = true;
              break;
            }
          }
        }
      }
    }
    if (!improved) break;
  }
  return applied;
}

function improveLocally(tables: Table[], index: RelationIndex, guestCount: number) {
  let applied = localSearch(tables, index);
  let best = tables.map((table) => [...table.guestIds]);
  let bestValue = objective(tables, index);
  const random = seededRandom(0x5eed);
  // Esfuerzo acotado por el tamaño del problema (no por el reloj, para seguir siendo determinista).
  const kicks = Math.max(0, Math.min(80, Math.floor(4000 / Math.max(1, guestCount * tables.length)) * 4));

  for (let kick = 0; kick < kicks; kick += 1) {
    const occupied = tables.filter((table) => table.guestIds.length > 0);
    if (occupied.length < 2) break;
    tables.forEach((table, position) => { table.guestIds = [...best[position]]; });

    // Perturbación: dos intercambios al azar entre mesas distintas.
    for (let k = 0; k < 2; k += 1) {
      const a = occupied[Math.floor(random() * occupied.length)];
      const b = occupied[Math.floor(random() * occupied.length)];
      if (a === b) continue;
      const i = Math.floor(random() * a.guestIds.length);
      const j = Math.floor(random() * b.guestIds.length);
      [a.guestIds[i], b.guestIds[j]] = [b.guestIds[j], a.guestIds[i]];
    }

    const moves = localSearch(tables, index);
    const value = objective(tables, index);
    if (value > bestValue) {
      bestValue = value;
      best = tables.map((table) => [...table.guestIds]);
      applied += moves + 1;
    }
  }

  tables.forEach((table, position) => { table.guestIds = best[position]; });
  return applied;
}

export function generateSeatingPlan(plan: SeatingPlan): SeatingPlan {
  return solveSeating(plan).plan;
}

/**
 * Puntuación de 0 a 100.
 *
 * - Calidad de las relaciones: cada afinidad cumplida suma 3 × peso; cada
 *   conflicto separado suma 3 × peso; cada conflicto en la misma mesa resta
 *   7 × peso. Se normaliza contra el máximo posible: 50 + 50 × (obtenido / máximo).
 *   Sin relaciones, la calidad es 100.
 * - Se multiplica por la proporción de invitados sentados. Un plan que deja
 *   gente sin mesa nunca puede parecer bueno.
 *
 * Solo cuentan las relaciones en las que las dos personas tienen mesa.
 */
export function analyzePlan(plan: SeatingPlan): PlanAnalysis {
  const tableOf = new Map<string, string>();
  for (const table of plan.tables) for (const id of table.guestIds) tableOf.set(id, table.id);

  let earned = 0;
  let possible = 0;
  let conflicts = 0;
  let affinities = 0;
  let conflictsTotal = 0;
  let affinitiesTotal = 0;
  const inConflict = new Set<string>();

  for (const relation of plan.relations) {
    possible += relation.weight * AFFINITY_POINTS;
    const tableA = tableOf.get(relation.guestA);
    const tableB = tableOf.get(relation.guestB);
    const bothSeated = tableA !== undefined && tableB !== undefined;
    const together = bothSeated && tableA === tableB;

    if (relation.kind === "affinity") {
      affinitiesTotal += 1;
      if (together) {
        affinities += 1;
        earned += relation.weight * AFFINITY_POINTS;
      }
    } else {
      conflictsTotal += 1;
      if (together) {
        conflicts += 1;
        earned -= relation.weight * CONFLICT_PENALTY;
        inConflict.add(relation.guestA);
        inConflict.add(relation.guestB);
      } else if (bothSeated) {
        earned += relation.weight * AFFINITY_POINTS;
      }
    }
  }

  const guestIds = new Set(plan.guests.map((guest) => guest.id));
  const seated = [...tableOf.keys()].filter((id) => guestIds.has(id)).length;
  const unseated = plan.guests.filter((guest) => !tableOf.has(guest.id)).map((guest) => guest.id);
  const capacity = plan.tables.reduce((sum, table) => sum + table.capacity, 0);
  const occupied = plan.tables.reduce((sum, table) => sum + table.guestIds.length, 0);

  const quality = possible === 0 ? 100 : 50 + 50 * (earned / possible);
  const seatedRatio = plan.guests.length === 0 ? 1 : seated / plan.guests.length;
  const score = Math.round(Math.max(0, Math.min(100, quality)) * seatedRatio);

  return {
    score,
    seated,
    unseated,
    conflicts,
    conflictsTotal,
    affinities,
    affinitiesTotal,
    freeSeats: Math.max(0, capacity - occupied),
    missingSeats: Math.max(0, plan.guests.length - capacity),
    guestsInConflict: [...inConflict]
  };
}

/**
 * Mueve a un invitado a otra mesa o lo deja sin mesa (`targetTableId = null`).
 * Devuelve el mismo objeto si el movimiento no es posible (mesa completa o inexistente).
 */
export function moveGuest(plan: SeatingPlan, guestId: string, targetTableId: string | null): SeatingPlan {
  if (!plan.guests.some((guest) => guest.id === guestId)) return plan;
  if (targetTableId !== null) {
    const target = plan.tables.find((table) => table.id === targetTableId);
    if (!target) return plan;
    if (target.guestIds.includes(guestId)) return plan;
    if (target.guestIds.length >= target.capacity) return plan;
  }
  return {
    ...plan,
    updatedAt: new Date().toISOString(),
    tables: plan.tables.map((table) => {
      const without = table.guestIds.filter((id) => id !== guestId);
      return { ...table, guestIds: table.id === targetTableId ? [...without, guestId] : without };
    })
  };
}

/**
 * Intercambia el asiento de dos invitados. Si uno no tiene mesa, ocupa el
 * asiento del otro y este queda sin mesa.
 */
export function swapGuests(plan: SeatingPlan, guestA: string, guestB: string): SeatingPlan {
  if (guestA === guestB) return plan;
  const known = new Set(plan.guests.map((guest) => guest.id));
  if (!known.has(guestA) || !known.has(guestB)) return plan;
  const tableA = plan.tables.find((table) => table.guestIds.includes(guestA));
  const tableB = plan.tables.find((table) => table.guestIds.includes(guestB));
  if ((!tableA && !tableB) || tableA === tableB) return plan;
  return {
    ...plan,
    updatedAt: new Date().toISOString(),
    tables: plan.tables.map((table) => ({
      ...table,
      guestIds: table.guestIds.map((id) => (id === guestA ? guestB : id === guestB ? guestA : id))
    }))
  };
}

/** Puntuación que tendría el plan tras un movimiento, sin modificarlo. */
export function scoreAfterMove(plan: SeatingPlan, guestId: string, targetTableId: string | null) {
  const next = moveGuest(plan, guestId, targetTableId);
  return next === plan ? null : analyzePlan(next).score;
}

export function scoreAfterSwap(plan: SeatingPlan, guestA: string, guestB: string) {
  const next = swapGuests(plan, guestA, guestB);
  return next === plan ? null : analyzePlan(next).score;
}
