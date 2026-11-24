export type Selection = { kind: "guest"; id: string } | { kind: "table"; id: string } | null;

export type RelationLayer = "all" | "conflicts" | "none";

export type DragTarget =
  | { kind: "table"; tableId: string; swapWith: string | null; allowed: boolean; score: number | null }
  | { kind: "unseat"; score: number | null }
  | null;

export type DragState = {
  guestId: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moving: boolean;
  target: DragTarget;
};

/** Lo que el plano sabe responder: qué hay bajo el puntero. */
export type FloorHit = { tableId: string; seatGuestId: string | null } | null;
export type FloorHitTest = (clientX: number, clientY: number) => FloorHit;
