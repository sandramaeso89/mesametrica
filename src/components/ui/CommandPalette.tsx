"use client";

import { useMemo, useState } from "react";
import { searchable } from "@/lib/format";
import { Dialog } from "./Dialog";

export type Command = { id: string; label: string; hint?: string; section: string; run: () => void };

type Props = { open: boolean; commands: Command[]; onClose: () => void };

export function CommandPalette({ open, commands, onClose }: Props) {
  return (
    <Dialog open={open} title="Buscar o ejecutar" onClose={onClose}>
      {open && <PaletteBody commands={commands} onClose={onClose} />}
    </Dialog>
  );
}

function PaletteBody({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    const words = searchable(query).split(/\s+/).filter(Boolean);
    return commands.filter((command) => {
      const haystack = searchable(`${command.label} ${command.hint ?? ""} ${command.section}`);
      return words.every((word) => haystack.includes(word));
    }).slice(0, 40);
  }, [commands, query]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  return (
    <div className="palette">
      <input
        autoFocus
        className="palette-input"
        value={query}
        placeholder="Generar, nueva mesa, nombre de un invitado…"
        aria-label="Buscar comandos, invitados o mesas"
        aria-controls="palette-list"
        aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            run(results[active]);
          }
        }}
      />
      <ul id="palette-list" className="palette-list" role="listbox" aria-label="Resultados">
        {results.map((command, index) => (
          <li
            key={command.id}
            id={`cmd-${command.id}`}
            role="option"
            aria-selected={index === active}
            className={index === active ? "is-active" : ""}
            onMouseEnter={() => setActive(index)}
            onClick={() => run(command)}
          >
            <span className="palette-section mono">{command.section}</span>
            <span>{command.label}</span>
            {command.hint && <span className="palette-hint mono">{command.hint}</span>}
          </li>
        ))}
        {results.length === 0 && <li className="palette-empty">Sin resultados para «{query}».</li>}
      </ul>
    </div>
  );
}
