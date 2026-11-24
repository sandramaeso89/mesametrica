import type { GuestRelation, PlanAnalysis, SeatingPlan, Table } from "@/types";

const relationKey = (a: string, b: string) => [a, b].sort().join(":");

function relationMap(relations: GuestRelation[]) {
  return new Map(relations.map((relation) => [relationKey(relation.guestA, relation.guestB), relation]));
}

function placementValue(guestId: string, table: Table, relations: Map<string, GuestRelation>) {
  return table.guestIds.reduce((value, seatedId) => {
    const relation = relations.get(relationKey(guestId, seatedId));
    if (!relation) return value;
    return value + (relation.kind === "affinity" ? relation.weight * 3 : relation.weight * -7);
  }, 0);
}

export function generateSeatingPlan(plan: SeatingPlan): SeatingPlan {
  const relations = relationMap(plan.relations);
  const degree = new Map<string, number>();
  for (const guest of plan.guests) degree.set(guest.id, 0);
  for (const relation of plan.relations) {
    degree.set(relation.guestA, (degree.get(relation.guestA) ?? 0) + relation.weight);
    degree.set(relation.guestB, (degree.get(relation.guestB) ?? 0) + relation.weight);
  }

  const guests = [...plan.guests].sort((a, b) => {
    const difference = (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0);
    return difference || a.name.localeCompare(b.name, "es");
  });
  const tables = plan.tables.map((table) => ({ ...table, guestIds: [] as string[] }));

  for (const guest of guests) {
    const candidates = tables
      .filter((table) => table.guestIds.length < table.capacity)
      .map((table, index) => ({
        table,
        index,
        value: placementValue(guest.id, table, relations),
        fill: table.guestIds.length / table.capacity
      }))
      .sort((a, b) => b.value - a.value || a.fill - b.fill || a.index - b.index);
    candidates[0]?.table.guestIds.push(guest.id);
  }

  return { ...plan, tables, updatedAt: new Date().toISOString() };
}

export function analyzePlan(plan: SeatingPlan): PlanAnalysis {
  const seated = new Set(plan.tables.flatMap((table) => table.guestIds));
  const tableByGuest = new Map<string, string>();
  const explanations: Record<string, string[]> = {};
  plan.guests.forEach((guest) => { explanations[guest.id] = []; });
  plan.tables.forEach((table) => table.guestIds.forEach((id) => tableByGuest.set(id, table.id)));

  let rawScore = 0;
  let maxScore = 0;
  let conflicts = 0;
  let affinities = 0;
  const guestName = new Map(plan.guests.map((guest) => [guest.id, guest.name]));

  for (const relation of plan.relations) {
    const together = tableByGuest.get(relation.guestA) === tableByGuest.get(relation.guestB);
    maxScore += relation.weight * 3;
    if (relation.kind === "affinity" && together) {
      rawScore += relation.weight * 3;
      affinities += 1;
      explanations[relation.guestA]?.push(`Coincide con ${guestName.get(relation.guestB)} por afinidad.`);
      explanations[relation.guestB]?.push(`Coincide con ${guestName.get(relation.guestA)} por afinidad.`);
    }
    if (relation.kind === "conflict") {
      if (together) {
        rawScore -= relation.weight * 7;
        conflicts += 1;
        explanations[relation.guestA]?.push(`Revisar: comparte mesa con ${guestName.get(relation.guestB)}.`);
        explanations[relation.guestB]?.push(`Revisar: comparte mesa con ${guestName.get(relation.guestA)}.`);
      } else if (tableByGuest.has(relation.guestA) && tableByGuest.has(relation.guestB)) {
        rawScore += relation.weight * 2;
      }
    }
  }

  for (const guest of plan.guests) {
    if (seated.has(guest.id) && explanations[guest.id].length === 0) {
      explanations[guest.id].push("Ubicación equilibrada según la capacidad disponible.");
    }
  }

  const positiveBase = Math.max(maxScore, 1);
  const score = Math.max(0, Math.min(100, Math.round(55 + (rawScore / positiveBase) * 45)));
  return {
    score,
    maxScore: 100,
    conflicts,
    affinities,
    unseated: plan.guests.filter((guest) => !seated.has(guest.id)).map((guest) => guest.id),
    explanations
  };
}

export function moveGuest(plan: SeatingPlan, guestId: string, targetTableId: string): SeatingPlan {
  const target = plan.tables.find((table) => table.id === targetTableId);
  if (!target || (target.guestIds.length >= target.capacity && !target.guestIds.includes(guestId))) return plan;
  return {
    ...plan,
    updatedAt: new Date().toISOString(),
    tables: plan.tables.map((table) => ({
      ...table,
      guestIds: table.id === targetTableId
        ? [...table.guestIds.filter((id) => id !== guestId), guestId]
        : table.guestIds.filter((id) => id !== guestId)
    }))
  };
}
