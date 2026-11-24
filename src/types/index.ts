export type Guest = {
  id: string;
  name: string;
  group: string;
  needs?: string;
};

export type GuestRelation = {
  guestA: string;
  guestB: string;
  kind: "affinity" | "conflict";
  weight: 1 | 2 | 3;
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

export type PlanAnalysis = {
  score: number;
  maxScore: number;
  conflicts: number;
  affinities: number;
  unseated: string[];
  explanations: Record<string, string[]>;
};
