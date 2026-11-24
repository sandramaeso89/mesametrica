"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CirclePlus, LayoutGrid, Pencil, RefreshCcw, Sparkles, Trash2, Users } from "lucide-react";
import { demoPlan } from "@/data/demo";
import { analyzePlan, generateSeatingPlan, moveGuest } from "@/lib/seating";
import { loadPlan, savePlan } from "@/lib/storage";
import type { Guest, SeatingPlan } from "@/types";

type View = "plan" | "guests";

export function SeatingWorkspace() {
  const [plan, setPlan] = useState<SeatingPlan>(demoPlan);
  const [view, setView] = useState<View>("plan");
  const [dragged, setDragged] = useState<string | null>(null);
  const [saved, setSaved] = useState("Demo lista");
  const [isGenerating, setIsGenerating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newNeeds, setNewNeeds] = useState("");
  const [relationA, setRelationA] = useState("");
  const [relationB, setRelationB] = useState("");
  const [relationKind, setRelationKind] = useState<"affinity" | "conflict">("affinity");
  const [feedback, setFeedback] = useState("");
  const analysis = useMemo(() => analyzePlan(plan), [plan]);
  const guestById = useMemo(() => new Map(plan.guests.map((guest) => [guest.id, guest])), [plan.guests]);

  useEffect(() => { loadPlan(demoPlan).then(setPlan).catch(() => setSaved("Modo demo local")); }, []);

  const persist = async (next: SeatingPlan) => {
    setPlan(next);
    setSaved("Guardando…");
    try {
      const result = await savePlan(next);
      setSaved(result.mode === "supabase" ? "Guardado en Supabase" : "Guardado en este navegador");
    } catch { setSaved("Guardado local; Supabase no disponible"); }
  };

  const generate = () => {
    setIsGenerating(true);
    window.setTimeout(() => { void persist(generateSeatingPlan(plan)); setIsGenerating(false); }, 420);
  };

  const addGuest = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;
    const guest: Guest = { id: crypto.randomUUID(), name: newName.trim(), group: newGroup.trim() || "Sin grupo", needs: newNeeds.trim() || undefined };
    void persist({ ...plan, guests: [...plan.guests, guest], updatedAt: new Date().toISOString() });
    setNewName(""); setNewGroup(""); setNewNeeds("");
  };

  const editGuest = (guest: Guest) => {
    const name = window.prompt("Nombre del invitado", guest.name)?.trim();
    if (!name) return;
    const group = window.prompt("Grupo", guest.group)?.trim() || "Sin grupo";
    const needs = window.prompt("Necesidades o notas", guest.needs ?? "")?.trim() || undefined;
    void persist({ ...plan, guests: plan.guests.map((item) => item.id === guest.id ? { ...item, name, group, needs } : item) });
  };

  const deleteGuest = (guestId: string) => {
    void persist({
      ...plan,
      guests: plan.guests.filter((guest) => guest.id !== guestId),
      relations: plan.relations.filter((relation) => relation.guestA !== guestId && relation.guestB !== guestId),
      tables: plan.tables.map((table) => ({ ...table, guestIds: table.guestIds.filter((id) => id !== guestId) }))
    });
  };

  const addRelation = (event: React.FormEvent) => {
    event.preventDefault();
    if (!relationA || !relationB || relationA === relationB) {
      setFeedback("Selecciona dos personas diferentes para crear la relación.");
      return;
    }
    const duplicate = plan.relations.some((relation) => new Set([relation.guestA, relation.guestB]).has(relationA) && new Set([relation.guestA, relation.guestB]).has(relationB));
    if (duplicate) {
      setFeedback("Estas dos personas ya tienen una relación registrada.");
      return;
    }
    void persist({ ...plan, relations: [...plan.relations, { guestA: relationA, guestB: relationB, kind: relationKind, weight: 2 }] });
    setFeedback("Relación añadida correctamente.");
    setRelationA(""); setRelationB("");
  };

  const addTable = () => {
    const count = plan.tables.length + 1;
    void persist({ ...plan, tables: [...plan.tables, { id: crypto.randomUUID(), name: `Mesa ${count}`, capacity: 6, guestIds: [] }] });
  };

  const editTable = (tableId: string) => {
    const table = plan.tables.find((item) => item.id === tableId);
    if (!table) return;
    const name = window.prompt("Nombre de la mesa", table.name)?.trim();
    if (!name) return;
    const capacity = Number(window.prompt("Capacidad", String(table.capacity)));
    if (!Number.isInteger(capacity) || capacity < 1 || capacity < table.guestIds.length) return;
    void persist({ ...plan, tables: plan.tables.map((item) => item.id === tableId ? { ...item, name, capacity } : item) });
  };

  const move = (tableId: string) => {
    if (!dragged) return;
    moveToTable(dragged, tableId);
    setDragged(null);
  };

  const moveToTable = (guestId: string, tableId: string) => {
    const next = moveGuest(plan, guestId, tableId);
    if (next === plan) {
      setFeedback("No se puede mover: la mesa seleccionada está completa.");
      return;
    }
    setFeedback("Invitado movido correctamente.");
    void persist(next);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="MesaMétrica, inicio"><span>MM</span><b>MesaMétrica</b></a>
        <div className="event-title"><small>EVENTO ACTIVO</small><strong>{plan.eventName}</strong></div>
        <div className="save-state"><Check size={14} /> {saved}</div>
        <button className="avatar" aria-label="Perfil de demostración">SM</button>
      </header>

      <div className="app-shell" id="top">
        <aside className="sidebar">
          <p className="eyebrow">ESPACIO DE TRABAJO</p>
          <button className={view === "plan" ? "active" : ""} onClick={() => setView("plan")}><LayoutGrid size={18}/> Plano de mesas</button>
          <button className={view === "guests" ? "active" : ""} onClick={() => setView("guests")}><Users size={18}/> Invitados <span>{plan.guests.length}</span></button>
          <div className="sidebar-note"><Sparkles size={18}/><b>¿Cómo decide?</b><p>MesaMétrica prioriza afinidades fuertes, evita conflictos y equilibra la ocupación.</p></div>
        </aside>

        <section className="workspace">
          {feedback && <div className="feedback" role="status"><span>{feedback}</span><button onClick={() => setFeedback("")} aria-label="Cerrar mensaje">×</button></div>}
          {view === "plan" ? (
            <>
              <div className="page-heading">
                <div><p className="eyebrow">DISTRIBUCIÓN ACTUAL</p><h1>Un sitio pensado para cada persona.</h1><p>Genera una propuesta y ajústala arrastrando invitados entre las mesas.</p></div>
                <div className="heading-actions"><button className="secondary" onClick={addTable}><CirclePlus size={17}/>Nueva mesa</button><button className="primary" onClick={generate} disabled={isGenerating}><RefreshCcw size={17} className={isGenerating ? "spin" : ""}/>{isGenerating ? "Calculando…" : "Generar propuesta"}</button></div>
              </div>

              <div className="metrics">
                <article className="score-card"><div className="score-ring" style={{"--score": `${analysis.score * 3.6}deg`} as React.CSSProperties}><span>{analysis.score}</span><small>/100</small></div><div><small>CALIDAD DEL PLANO</small><b>{analysis.score >= 85 ? "Excelente equilibrio" : "Puedes mejorarlo"}</b><p>Basada en afinidades, conflictos y capacidad.</p></div></article>
                <article><Users/><div><small>INVITADOS</small><b>{plan.guests.length - analysis.unseated.length} de {plan.guests.length}</b><p>{analysis.unseated.length ? `${analysis.unseated.length} sin mesa` : "Todos tienen mesa"}</p></div></article>
                <article className={analysis.conflicts ? "warning" : ""}>{analysis.conflicts ? <AlertTriangle/> : <Check/>}<div><small>CONFLICTOS</small><b>{analysis.conflicts}</b><p>{analysis.conflicts ? "Requieren revisión" : "Sin coincidencias"}</p></div></article>
              </div>

              <div className="tables-grid">
                {plan.tables.map((table) => (
                  <article className="table-card" key={table.id} onDragOver={(e) => e.preventDefault()} onDrop={() => move(table.id)}>
                    <div className="table-head"><div><small>MESA</small><h2>{table.name}</h2></div><div className="table-tools"><button onClick={() => editTable(table.id)} aria-label={`Editar ${table.name}`}><Pencil size={14}/></button><span>{table.guestIds.length}/{table.capacity}</span></div></div>
                    <div className="seat-list">
                      {table.guestIds.map((id) => {
                        const guest = guestById.get(id)!;
                        const issue = analysis.explanations[id]?.some((text) => text.startsWith("Revisar"));
                        return <div className="guest-chip" draggable onDragStart={() => setDragged(id)} key={id}><span>{guest.name.split(" ").map((p) => p[0]).join("").slice(0,2)}</span><div><b>{guest.name}</b><small>{guest.group}</small></div>{issue && <AlertTriangle size={15}/>}<label className="move-control"><span>Mover</span><select aria-label={`Mover a ${guest.name} a otra mesa`} value={table.id} onChange={(event) => moveToTable(id, event.target.value)}>{plan.tables.map((target) => <option value={target.id} key={target.id}>{target.name}</option>)}</select></label></div>;
                      })}
                      {Array.from({length: Math.max(0, table.capacity - table.guestIds.length)}).map((_, index) => <div className="empty-seat" key={index}>Suelta aquí un invitado</div>)}
                    </div>
                    <div className="table-insight"><Sparkles size={15}/><span>{table.guestIds.length ? analysis.explanations[table.guestIds[0]]?.[0] : "Mesa disponible para nuevas asignaciones."}</span></div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="page-heading"><div><p className="eyebrow">LISTA DE INVITADOS</p><h1>Personas y relaciones.</h1><p>Los grupos ayudan al algoritmo a entender el contexto del evento.</p></div></div>
              <form className="add-guest" onSubmit={addGuest}><label>Nombre<input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre y apellidos" required/></label><label>Grupo<input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="Familia, trabajo…"/></label><label>Necesidades o notas<input value={newNeeds} onChange={(e) => setNewNeeds(e.target.value)} placeholder="Opcional"/></label><button className="primary"><CirclePlus size={17}/>Añadir invitado</button></form>
              <form className="add-relation" onSubmit={addRelation}><div><p className="eyebrow">NUEVA RELACIÓN</p><b>Ayuda al algoritmo</b></div><label>Primera persona<select value={relationA} onChange={(e) => setRelationA(e.target.value)} required><option value="">Selecciona</option>{plan.guests.map((guest) => <option value={guest.id} key={guest.id}>{guest.name}</option>)}</select></label><label>Segunda persona<select value={relationB} onChange={(e) => setRelationB(e.target.value)} required><option value="">Selecciona</option>{plan.guests.filter((guest) => guest.id !== relationA).map((guest) => <option value={guest.id} key={guest.id}>{guest.name}</option>)}</select></label><label>Tipo<select value={relationKind} onChange={(e) => setRelationKind(e.target.value as "affinity" | "conflict")}><option value="affinity">Afinidad</option><option value="conflict">Conflicto</option></select></label><button className="secondary">Añadir</button></form>
              <div className="guest-table"><div className="guest-row header"><span>Invitado</span><span>Grupo</span><span>Necesidades</span><span>Relaciones y acciones</span></div>{plan.guests.map((guest) => <div className="guest-row" key={guest.id}><span><i>{guest.name.split(" ").map((p) => p[0]).join("").slice(0,2)}</i><b>{guest.name}</b></span><span>{guest.group}</span><span>{guest.needs ?? "—"}</span><span className="row-actions"><b>{plan.relations.filter((r) => r.guestA === guest.id || r.guestB === guest.id).length}</b><button aria-label={`Editar a ${guest.name}`} onClick={() => editGuest(guest)}><Pencil size={15}/></button><button aria-label={`Eliminar a ${guest.name}`} onClick={() => deleteGuest(guest.id)}><Trash2 size={15}/></button></span></div>)}</div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
