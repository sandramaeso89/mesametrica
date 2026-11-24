"use client";

import { useState, type FormEvent } from "react";
import { isValidCapacity, LIMITS } from "@/lib/validation";
import type { Table } from "@/types";

type Props = {
  table?: Table;
  suggestedName: string;
  onSubmit: (values: { name: string; capacity: number }) => void;
  onCancel: () => void;
};

export function TableForm({ table, suggestedName, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(table?.name ?? suggestedName);
  const [capacity, setCapacity] = useState(String(table?.capacity ?? 8));
  const [errors, setErrors] = useState<{ name?: string; capacity?: string }>({});
  const seated = table?.guestIds.length ?? 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(capacity);
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Pon un nombre a la mesa.";
    if (!isValidCapacity(value)) next.capacity = `Usa un número entero entre ${LIMITS.capacityMin} y ${LIMITS.capacityMax}.`;
    else if (value < seated) next.capacity = `Hay ${seated} personas sentadas. Muévelas antes de bajar de ${seated} plazas.`;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({ name: name.trim(), capacity: value });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span>Nombre</span>
        <input
          autoFocus
          value={name}
          maxLength={LIMITS.name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "table-name-error" : undefined}
        />
        {errors.name && <small id="table-name-error" className="field-error" role="alert">{errors.name}</small>}
      </label>
      <label className="field">
        <span>Plazas</span>
        <input
          type="number"
          inputMode="numeric"
          min={Math.max(LIMITS.capacityMin, seated)}
          max={LIMITS.capacityMax}
          step={1}
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
          aria-invalid={Boolean(errors.capacity)}
          aria-describedby={errors.capacity ? "table-capacity-error" : undefined}
        />
        {errors.capacity && <small id="table-capacity-error" className="field-error" role="alert">{errors.capacity}</small>}
      </label>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">{table ? "Guardar mesa" : "Crear mesa"}</button>
      </div>
    </form>
  );
}
