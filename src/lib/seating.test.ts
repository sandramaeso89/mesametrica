import { describe, expect, it } from "vitest";
import { demoPlan } from "@/data/demo";
import type { SeatingPlan } from "@/types";
import { analyzePlan, generateSeatingPlan, moveGuest, scoreAfterMove, solveSeating, swapGuests } from "./seating";

const tableOf = (plan: SeatingPlan, id: string) => plan.tables.find((table) => table.guestIds.includes(id))?.id;
const seatedIds = (plan: SeatingPlan) => plan.tables.flatMap((table) => table.guestIds);

function smallPlan(overrides: Partial<SeatingPlan> = {}): SeatingPlan {
  return {
    eventName: "Prueba",
    updatedAt: "2026-01-01T00:00:00.000Z",
    guests: ["a", "b", "c", "d"].map((id) => ({ id, name: `Persona ${id}`, group: "G" })),
    relations: [],
    tables: [
      { id: "t1", name: "Uno", capacity: 2, guestIds: [] },
      { id: "t2", name: "Dos", capacity: 2, guestIds: [] }
    ],
    ...overrides
  };
}

describe("generación", () => {
  it("sienta a todo el mundo cuando hay plazas", () => {
    const result = generateSeatingPlan(demoPlan);
    expect(seatedIds(result)).toHaveLength(demoPlan.guests.length);
    expect(analyzePlan(result).unseated).toEqual([]);
  });

  it("no supera la capacidad de ninguna mesa", () => {
    const result = generateSeatingPlan(demoPlan);
    for (const table of result.tables) expect(table.guestIds.length).toBeLessThanOrEqual(table.capacity);
  });

  it("es determinista con la misma entrada", () => {
    const first = generateSeatingPlan(demoPlan).tables.map((table) => table.guestIds);
    const second = generateSeatingPlan(demoPlan).tables.map((table) => table.guestIds);
    expect(second).toEqual(first);
  });

  it("no duplica ni pierde invitados", () => {
    const ids = seatedIds(generateSeatingPlan(demoPlan));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(demoPlan.guests.map((guest) => guest.id)));
  });

  it("deja el plan de demostración sin conflictos y con buena puntuación", () => {
    const analysis = analyzePlan(generateSeatingPlan(demoPlan));
    expect(analysis.conflicts).toBe(0);
    expect(analysis.score).toBeGreaterThanOrEqual(80);
  });

  it("mantiene juntas las afinidades fuertes cuando cabe", () => {
    const result = generateSeatingPlan(demoPlan);
    expect(tableOf(result, "g3")).toBe(tableOf(result, "g4"));
    expect(tableOf(result, "g9")).toBe(tableOf(result, "g10"));
  });

  it("separa un conflicto aunque las afinidades empujen a juntarlos", () => {
    // a y b se odian (peso 1) pero ambos adoran a c (peso 3). Hay sitio para separarlos.
    const plan = smallPlan({
      guests: ["a", "b", "c", "d"].map((id) => ({ id, name: `Persona ${id}`, group: "G" })),
      relations: [
        { guestA: "a", guestB: "b", kind: "conflict", weight: 1 },
        { guestA: "a", guestB: "c", kind: "affinity", weight: 3 },
        { guestA: "b", guestB: "c", kind: "affinity", weight: 3 }
      ],
      tables: [
        { id: "t1", name: "Uno", capacity: 3, guestIds: [] },
        { id: "t2", name: "Dos", capacity: 3, guestIds: [] }
      ]
    });
    const result = generateSeatingPlan(plan);
    expect(tableOf(result, "a")).not.toBe(tableOf(result, "b"));
    expect(analyzePlan(result).conflicts).toBe(0);
  });

  it("acepta un conflicto solo cuando no hay ninguna alternativa", () => {
    const plan = smallPlan({
      guests: [{ id: "a", name: "A", group: "G" }, { id: "b", name: "B", group: "G" }],
      relations: [{ guestA: "a", guestB: "b", kind: "conflict", weight: 3 }],
      tables: [{ id: "t1", name: "Única", capacity: 2, guestIds: [] }]
    });
    const { plan: result, steps } = solveSeating(plan);
    expect(analyzePlan(result).conflicts).toBe(1);
    expect(steps.some((step) => step.reason === "forced-conflict")).toBe(true);
  });

  it("deja sin mesa a quien no cabe y lo registra", () => {
    const { plan: result, steps } = solveSeating({ ...demoPlan, tables: [{ id: "x", name: "Única", capacity: 2, guestIds: [] }] });
    expect(result.tables[0].guestIds).toHaveLength(2);
    expect(steps.filter((step) => step.reason === "no-capacity")).toHaveLength(demoPlan.guests.length - 2);
  });

  it("funciona sin invitados y sin mesas", () => {
    expect(analyzePlan(generateSeatingPlan({ ...demoPlan, guests: [], relations: [] })).unseated).toEqual([]);
    expect(analyzePlan(generateSeatingPlan({ ...demoPlan, tables: [] })).unseated).toHaveLength(demoPlan.guests.length);
  });

  it("la mejora local encuentra el óptimo de la demo (7 de 8 afinidades)", () => {
    // La octava es imposible: g5 tiene afinidad con g6 y con g11, que están en conflicto.
    const { plan: result, improvements } = solveSeating(demoPlan);
    const analysis = analyzePlan(result);
    expect(analysis.affinities).toBe(7);
    expect(analysis.conflicts).toBe(0);
    expect(improvements).toBeGreaterThan(0);
  });

  it("resuelve 300 invitados sin conflictos en un tiempo razonable", () => {
    const n = 300;
    const guests = Array.from({ length: n }, (_, i) => ({ id: `x${i}`, name: `Persona ${i}`, group: "G" }));
    const relations: SeatingPlan["relations"] = [];
    for (let i = 0; i < n * 2; i += 1) {
      const a = (i * 7) % n;
      const b = (i * 13 + 5) % n;
      if (a !== b) relations.push({ guestA: `x${a}`, guestB: `x${b}`, kind: i % 5 ? "affinity" : "conflict", weight: ((i % 3) + 1) as 1 | 2 | 3 });
    }
    const tables = Array.from({ length: 30 }, (_, i) => ({ id: `t${i}`, name: `Mesa ${i}`, capacity: 10, guestIds: [] }));
    const started = performance.now();
    const analysis = analyzePlan(generateSeatingPlan({ ...demoPlan, guests, relations, tables }));
    expect(performance.now() - started).toBeLessThan(3000);
    expect(analysis.seated).toBe(n);
    expect(analysis.conflicts).toBe(0);
  });
});

describe("análisis", () => {
  it("no cuenta como juntos a dos invitados sin mesa", () => {
    const analysis = analyzePlan(demoPlan); // nadie está sentado
    expect(analysis.conflicts).toBe(0);
    expect(analysis.affinities).toBe(0);
    expect(analysis.score).toBe(0);
  });

  it("penaliza la puntuación cuando falta gente por sentar", () => {
    const full = analyzePlan(generateSeatingPlan(demoPlan));
    const tiny = analyzePlan(generateSeatingPlan({ ...demoPlan, tables: [{ id: "x", name: "Única", capacity: 2, guestIds: [] }] }));
    expect(tiny.score).toBeLessThan(full.score / 4);
    expect(tiny.missingSeats).toBe(demoPlan.guests.length - 2);
  });

  it("marca a las personas que comparten mesa en conflicto", () => {
    const plan = smallPlan({
      relations: [{ guestA: "a", guestB: "b", kind: "conflict", weight: 2 }],
      tables: [{ id: "t1", name: "Uno", capacity: 4, guestIds: ["a", "b"] }]
    });
    expect(analyzePlan(plan).guestsInConflict.sort()).toEqual(["a", "b"]);
  });

  it("puntúa 100 un evento sin relaciones con todo el mundo sentado", () => {
    expect(analyzePlan(smallPlan({ tables: [{ id: "t1", name: "Uno", capacity: 4, guestIds: ["a", "b", "c", "d"] }] })).score).toBe(100);
  });
});

describe("edición manual", () => {
  it("rechaza mover a alguien a una mesa completa", () => {
    const result = generateSeatingPlan(demoPlan);
    const full = result.tables.find((table) => table.guestIds.length === table.capacity)!;
    const outsider = result.guests.find((guest) => !full.guestIds.includes(guest.id))!;
    expect(moveGuest(result, outsider.id, full.id)).toBe(result);
  });

  it("permite dejar a alguien sin mesa", () => {
    const result = generateSeatingPlan(demoPlan);
    const moved = moveGuest(result, "g1", null);
    expect(tableOf(moved, "g1")).toBeUndefined();
    expect(analyzePlan(moved).unseated).toEqual(["g1"]);
  });

  it("intercambia a dos personas de mesas completas sin duplicar a nadie", () => {
    const result = generateSeatingPlan(demoPlan);
    const [t1, t2] = result.tables;
    const a = t1.guestIds[0];
    const b = t2.guestIds[0];
    const swapped = swapGuests(result, a, b);
    expect(tableOf(swapped, a)).toBe(t2.id);
    expect(tableOf(swapped, b)).toBe(t1.id);
    expect(seatedIds(swapped)).toHaveLength(seatedIds(result).length);
  });

  it("al intercambiar con alguien sin mesa, ocupa su asiento", () => {
    const plan = smallPlan({ tables: [{ id: "t1", name: "Uno", capacity: 1, guestIds: ["a"] }] });
    const swapped = swapGuests(plan, "b", "a");
    expect(swapped.tables[0].guestIds).toEqual(["b"]);
  });

  it("calcula la puntuación de un movimiento sin modificar el plan", () => {
    const result = generateSeatingPlan(demoPlan);
    const before = JSON.stringify(result);
    expect(scoreAfterMove(result, "g1", null)).toBeLessThan(analyzePlan(result).score);
    expect(JSON.stringify(result)).toBe(before);
  });
});
