"use client";

import { useState, type FormEvent } from "react";
import { LIMITS } from "@/lib/validation";
import type { Guest } from "@/types";

type Props = {
  guest?: Guest;
  groups: string[];
  onSubmit: (values: { name: string; group: string; needs?: string }) => void;
  onCancel: () => void;
};

export function GuestForm({ guest, groups, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(guest?.name ?? "");
  const [group, setGroup] = useState(guest?.group ?? "");
  const [needs, setNeeds] = useState(guest?.needs ?? "");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Escribe un nombre.");
      return;
    }
    onSubmit({ name: name.trim(), group: group.trim() || "Sin grupo", needs: needs.trim() || undefined });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span>Nombre</span>
        <input
          autoFocus
          value={name}
          maxLength={LIMITS.name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          placeholder="Lucía Fernández"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "guest-name-error" : undefined}
        />
        {error && <small id="guest-name-error" className="field-error" role="alert">{error}</small>}
      </label>
      <label className="field">
        <span>Grupo</span>
        <input value={group} maxLength={LIMITS.group} onChange={(event) => setGroup(event.target.value)} placeholder="Familia de la novia" list="groups" />
        <datalist id="groups">{groups.map((item) => <option key={item} value={item} />)}</datalist>
      </label>
      <label className="field">
        <span>Necesidades o notas <em>opcional</em></span>
        <input value={needs} maxLength={LIMITS.needs} onChange={(event) => setNeeds(event.target.value)} placeholder="Silla de ruedas, menú sin gluten…" />
      </label>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">{guest ? "Guardar cambios" : "Añadir invitado"}</button>
      </div>
    </form>
  );
}
