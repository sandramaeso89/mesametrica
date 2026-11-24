"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

/** Diálogo modal nativo: foco atrapado, Esc para cerrar y fondo inerte gratis. */
export function Dialog({ open, title, description, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="dialog-body">
          <header className="dialog-head">
            <h2 id="dialog-title">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" /></svg>
            </button>
          </header>
          {description && <p className="dialog-desc">{description}</p>}
          {children}
        </div>
      )}
    </dialog>
  );
}
