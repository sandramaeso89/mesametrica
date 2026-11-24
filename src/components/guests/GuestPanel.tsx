"use client";

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { initials, searchable } from "@/lib/format";
import type { PlanAnalysis, SeatingPlan } from "@/types";
import type { DragState, Selection } from "@/components/workspace/types";

type Props = {
  plan: SeatingPlan;
  analysis: PlanAnalysis;
  selection: Selection;
  drag: DragState | null;
  onSelect: (selection: Selection) => void;
  onStartDrag: (guestId: string, event: ReactPointerEvent) => void;
  onAddGuest: () => void;
};

export function GuestPanel({ plan, analysis, selection, drag, onSelect, onStartDrag, onAddGuest }: Props) {
  const [query, setQuery] = useState("");
  const tableName = useMemo(() => {
    const map = new Map<string, string>();
    for (const table of plan.tables) for (const id of table.guestIds) map.set(id, table.name);
    return map;
  }, [plan.tables]);
  const conflicted = useMemo(() => new Set(analysis.guestsInConflict), [analysis.guestsInConflict]);

  const normalized = searchable(query.trim());
  const visible = plan.guests.filter((guest) =>
    !normalized || searchable(`${guest.name} ${guest.group} ${guest.needs ?? ""}`).includes(normalized)
  );
  const unseated = visible.filter((guest) => !tableName.has(guest.id));
  const seated = visible.filter((guest) => tableName.has(guest.id));
  const isUnseatTarget = drag?.moving && drag.target?.kind === "unseat";

  const row = (guestId: string) => {
    const guest = plan.guests.find((item) => item.id === guestId)!;
    const table = tableName.get(guest.id);
    const selected = selection?.kind === "guest" && selection.id === guest.id;
    return (
      <li key={guest.id}>
        <button
          type="button"
          className={`guest-row ${selected ? "is-selected" : ""} ${drag?.moving && drag.guestId === guest.id ? "is-ghost" : ""}`}
          aria-pressed={selected}
          onPointerDown={(event) => onStartDrag(guest.id, event)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect({ kind: "guest", id: guest.id });
            }
          }}
        >
          <span className={`avatar ${conflicted.has(guest.id) ? "is-conflict" : ""}`} aria-hidden="true">{initials(guest.name)}</span>
          <span className="guest-text">
            <span className="guest-name">{guest.name}</span>
            <span className="guest-meta">{guest.group}{guest.needs ? ` · ${guest.needs}` : ""}</span>
          </span>
          <span className={`chip ${table ? "" : "chip-warn"}`}>{table ?? "sin mesa"}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="guest-panel">
      <div className="panel-head">
        <div className="panel-title">
          <h2 className="eyebrow">Invitados</h2>
          <span className="mono muted">{analysis.seated}/{plan.guests.length}</span>
        </div>
        <button type="button" className="btn btn-sm" onClick={onAddGuest}>
          Añadir <kbd>N</kbd>
        </button>
      </div>
      <label className="search">
        <span className="sr-only">Filtrar invitados</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar por nombre, grupo o nota" />
      </label>

      <section
        className={`unseated ${isUnseatTarget ? "is-target" : ""} ${unseated.length === 0 ? "is-empty" : ""}`}
        data-drop="unseat"
        aria-label="Invitados sin mesa"
      >
        <h3 className="eyebrow">
          Sin mesa <span className="mono">{analysis.unseated.length}</span>
        </h3>
        {unseated.length > 0 ? (
          <ul className="guest-list">{unseated.map((guest) => row(guest.id))}</ul>
        ) : (
          <p className="hint">{isUnseatTarget ? "Suelta aquí para quitarle la mesa" : "Todo el mundo tiene mesa. Arrastra aquí a alguien para quitarle el asiento."}</p>
        )}
      </section>

      {seated.length > 0 && (
        <section aria-label="Invitados con mesa">
          <h3 className="eyebrow list-label">Con mesa</h3>
          <ul className="guest-list">{seated.map((guest) => row(guest.id))}</ul>
        </section>
      )}

      {visible.length === 0 && (
        <p className="hint pad">{plan.guests.length === 0 ? "Añade la primera persona para empezar." : `Nadie coincide con «${query}».`}</p>
      )}
    </div>
  );
}
