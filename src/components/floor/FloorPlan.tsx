"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import { indexRelations, relationBetween } from "@/lib/seating";
import { initials, signed } from "@/lib/format";
import type { Guest, PlanAnalysis, SeatingPlan } from "@/types";
import type { DragState, FloorHitTest, RelationLayer, Selection } from "@/components/workspace/types";
import { dropRadius, layoutTables, SEAT_RADIUS, seatPosition } from "./geometry";

type Props = {
  plan: SeatingPlan;
  analysis: PlanAnalysis;
  selection: Selection;
  layer: RelationLayer;
  drag: DragState | null;
  currentScore: number;
  hitTestRef: MutableRefObject<FloorHitTest | null>;
  onSelect: (selection: Selection) => void;
  onStartDrag: (guestId: string, event: ReactPointerEvent) => void;
};

export function FloorPlan({ plan, analysis, selection, layer, drag, currentScore, hitTestRef, onSelect, onStartDrag }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const guestById = useMemo(() => new Map<string, Guest>(plan.guests.map((guest) => [guest.id, guest])), [plan.guests]);
  const relationIndex = useMemo(() => indexRelations(plan.relations), [plan.relations]);
  const { layouts, height } = useMemo(() => layoutTables(plan.tables, width), [plan.tables, width]);
  const inConflict = useMemo(() => new Set(analysis.guestsInConflict), [analysis.guestsInConflict]);

  const seatOf = useMemo(() => {
    const map = new Map<string, [number, number]>();
    for (const layout of layouts) layout.table.guestIds.forEach((id, seat) => map.set(id, seatPosition(layout, seat)));
    return map;
  }, [layouts]);

  useEffect(() => {
    hitTestRef.current = (clientX, clientY) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
      const layout = layouts.find((item) => Math.hypot(item.x - x, item.y - y) <= dropRadius(item));
      if (!layout) return null;
      let seatGuestId: string | null = null;
      let closest = SEAT_RADIUS + 8;
      layout.table.guestIds.forEach((id, seat) => {
        const [sx, sy] = seatPosition(layout, seat);
        const distance = Math.hypot(sx - x, sy - y);
        if (distance < closest) {
          closest = distance;
          seatGuestId = id;
        }
      });
      return { tableId: layout.table.id, seatGuestId };
    };
    return () => {
      hitTestRef.current = null;
    };
  }, [layouts, hitTestRef]);

  const selectedGuest = selection?.kind === "guest" ? selection.id : null;
  const draggingId = drag?.moving ? drag.guestId : null;
  const target = drag?.moving && drag.target?.kind === "table" ? drag.target : null;

  const lines = layer === "none" ? [] : plan.relations.filter((relation) => {
    if (layer === "conflicts" && relation.kind !== "conflict") return false;
    return seatOf.has(relation.guestA) && seatOf.has(relation.guestB);
  });

  return (
    <div className="floor" ref={wrapRef}>
      <svg
        ref={svgRef}
        className="floor-svg"
        width={width}
        height={height}
        role="group"
        aria-label={`Plano con ${plan.tables.length} mesas`}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onSelect(null);
        }}
      >
        <g aria-hidden="true">
          {lines.map((relation) => {
            const [x1, y1] = seatOf.get(relation.guestA)!;
            const [x2, y2] = seatOf.get(relation.guestB)!;
            const involved = selectedGuest !== null && (relation.guestA === selectedGuest || relation.guestB === selectedGuest);
            const dimmed = selectedGuest !== null && !involved;
            const conflict = relation.kind === "conflict";
            return (
              <line
                key={`${relation.guestA}-${relation.guestB}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={`rel ${conflict ? "rel-conflict" : "rel-affinity"} ${involved ? "is-hot" : ""} ${dimmed ? "is-dim" : ""}`}
                strokeWidth={0.6 + relation.weight * 0.45 + (involved ? 0.8 : 0)}
              />
            );
          })}
        </g>

        {layouts.map((layout) => {
          const { table } = layout;
          const isTarget = target?.tableId === table.id;
          const selected = selection?.kind === "table" && selection.id === table.id;
          const full = table.guestIds.length >= table.capacity;
          const label = !isTarget || !target
            ? null
            : !target.allowed
              ? "mesa completa"
              : target.score === null
                ? "misma mesa"
                : `${target.swapWith ? `intercambiar con ${initials(guestById.get(target.swapWith)?.name ?? "")} · ` : ""}${signed(target.score - currentScore)} pts`;

          return (
            <g key={table.id}>
              {isTarget && (
                <circle cx={layout.x} cy={layout.y} r={dropRadius(layout)} className={`drop-ring ${target?.allowed ? "ok" : "no"}`} />
              )}
              {isTarget && label && (
                <text x={layout.x} y={layout.y - dropRadius(layout) - 10} textAnchor="middle" className={`drop-label ${target?.allowed ? "ok" : "no"}`}>
                  {label}
                </text>
              )}
              <g
                className={`table ${selected ? "is-selected" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`Mesa ${table.name}, ${table.guestIds.length} de ${table.capacity} plazas. Editar mesa`}
                onClick={() => onSelect({ kind: "table", id: table.id })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect({ kind: "table", id: table.id });
                  }
                }}
              >
                <circle cx={layout.x} cy={layout.y} r={layout.radius} className="table-top" />
                <text x={layout.x} y={layout.y - 2} textAnchor="middle" className="table-name">
                  {table.name.length > 14 ? `${table.name.slice(0, 13)}…` : table.name}
                </text>
                <text x={layout.x} y={layout.y + 15} textAnchor="middle" className={`table-count ${full ? "is-full" : ""}`}>
                  {table.guestIds.length}/{table.capacity}
                </text>
              </g>

              {Array.from({ length: table.capacity }, (_, seat) => {
                const [x, y] = seatPosition(layout, seat);
                const guestId = table.guestIds[seat];
                if (!guestId) return <circle key={`empty-${seat}`} cx={x} cy={y} r={SEAT_RADIUS - 2} className="seat-empty" aria-hidden="true" />;
                const guest = guestById.get(guestId);
                if (!guest) return null;
                const isSelected = selectedGuest === guestId;
                const isSwap = target?.swapWith === guestId;
                return (
                  <g
                    key={guestId}
                    className={`seat ${isSelected ? "is-selected" : ""} ${inConflict.has(guestId) ? "is-conflict" : ""} ${draggingId === guestId ? "is-ghost" : ""} ${isSwap ? "is-swap" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${guest.name}, mesa ${table.name}${inConflict.has(guestId) ? ", en conflicto" : ""}`}
                    onPointerDown={(event) => onStartDrag(guestId, event)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect({ kind: "guest", id: guestId });
                      }
                    }}
                  >
                    <title>{`${guest.name} · ${guest.group}`}</title>
                    <circle cx={x} cy={y} r={SEAT_RADIUS} />
                    <text x={x} y={y + 3.5} textAnchor="middle">{initials(guest.name)}</text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {selectedGuest && seatOf.has(selectedGuest) && (
          <g aria-hidden="true" className="partner-marks">
            {plan.relations
              .filter((relation) => relation.guestA === selectedGuest || relation.guestB === selectedGuest)
              .map((relation) => {
                const other = relation.guestA === selectedGuest ? relation.guestB : relation.guestA;
                const point = seatOf.get(other);
                if (!point) return null;
                const kind = relationBetween(relationIndex, selectedGuest, other)?.kind;
                return <circle key={other} cx={point[0]} cy={point[1]} r={SEAT_RADIUS + 4} className={`partner ${kind === "conflict" ? "conflict" : "affinity"}`} />;
              })}
          </g>
        )}
      </svg>

      {plan.tables.length === 0 && (
        <div className="floor-empty">
          <p className="floor-empty-title">Aún no hay mesas</p>
          <p>Añade la primera con «Nueva mesa» o pulsa <kbd>T</kbd>.</p>
        </div>
      )}
    </div>
  );
}
