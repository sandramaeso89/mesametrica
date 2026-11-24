"use client";

import { useState, type FormEvent } from "react";
import { scoreAfterMove } from "@/lib/seating";
import { initials, signed } from "@/lib/format";
import type { GuestRelation, PlanAnalysis, RelationKind, RelationWeight, SeatingPlan } from "@/types";
import type { PlanAction } from "@/state/planReducer";
import type { Selection } from "@/components/workspace/types";

type Props = {
  plan: SeatingPlan;
  analysis: PlanAnalysis;
  selection: Selection;
  dispatch: (action: PlanAction) => void;
  onSelect: (selection: Selection) => void;
  onEditGuest: (id: string) => void;
  onEditTable: (id: string) => void;
  notify: (message: string) => void;
};

export function SelectionDetails(props: Props) {
  const { selection } = props;
  if (selection?.kind === "guest") return <GuestDetails {...props} guestId={selection.id} key={selection.id} />;
  if (selection?.kind === "table") return <TableDetails {...props} tableId={selection.id} key={selection.id} />;
  return (
    <section className="panel-section" aria-labelledby="inspector-title">
      <h2 id="inspector-title" className="eyebrow">Inspector</h2>
      <p className="hint">Selecciona a una persona o una mesa para ver sus relaciones, moverla o editarla.</p>
      <ul className="shortcuts">
        <li><kbd>G</kbd> generar propuesta</li>
        <li><kbd>N</kbd> nuevo invitado · <kbd>T</kbd> nueva mesa</li>
        <li><kbd>⌘</kbd><kbd>Z</kbd> deshacer · <kbd>⌘</kbd><kbd>K</kbd> buscar</li>
      </ul>
    </section>
  );
}

function GuestDetails({ plan, analysis, guestId, dispatch, onSelect, onEditGuest, notify }: Props & { guestId: string }) {
  const guest = plan.guests.find((item) => item.id === guestId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [other, setOther] = useState("");
  const [kind, setKind] = useState<RelationKind>("affinity");
  const [weight, setWeight] = useState<RelationWeight>(2);
  const [relationError, setRelationError] = useState("");

  if (!guest) return null;
  const name = (id: string) => plan.guests.find((item) => item.id === id)?.name ?? "—";
  const currentTable = plan.tables.find((table) => table.guestIds.includes(guest.id));
  const tableOf = (id: string) => plan.tables.find((table) => table.guestIds.includes(id))?.id;
  const relations = plan.relations.filter((relation) => relation.guestA === guest.id || relation.guestB === guest.id);
  const related = new Set(relations.map((relation) => (relation.guestA === guest.id ? relation.guestB : relation.guestA)));
  const candidates = plan.guests.filter((item) => item.id !== guest.id && !related.has(item.id));

  const addRelation = (event: FormEvent) => {
    event.preventDefault();
    if (!other) {
      setRelationError("Elige a la otra persona.");
      return;
    }
    const relation: GuestRelation = { guestA: guest.id, guestB: other, kind, weight };
    dispatch({ type: "addRelation", relation });
    notify(`${kind === "affinity" ? "Afinidad" : "Conflicto"} con ${name(other)} añadido`);
    setOther("");
    setRelationError("");
  };

  return (
    <section className="panel-section" aria-labelledby="guest-title">
      <div className="panel-title">
        <h2 className="eyebrow">Invitado</h2>
        <button type="button" className="link-btn mono" onClick={() => onSelect(null)}>esc</button>
      </div>
      <div className="detail-head">
        <span className={`avatar avatar-lg ${analysis.guestsInConflict.includes(guest.id) ? "is-conflict" : ""}`} aria-hidden="true">{initials(guest.name)}</span>
        <div>
          <h3 id="guest-title" className="detail-name">{guest.name}</h3>
          <p className="detail-meta">{guest.group} · <span className="mono">{currentTable?.name ?? "sin mesa"}</span></p>
        </div>
      </div>
      {guest.needs && <p className="needs"><span className="eyebrow">Nota</span> {guest.needs}</p>}

      <h4 className="eyebrow sub">Relaciones</h4>
      {relations.length > 0 ? (
        <ul className="relations">
          {relations.map((relation) => {
            const otherId = relation.guestA === guest.id ? relation.guestB : relation.guestA;
            const together = currentTable !== undefined && tableOf(otherId) === currentTable.id;
            const bothSeated = currentTable !== undefined && tableOf(otherId) !== undefined;
            const good = relation.kind === "affinity" ? together : bothSeated && !together;
            const status = !bothSeated ? "pendiente" : together ? "misma mesa" : "separados";
            return (
              <li key={otherId} className={`relation ${relation.kind}`}>
                <span className="relation-kind" aria-hidden="true" />
                <span className="relation-text">
                  <span>{name(otherId)}</span>
                  <span className="mono muted">{relation.kind === "affinity" ? "afinidad" : "conflicto"} · peso {relation.weight}</span>
                </span>
                <span className={`mono relation-status ${bothSeated ? (good ? "is-good" : "is-bad") : ""}`}>{status}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Eliminar relación con ${name(otherId)}`}
                  onClick={() => dispatch({ type: "removeRelation", guestA: guest.id, guestB: otherId })}
                >
                  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" /></svg>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="hint">Sin relaciones. Añade afinidades o conflictos para que el algoritmo tenga criterio.</p>
      )}

      {candidates.length > 0 && (
        <form className="relation-form" onSubmit={addRelation} noValidate>
          <label className="field field-inline">
            <span className="sr-only">Otra persona</span>
            <select
              value={other}
              onChange={(event) => {
                setOther(event.target.value);
                setRelationError("");
              }}
              aria-invalid={Boolean(relationError)}
              aria-describedby={relationError ? "relation-error" : undefined}
            >
              <option value="">Relacionar con…</option>
              {candidates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className="segmented" role="radiogroup" aria-label="Tipo de relación">
            {(["affinity", "conflict"] as const).map((value) => (
              <button key={value} type="button" role="radio" aria-checked={kind === value} className={kind === value ? "on" : ""} onClick={() => setKind(value)}>
                {value === "affinity" ? "Afinidad" : "Conflicto"}
              </button>
            ))}
          </div>
          <div className="segmented" role="radiogroup" aria-label="Peso">
            {([1, 2, 3] as const).map((value) => (
              <button key={value} type="button" role="radio" aria-checked={weight === value} className={`mono ${weight === value ? "on" : ""}`} onClick={() => setWeight(value)}>
                {value}
              </button>
            ))}
          </div>
          <button type="submit" className="btn btn-sm">Añadir</button>
          {relationError && <small id="relation-error" className="field-error" role="alert">{relationError}</small>}
        </form>
      )}

      <h4 className="eyebrow sub">Mover a</h4>
      <div className="move-grid">
        {plan.tables.map((table) => {
          const here = table.id === currentTable?.id;
          const full = table.guestIds.length >= table.capacity;
          const score = here || full ? null : scoreAfterMove(plan, guest.id, table.id);
          return (
            <button
              key={table.id}
              type="button"
              className="move-btn"
              disabled={here || full}
              onClick={() => {
                dispatch({ type: "move", guestId: guest.id, tableId: table.id });
                notify(`${guest.name} → ${table.name}`);
              }}
            >
              <span>{table.name}</span>
              <span className="mono muted">
                {table.guestIds.length}/{table.capacity}
                {here ? " · aquí" : full ? " · completa" : score !== null ? ` · ${signed(score - analysis.score)}` : ""}
              </span>
            </button>
          );
        })}
        {currentTable && (
          <button
            type="button"
            className="move-btn move-out"
            onClick={() => {
              dispatch({ type: "move", guestId: guest.id, tableId: null });
              notify(`${guest.name} queda sin mesa`);
            }}
          >
            <span>Quitar de la mesa</span>
            <span className="mono muted">{signed((scoreAfterMove(plan, guest.id, null) ?? analysis.score) - analysis.score)}</span>
          </button>
        )}
      </div>

      <div className="detail-actions">
        <button type="button" className="btn btn-sm" onClick={() => onEditGuest(guest.id)}>Editar</button>
        {confirmDelete ? (
          <span className="confirm" role="group" aria-label="Confirmar eliminación">
            <span>¿Eliminar a {guest.name}?</span>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => {
              dispatch({ type: "removeGuest", guestId: guest.id });
              onSelect(null);
              notify(`${guest.name} eliminado · ⌘Z para deshacer`);
            }}>Eliminar</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(false)}>No</button>
          </span>
        ) : (
          <button type="button" className="btn btn-sm btn-ghost text-bad" onClick={() => setConfirmDelete(true)}>Eliminar</button>
        )}
      </div>
    </section>
  );
}

function TableDetails({ plan, tableId, dispatch, onSelect, onEditTable, notify }: Props & { tableId: string }) {
  const table = plan.tables.find((item) => item.id === tableId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!table) return null;
  const name = (id: string) => plan.guests.find((item) => item.id === id)?.name ?? "—";

  return (
    <section className="panel-section" aria-labelledby="table-title">
      <div className="panel-title">
        <h2 className="eyebrow">Mesa</h2>
        <button type="button" className="link-btn mono" onClick={() => onSelect(null)}>esc</button>
      </div>
      <h3 id="table-title" className="detail-name">{table.name}</h3>
      <p className="detail-meta mono">{table.guestIds.length} de {table.capacity} plazas ocupadas</p>
      {table.guestIds.length > 0 ? (
        <ul className="occupants">
          {table.guestIds.map((id) => (
            <li key={id}>
              <button type="button" className="occupant" onClick={() => onSelect({ kind: "guest", id })}>
                <span className="avatar" aria-hidden="true">{initials(name(id))}</span>
                {name(id)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">Mesa vacía. Arrastra aquí a alguien o genera una propuesta.</p>
      )}
      <div className="detail-actions">
        <button type="button" className="btn btn-sm" onClick={() => onEditTable(table.id)}>Editar nombre y plazas</button>
        {confirmDelete ? (
          <span className="confirm" role="group" aria-label="Confirmar eliminación">
            <span>{table.guestIds.length > 0 ? `${table.guestIds.length} personas quedarán sin mesa.` : "¿Eliminar la mesa?"}</span>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => {
              dispatch({ type: "removeTable", id: table.id });
              onSelect(null);
              notify(`Mesa ${table.name} eliminada · ⌘Z para deshacer`);
            }}>Eliminar</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(false)}>No</button>
          </span>
        ) : (
          <button type="button" className="btn btn-sm btn-ghost text-bad" onClick={() => setConfirmDelete(true)}>Eliminar mesa</button>
        )}
      </div>
    </section>
  );
}
