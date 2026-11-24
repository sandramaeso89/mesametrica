"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { demoPlan } from "@/data/demo";
import { initials, newId } from "@/lib/format";
import { analyzePlan, scoreAfterMove, scoreAfterSwap } from "@/lib/seating";
import { loadPlan, savePlan, storageMode } from "@/lib/storage";
import { initialState, planReducer, type PlanAction } from "@/state/planReducer";
import { FloorPlan } from "@/components/floor/FloorPlan";
import { GuestForm } from "@/components/forms/GuestForm";
import { TableForm } from "@/components/forms/TableForm";
import { GuestPanel } from "@/components/guests/GuestPanel";
import { ScoreCard } from "@/components/inspector/ScoreCard";
import { SelectionDetails } from "@/components/inspector/SelectionDetails";
import { SolverLog } from "@/components/inspector/SolverLog";
import { CommandPalette, type Command } from "@/components/ui/CommandPalette";
import { Dialog } from "@/components/ui/Dialog";
import { TopBar, type SaveStatus } from "./TopBar";
import type { DragState, DragTarget, FloorHitTest, RelationLayer, Selection } from "./types";

type Tab = "plan" | "guests" | "detail";
type EditorState = { kind: "guest"; id: string | null } | { kind: "table"; id: string | null } | null;

const DRAG_THRESHOLD = 5;
const SAVE_DELAY = 450;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function Workspace() {
  const [state, dispatch] = useReducer(planReducer, demoPlan, initialState);
  const { plan } = state;
  const analysis = useMemo(() => analyzePlan(plan), [plan]);

  const [status, setStatus] = useState<SaveStatus>("loading");
  const [mode] = useState(storageMode);
  const [selection, setSelection] = useState<Selection>(null);
  const [layer, setLayer] = useState<RelationLayer>("all");
  const [tab, setTab] = useState<Tab>("plan");
  const [editor, setEditor] = useState<EditorState>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const hitTestRef = useRef<FloorHitTest | null>(null);
  const saveSequence = useRef(0);

  const notify = useCallback((text: string) => setToast({ id: Date.now(), text }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Carga inicial: Supabase → este navegador → demo.
  useEffect(() => {
    let cancelled = false;
    loadPlan(demoPlan)
      .then((result) => {
        if (cancelled) return;
        dispatch({ type: "load", plan: result.plan });
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Guardado con espera corta; solo cuenta la última petición.
  useEffect(() => {
    if (state.revision === 0) return;
    const sequence = ++saveSequence.current;
    const timer = window.setTimeout(() => {
      setStatus("saving");
      savePlan(state.plan)
        .then(() => {
          if (sequence === saveSequence.current) setStatus("saved");
        })
        .catch(() => {
          if (sequence === saveSequence.current) setStatus("error");
        });
    }, SAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [state.revision, state.plan]);

  // Si lo seleccionado desaparece (deshacer, eliminar), se deselecciona.
  const visibleSelection: Selection = useMemo(() => {
    if (selection?.kind === "guest" && !plan.guests.some((guest) => guest.id === selection.id)) return null;
    if (selection?.kind === "table" && !plan.tables.some((table) => table.id === selection.id)) return null;
    return selection;
  }, [selection, plan]);

  const select = useCallback((next: Selection) => {
    setSelection(next);
    if (next && window.matchMedia("(max-width: 899px)").matches) setTab("detail");
  }, []);

  const run = useCallback((action: PlanAction) => dispatch(action), []);

  const generate = useCallback(() => {
    dispatch({ type: "generate" });
    setSelection(null);
    notify("Propuesta generada");
  }, [notify]);

  const groups = useMemo(() => [...new Set(plan.guests.map((guest) => guest.group))].sort((a, b) => a.localeCompare(b, "es")), [plan.guests]);
  const nextTableName = `Mesa ${plan.tables.length + 1}`;

  // ---------- Arrastrar y soltar (eventos de puntero: ratón, lápiz y dedo) ----------

  const resolveTarget = useCallback((guestId: string, x: number, y: number): DragTarget => {
    const hit = hitTestRef.current?.(x, y) ?? null;
    const from = plan.tables.find((table) => table.guestIds.includes(guestId));
    if (hit) {
      const table = plan.tables.find((item) => item.id === hit.tableId);
      if (!table) return null;
      if (table.id === from?.id) return { kind: "table", tableId: table.id, swapWith: null, allowed: true, score: null };
      if (hit.seatGuestId && table.guestIds.length >= table.capacity) {
        return { kind: "table", tableId: table.id, swapWith: hit.seatGuestId, allowed: true, score: scoreAfterSwap(plan, guestId, hit.seatGuestId) };
      }
      if (table.guestIds.length >= table.capacity) return { kind: "table", tableId: table.id, swapWith: null, allowed: false, score: null };
      return { kind: "table", tableId: table.id, swapWith: null, allowed: true, score: scoreAfterMove(plan, guestId, table.id) };
    }
    const element = document.elementFromPoint(x, y);
    if (from && element?.closest("[data-drop='unseat']")) return { kind: "unseat", score: scoreAfterMove(plan, guestId, null) };
    return null;
  }, [plan]);

  const startDrag = useCallback((guestId: string, event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    setDrag({ guestId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moving: false, target: null });
  }, []);

  useEffect(() => {
    if (!drag) return;

    const onMove = (event: PointerEvent) => {
      setDrag((current) => {
        if (!current) return current;
        const moving = current.moving || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > DRAG_THRESHOLD;
        if (!moving) return current;
        return { ...current, moving, x: event.clientX, y: event.clientY, target: resolveTarget(current.guestId, event.clientX, event.clientY) };
      });
    };

    const onUp = () => {
      const current = drag;
      setDrag(null);
      if (!current.moving) {
        select({ kind: "guest", id: current.guestId });
        return;
      }
      const target = current.target;
      const guest = plan.guests.find((item) => item.id === current.guestId);
      if (!guest || !target) return;
      if (target.kind === "unseat") {
        dispatch({ type: "move", guestId: guest.id, tableId: null });
        notify(`${guest.name} queda sin mesa`);
        return;
      }
      const table = plan.tables.find((item) => item.id === target.tableId);
      if (!table || target.score === null && target.allowed) return;
      if (!target.allowed) {
        notify(`${table.name} está completa. Suelta sobre una persona para intercambiaros.`);
        return;
      }
      if (target.swapWith) {
        const other = plan.guests.find((item) => item.id === target.swapWith);
        dispatch({ type: "swap", guestA: guest.id, guestB: target.swapWith });
        notify(`${guest.name} ⇄ ${other?.name ?? ""}`);
      } else {
        dispatch({ type: "move", guestId: guest.id, tableId: table.id });
        notify(`${guest.name} → ${table.name}`);
      }
      setSelection({ kind: "guest", id: guest.id });
    };

    const onCancel = () => setDrag(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrag(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    document.body.classList.toggle("is-dragging", drag.moving);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("is-dragging");
    };
  }, [drag, plan, resolveTarget, select, notify]);

  // ---------- Atajos de teclado ----------

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("mm-theme", next);
    } catch {
      // Sin almacenamiento: el tema dura lo que la pestaña.
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (isTyping(event.target) || editor || paletteOpen || document.querySelector("dialog[open]")) return;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
        return;
      }
      if (mod || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "g") generate();
      else if (key === "n") setEditor({ kind: "guest", id: null });
      else if (key === "t") setEditor({ kind: "table", id: null });
      else if (key === "escape") setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, paletteOpen, generate]);

  // ---------- Paleta de comandos ----------

  const commands = useMemo<Command[]>(() => [
    { id: "generate", section: "acción", label: "Generar propuesta", hint: "G", run: generate },
    { id: "new-guest", section: "acción", label: "Nuevo invitado", hint: "N", run: () => setEditor({ kind: "guest", id: null }) },
    { id: "new-table", section: "acción", label: "Nueva mesa", hint: "T", run: () => setEditor({ kind: "table", id: null }) },
    { id: "clear", section: "acción", label: "Vaciar todas las mesas", run: () => { dispatch({ type: "clearSeating" }); notify("Mesas vaciadas · ⌘Z para deshacer"); } },
    { id: "undo", section: "acción", label: "Deshacer", hint: "⌘Z", run: () => dispatch({ type: "undo" }) },
    { id: "layer-conflicts", section: "vista", label: "Mostrar solo conflictos", run: () => setLayer("conflicts") },
    { id: "layer-all", section: "vista", label: "Mostrar todas las relaciones", run: () => setLayer("all") },
    { id: "theme", section: "vista", label: "Cambiar tema claro / oscuro", run: toggleTheme },
    ...plan.guests.map((guest) => ({ id: `g-${guest.id}`, section: "invitado", label: guest.name, hint: guest.group, run: () => select({ kind: "guest", id: guest.id }) })),
    ...plan.tables.map((table) => ({ id: `t-${table.id}`, section: "mesa", label: table.name, hint: `${table.guestIds.length}/${table.capacity}`, run: () => select({ kind: "table", id: table.id }) }))
  ], [plan.guests, plan.tables, generate, notify, select, toggleTheme]);

  // ---------- Formularios ----------

  const editingGuest = editor?.kind === "guest" && editor.id ? plan.guests.find((guest) => guest.id === editor.id) : undefined;
  const editingTable = editor?.kind === "table" && editor.id ? plan.tables.find((table) => table.id === editor.id) : undefined;
  const draggedGuest = drag?.moving ? plan.guests.find((guest) => guest.id === drag.guestId) : undefined;

  return (
    <div className="app" data-tab={tab}>
      <a className="skip-link" href="#plano">Saltar al plano</a>
      <TopBar
        eventName={plan.eventName}
        status={status}
        mode={mode}
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        onUndo={() => dispatch({ type: "undo" })}
        onRedo={() => dispatch({ type: "redo" })}
        onOpenPalette={() => setPaletteOpen(true)}
        onToggleTheme={toggleTheme}
      />

      <div className="shell">
        <aside className="pane pane-guests" aria-label="Invitados">
          <GuestPanel
            plan={plan}
            analysis={analysis}
            selection={visibleSelection}
            drag={drag}
            onSelect={select}
            onStartDrag={startDrag}
            onAddGuest={() => setEditor({ kind: "guest", id: null })}
          />
        </aside>

        <main className="pane pane-plan" id="plano" aria-label="Plano de mesas">
          <div className="toolbar">
            <button type="button" className="btn btn-primary" onClick={generate}>
              Generar propuesta <kbd>G</kbd>
            </button>
            <button type="button" className="btn" onClick={() => setEditor({ kind: "table", id: null })}>Nueva mesa</button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                dispatch({ type: "clearSeating" });
                notify("Mesas vaciadas · ⌘Z para deshacer");
              }}
              disabled={analysis.seated === 0}
            >
              Vaciar
            </button>
            <div className="spacer" />
            <div className="segmented" role="radiogroup" aria-label="Relaciones visibles">
              {([["all", "Relaciones"], ["conflicts", "Conflictos"], ["none", "Ninguna"]] as const).map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={layer === value} className={layer === value ? "on" : ""} onClick={() => setLayer(value)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <FloorPlan
            plan={plan}
            analysis={analysis}
            selection={visibleSelection}
            layer={layer}
            drag={drag}
            currentScore={analysis.score}
            hitTestRef={hitTestRef}
            onSelect={select}
            onStartDrag={startDrag}
          />

          <div className="legend" aria-hidden="true">
            <span><i className="legend-line" />afinidad</span>
            <span><i className="legend-line legend-conflict" />conflicto</span>
            <span className="legend-hint">arrastra un asiento a otra mesa · suéltalo sobre alguien para intercambiar</span>
          </div>
        </main>

        <aside className="pane pane-inspector" aria-label="Análisis y detalle">
          <ScoreCard analysis={analysis} previous={state.scoreBefore} onAddTable={() => setEditor({ kind: "table", id: null })} />
          <SelectionDetails
            plan={plan}
            analysis={analysis}
            selection={visibleSelection}
            dispatch={run}
            onSelect={setSelection}
            onEditGuest={(id) => setEditor({ kind: "guest", id })}
            onEditTable={(id) => setEditor({ kind: "table", id })}
            notify={notify}
          />
          <SolverLog plan={plan} report={state.lastSolve} />
        </aside>
      </div>

      <nav className="tabbar" aria-label="Secciones">
        {([["plan", "Plano"], ["guests", "Invitados"], ["detail", "Análisis"]] as const).map(([value, label]) => (
          <button key={value} type="button" className={tab === value ? "on" : ""} aria-current={tab === value ? "page" : undefined} onClick={() => setTab(value)}>
            {label}
            {value === "guests" && analysis.unseated.length > 0 && <span className="tab-badge mono">{analysis.unseated.length}</span>}
          </button>
        ))}
      </nav>

      {draggedGuest && drag && (
        <div className="drag-ghost" style={{ transform: `translate(${drag.x + 14}px, ${drag.y + 14}px)` }} aria-hidden="true">
          <span className="avatar">{initials(draggedGuest.name)}</span>
          {draggedGuest.name}
        </div>
      )}

      <Dialog
        open={editor?.kind === "guest"}
        title={editingGuest ? "Editar invitado" : "Nuevo invitado"}
        onClose={() => setEditor(null)}
      >
        <GuestForm
          key={editingGuest?.id ?? "new"}
          guest={editingGuest}
          groups={groups}
          onCancel={() => setEditor(null)}
          onSubmit={(values) => {
            if (editingGuest) {
              dispatch({ type: "updateGuest", guest: { id: editingGuest.id, ...values } });
              notify("Cambios guardados");
            } else {
              const id = newId();
              dispatch({ type: "addGuest", guest: { id, ...values } });
              setSelection({ kind: "guest", id });
              notify(`${values.name} añadido · sin mesa`);
            }
            setEditor(null);
          }}
        />
      </Dialog>

      <Dialog
        open={editor?.kind === "table"}
        title={editingTable ? "Editar mesa" : "Nueva mesa"}
        onClose={() => setEditor(null)}
      >
        <TableForm
          key={editingTable?.id ?? "new"}
          table={editingTable}
          suggestedName={nextTableName}
          onCancel={() => setEditor(null)}
          onSubmit={(values) => {
            if (editingTable) {
              dispatch({ type: "updateTable", id: editingTable.id, ...values });
              notify("Mesa actualizada");
            } else {
              dispatch({ type: "addTable", id: newId(), ...values });
              notify(`${values.name} creada`);
            }
            setEditor(null);
          }}
        />
      </Dialog>

      <CommandPalette open={paletteOpen} commands={commands} onClose={() => setPaletteOpen(false)} />

      <div className="toast-region" aria-live="polite">
        {toast && <div key={toast.id} className="toast">{toast.text}</div>}
      </div>
    </div>
  );
}
