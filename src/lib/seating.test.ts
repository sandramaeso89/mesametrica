import { describe, expect, it } from "vitest";
import { demoPlan } from "@/data/demo";
import { analyzePlan, generateSeatingPlan, moveGuest } from "./seating";

describe("seating algorithm", () => {
  it("seats every guest when capacity is sufficient", () => {
    const result = generateSeatingPlan(demoPlan);
    expect(result.tables.flatMap((table) => table.guestIds)).toHaveLength(demoPlan.guests.length);
    expect(analyzePlan(result).unseated).toHaveLength(0);
  });

  it("does not exceed table capacity", () => {
    const result = generateSeatingPlan(demoPlan);
    result.tables.forEach((table) => expect(table.guestIds.length).toBeLessThanOrEqual(table.capacity));
  });

  it("is deterministic for identical input", () => {
    const first = generateSeatingPlan(demoPlan).tables.map((table) => table.guestIds);
    const second = generateSeatingPlan(demoPlan).tables.map((table) => table.guestIds);
    expect(second).toEqual(first);
  });

  it("keeps high-weight conflicts apart", () => {
    const result = generateSeatingPlan(demoPlan);
    const tableOf = (id: string) => result.tables.find((table) => table.guestIds.includes(id))?.id;
    expect(tableOf("g2")).not.toBe(tableOf("g8"));
  });

  it("rejects a move into a full table", () => {
    const result = generateSeatingPlan(demoPlan);
    const full = result.tables.find((table) => table.guestIds.length === table.capacity)!;
    const guestOutside = result.guests.find((guest) => !full.guestIds.includes(guest.id))!;
    expect(moveGuest(result, guestOutside.id, full.id)).toBe(result);
  });

  it("keeps a strong affinity together when space allows", () => {
    const result = generateSeatingPlan(demoPlan);
    const tableOf = (id: string) => result.tables.find((table) => table.guestIds.includes(id))?.id;
    expect(tableOf("g3")).toBe(tableOf("g4"));
  });

  it("leaves guests unseated when capacity is insufficient", () => {
    const result = generateSeatingPlan({ ...demoPlan, tables: [{ id: "tiny", name: "Única", capacity: 2, guestIds: [] }] });
    expect(result.tables[0].guestIds).toHaveLength(2);
    expect(analyzePlan(result).unseated).toHaveLength(demoPlan.guests.length - 2);
  });

  it("handles an empty event and an event without tables", () => {
    const empty = generateSeatingPlan({ ...demoPlan, guests: [], relations: [] });
    expect(analyzePlan(empty).unseated).toEqual([]);
    const withoutTables = generateSeatingPlan({ ...demoPlan, tables: [] });
    expect(analyzePlan(withoutTables).unseated).toHaveLength(demoPlan.guests.length);
  });

  it("never duplicates or loses guests when capacity is sufficient", () => {
    const result = generateSeatingPlan(demoPlan);
    const ids = result.tables.flatMap((table) => table.guestIds);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(demoPlan.guests.map((guest) => guest.id)));
  });
});
