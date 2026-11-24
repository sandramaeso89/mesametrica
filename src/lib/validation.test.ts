import { describe, expect, it } from "vitest";
import { demoPlan } from "@/data/demo";
import { isValidCapacity, parsePlan } from "./validation";

describe("parsePlan", () => {
  it("acepta el plan de demostración sin cambios de contenido", () => {
    const parsed = parsePlan(JSON.parse(JSON.stringify(demoPlan)));
    expect(parsed?.guests).toEqual(demoPlan.guests);
    expect(parsed?.relations).toEqual(demoPlan.relations);
    expect(parsed?.tables).toEqual(demoPlan.tables);
  });

  it("rechaza estructuras que no son un plan", () => {
    expect(parsePlan(null)).toBeNull();
    expect(parsePlan("hola")).toBeNull();
    expect(parsePlan({ guests: [] })).toBeNull();
  });

  it("corrige datos corruptos en lugar de romper la interfaz", () => {
    const parsed = parsePlan({
      eventName: "  Boda  ",
      guests: [
        { id: "a", name: "Ana" },
        { id: "a", name: "Duplicada" },
        { id: "b", name: "Bea", group: "Trabajo" },
        { id: "c", name: "" },
        "basura"
      ],
      relations: [
        { guestA: "a", guestB: "a", kind: "affinity", weight: 3 },
        { guestA: "a", guestB: "x", kind: "affinity", weight: 3 },
        { guestA: "a", guestB: "b", kind: "conflict", weight: 2 },
        { guestA: "b", guestB: "a", kind: "affinity", weight: 1 },
        { guestA: "a", guestB: "b", kind: "odio", weight: 9 }
      ],
      tables: [
        { id: "t1", name: "Uno", capacity: 1, guestIds: ["fantasma", "a", "b"] },
        { id: "t2", name: "Dos", capacity: 1e9, guestIds: [] },
        { id: "t3", name: "Tres", capacity: 4, guestIds: ["a", "b"] }
      ]
    });

    expect(parsed?.eventName).toBe("Boda");
    expect(parsed?.guests.map((guest) => guest.id)).toEqual(["a", "b"]);
    expect(parsed?.guests[0].group).toBe("Sin grupo");
    expect(parsed?.relations).toEqual([{ guestA: "a", guestB: "b", kind: "conflict", weight: 2 }]);
    expect(parsed?.tables.map((table) => table.id)).toEqual(["t1", "t3"]);
    expect(parsed?.tables[0].guestIds).toEqual(["a"]);
    expect(parsed?.tables[1].guestIds).toEqual(["b"]);
  });
});

describe("isValidCapacity", () => {
  it("solo admite enteros dentro del rango", () => {
    expect(isValidCapacity(8)).toBe(true);
    expect(isValidCapacity(0)).toBe(false);
    expect(isValidCapacity(2.5)).toBe(false);
    expect(isValidCapacity(1000)).toBe(false);
  });
});
