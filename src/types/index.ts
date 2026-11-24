export type Guest = {
  id: string;
  name: string;
  group: string;
  needs?: string;
};

export type RelationKind = "affinity" | "conflict";
export type RelationWeight = 1 | 2 | 3;

export type GuestRelation = {
  guestA: string;
  guestB: string;
  kind: RelationKind;
  weight: RelationWeight;
};

export type Table = {
  id: string;
  name: string;
  capacity: number;
  guestIds: string[];
};

export type SeatingPlan = {
  eventName: string;
  guests: Guest[];
  relations: GuestRelation[];
  tables: Table[];
  updatedAt: string;
};

/** Una decisión del algoritmo, en el orden en que se tomó. */
export type SolverStep = {
  guestId: string;
  tableId: string | null;
  /** Valor de la colocación: afinidades suman, conflictos restan. */
  value: number;
  reason: "affinity" | "avoid-conflict" | "balance" | "forced-conflict" | "no-capacity";
  /** Invitados ya sentados con los que tiene afinidad en la mesa elegida. */
  partners: string[];
};

export type PlanAnalysis = {
  score: number;
  seated: number;
  unseated: string[];
  conflicts: number;
  conflictsTotal: number;
  affinities: number;
  affinitiesTotal: number;
  freeSeats: number;
  /** Plazas que faltan para sentar a todo el mundo (0 si hay sitio). */
  missingSeats: number;
  /** Invitados que comparten mesa con alguien con quien tienen conflicto. */
  guestsInConflict: string[];
};
