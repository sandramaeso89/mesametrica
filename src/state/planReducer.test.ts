import { describe, expect, it } from "vitest";
import { demoPlan } from "@/data/demo";
import { initialState, planReducer, type PlanAction, type PlanState } from "./planReducer";

const run = (actions: PlanAction[], state: PlanState = initialState(demoPlan)) => actions.reduce(planReducer, state);

describe("planReducer", () => {
  it("genera una propuesta y guarda el informe del algoritmo", () => {
    const state = run([{ type: "generate" }]);
    expect(state.lastSolve?.steps).toHaveLength(demoPlan.guests.length);
    expect(state.plan.tables.flatMap((table) => table.guestIds)).toHaveLength(demoPlan.guests.length);
  });

  it("deshace y rehace", () => {
    const generated = run([{ type: "generate" }]);
    const undone = planReducer(generated, { type: "undo" });
    expect(undone.plan).toBe(demoPlan);
    expect(planReducer(undone, { type: "redo" }).plan).toBe(generated.plan);
  });

  it("ignora acciones inválidas sin crear historial", () => {
    const start = initialState(demoPlan);
    const actions: PlanAction[] = [
      { type: "addRelation", relation: { guestA: "g1", guestB: "g1", kind: "affinity", weight: 2 } },
      { type: "addRelation", relation: { guestA: "g2", guestB: "g1", kind: "conflict", weight: 2 } },
      { type: "addTable", id: "t9", name: "Mesa", capacity: 0 },
      { type: "addGuest", guest: { id: "n", name: "   ", group: "" } },
      { type: "move", guestId: "g1", tableId: "no-existe" }
    ];
    expect(run(actions, start)).toBe(start);
  });

  it("no permite reducir una mesa por debajo de las personas sentadas", () => {
    const generated = run([{ type: "generate" }]);
    const table = generated.plan.tables[0];
    expect(planReducer(generated, { type: "updateTable", id: table.id, name: table.name, capacity: 1 })).toBe(generated);
  });

  it("al eliminar un invitado limpia sus relaciones y su asiento", () => {
    const state = run([{ type: "generate" }, { type: "removeGuest", guestId: "g1" }]);
    expect(state.plan.guests.some((guest) => guest.id === "g1")).toBe(false);
    expect(state.plan.relations.some((relation) => relation.guestA === "g1" || relation.guestB === "g1")).toBe(false);
    expect(state.plan.tables.flatMap((table) => table.guestIds)).not.toContain("g1");
  });

  it("al eliminar una mesa sus invitados quedan sin mesa", () => {
    const generated = run([{ type: "generate" }]);
    const table = generated.plan.tables[0];
    const state = planReducer(generated, { type: "removeTable", id: table.id });
    expect(state.plan.tables).toHaveLength(generated.plan.tables.length - 1);
    expect(state.plan.tables.flatMap((item) => item.guestIds)).not.toContain(table.guestIds[0]);
  });

  it("elimina una relación en cualquier orden de la pareja", () => {
    const state = run([{ type: "removeRelation", guestA: "g2", guestB: "g1" }]);
    expect(state.plan.relations).toHaveLength(demoPlan.relations.length - 1);
  });
});
