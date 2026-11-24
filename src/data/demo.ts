import type { SeatingPlan } from "@/types";

export const demoPlan: SeatingPlan = {
  eventName: "Evento de demostración",
  updatedAt: "2026-11-24T10:00:00.000Z",
  guests: [
    { id: "g1", name: "Invitada 01", group: "Grupo A" },
    { id: "g2", name: "Invitado 02", group: "Grupo A", needs: "Preferencia de ejemplo A" },
    { id: "g3", name: "Invitada 03", group: "Grupo B" },
    { id: "g4", name: "Invitado 04", group: "Grupo B" },
    { id: "g5", name: "Invitada 05", group: "Grupo C" },
    { id: "g6", name: "Invitado 06", group: "Grupo C", needs: "Preferencia de ejemplo B" },
    { id: "g7", name: "Invitada 07", group: "Grupo D" },
    { id: "g8", name: "Invitado 08", group: "Grupo D" },
    { id: "g9", name: "Invitada 09", group: "Grupo E" },
    { id: "g10", name: "Invitado 10", group: "Grupo E" },
    { id: "g11", name: "Invitada 11", group: "Grupo C" },
    { id: "g12", name: "Invitado 12", group: "Grupo B" }
  ],
  relations: [
    { guestA: "g1", guestB: "g2", kind: "affinity", weight: 3 },
    { guestA: "g3", guestB: "g4", kind: "affinity", weight: 3 },
    { guestA: "g5", guestB: "g6", kind: "affinity", weight: 2 },
    { guestA: "g5", guestB: "g11", kind: "affinity", weight: 2 },
    { guestA: "g7", guestB: "g8", kind: "affinity", weight: 3 },
    { guestA: "g9", guestB: "g10", kind: "affinity", weight: 3 },
    { guestA: "g3", guestB: "g12", kind: "affinity", weight: 2 },
    { guestA: "g4", guestB: "g12", kind: "affinity", weight: 1 },
    { guestA: "g2", guestB: "g8", kind: "conflict", weight: 3 },
    { guestA: "g6", guestB: "g11", kind: "conflict", weight: 2 }
  ],
  tables: [
    { id: "t1", name: "Olivo", capacity: 4, guestIds: [] },
    { id: "t2", name: "Lavanda", capacity: 4, guestIds: [] },
    { id: "t3", name: "Azahar", capacity: 4, guestIds: [] }
  ]
};
