import { analyzePlan, moveGuest, solveSeating, swapGuests } from "@/lib/seating";
import { isValidCapacity, LIMITS } from "@/lib/validation";
import type { Guest, GuestRelation, SeatingPlan, SolverStep } from "@/types";

const HISTORY_LIMIT = 50;

export type SolveReport = { steps: SolverStep[]; improvements: number; at: string };

export type PlanState = {
  plan: SeatingPlan;
  past: SeatingPlan[];
  future: SeatingPlan[];
  lastSolve: SolveReport | null;
  /** Cambia con cada edición del usuario; sirve para decidir cuándo guardar. */
  revision: number;
  /** Puntuación antes del último cambio, para mostrar la diferencia. */
  scoreBefore: number | null;
};

export type PlanAction =
  | { type: "load"; plan: SeatingPlan }
  | { type: "generate" }
  | { type: "move"; guestId: string; tableId: string | null }
  | { type: "swap"; guestA: string; guestB: string }
  | { type: "clearSeating" }
  | { type: "addGuest"; guest: Guest }
  | { type: "updateGuest"; guest: Guest }
  | { type: "removeGuest"; guestId: string }
  | { type: "addRelation"; relation: GuestRelation }
  | { type: "removeRelation"; guestA: string; guestB: string }
  | { type: "addTable"; id: string; name: string; capacity: number }
  | { type: "updateTable"; id: string; name: string; capacity: number }
  | { type: "removeTable"; id: string }
  | { type: "undo" }
  | { type: "redo" };

export function initialState(plan: SeatingPlan): PlanState {
  return { plan, past: [], future: [], lastSolve: null, revision: 0, scoreBefore: null };
}

const touch = (plan: SeatingPlan): SeatingPlan => ({ ...plan, updatedAt: new Date().toISOString() });

function commit(state: PlanState, plan: SeatingPlan, lastSolve: SolveReport | null = state.lastSolve): PlanState {
  if (plan === state.plan) return state;
  return {
    plan,
    past: [...state.past, state.plan].slice(-HISTORY_LIMIT),
    future: [],
    lastSolve,
    revision: state.revision + 1,
    scoreBefore: analyzePlan(state.plan).score
  };
}

const samePair = (relation: GuestRelation, a: string, b: string) =>
  (relation.guestA === a && relation.guestB === b) || (relation.guestA === b && relation.guestB === a);

export function planReducer(state: PlanState, action: PlanAction): PlanState {
  const { plan } = state;

  switch (action.type) {
    case "load":
      return initialState(action.plan);

    case "generate": {
      const result = solveSeating(plan);
      return commit(state, result.plan, { steps: result.steps, improvements: result.improvements, at: result.plan.updatedAt });
    }

    case "move":
      return commit(state, moveGuest(plan, action.guestId, action.tableId));

    case "swap":
      return commit(state, swapGuests(plan, action.guestA, action.guestB));

    case "clearSeating":
      if (plan.tables.every((table) => table.guestIds.length === 0)) return state;
      return commit(state, touch({ ...plan, tables: plan.tables.map((table) => ({ ...table, guestIds: [] })) }), null);

    case "addGuest": {
      const { guest } = action;
      if (!guest.name.trim() || plan.guests.length >= LIMITS.guests || plan.guests.some((item) => item.id === guest.id)) return state;
      return commit(state, touch({ ...plan, guests: [...plan.guests, guest] }));
    }

    case "updateGuest": {
      const { guest } = action;
      if (!guest.name.trim() || !plan.guests.some((item) => item.id === guest.id)) return state;
      return commit(state, touch({ ...plan, guests: plan.guests.map((item) => (item.id === guest.id ? guest : item)) }));
    }

    case "removeGuest": {
      if (!plan.guests.some((guest) => guest.id === action.guestId)) return state;
      return commit(state, touch({
        ...plan,
        guests: plan.guests.filter((guest) => guest.id !== action.guestId),
        relations: plan.relations.filter((relation) => relation.guestA !== action.guestId && relation.guestB !== action.guestId),
        tables: plan.tables.map((table) => ({ ...table, guestIds: table.guestIds.filter((id) => id !== action.guestId) }))
      }));
    }

    case "addRelation": {
      const { relation } = action;
      const ids = new Set(plan.guests.map((guest) => guest.id));
      if (relation.guestA === relation.guestB || !ids.has(relation.guestA) || !ids.has(relation.guestB)) return state;
      if (plan.relations.some((item) => samePair(item, relation.guestA, relation.guestB))) return state;
      return commit(state, touch({ ...plan, relations: [...plan.relations, relation] }));
    }

    case "removeRelation": {
      const relations = plan.relations.filter((relation) => !samePair(relation, action.guestA, action.guestB));
      if (relations.length === plan.relations.length) return state;
      return commit(state, touch({ ...plan, relations }));
    }

    case "addTable": {
      if (!action.name.trim() || !isValidCapacity(action.capacity) || plan.tables.length >= LIMITS.tables) return state;
      return commit(state, touch({ ...plan, tables: [...plan.tables, { id: action.id, name: action.name.trim(), capacity: action.capacity, guestIds: [] }] }));
    }

    case "updateTable": {
      const table = plan.tables.find((item) => item.id === action.id);
      if (!table || !action.name.trim() || !isValidCapacity(action.capacity) || action.capacity < table.guestIds.length) return state;
      return commit(state, touch({
        ...plan,
        tables: plan.tables.map((item) => (item.id === action.id ? { ...item, name: action.name.trim(), capacity: action.capacity } : item))
      }));
    }

    case "removeTable": {
      if (!plan.tables.some((table) => table.id === action.id)) return state;
      return commit(state, touch({ ...plan, tables: plan.tables.filter((table) => table.id !== action.id) }));
    }

    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return { ...state, plan: previous, past: state.past.slice(0, -1), future: [state.plan, ...state.future], revision: state.revision + 1, scoreBefore: analyzePlan(state.plan).score };
    }

    case "redo": {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return { ...state, plan: next, past: [...state.past, state.plan], future: rest, revision: state.revision + 1, scoreBefore: analyzePlan(state.plan).score };
    }
  }
}
