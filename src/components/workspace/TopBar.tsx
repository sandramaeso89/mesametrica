"use client";

export type SaveStatus = "loading" | "idle" | "saving" | "saved" | "error";

type Props = {
  eventName: string;
  status: SaveStatus;
  mode: "supabase" | "local";
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenPalette: () => void;
  onToggleTheme: () => void;
};

const STATUS_TEXT: Record<SaveStatus, (mode: Props["mode"]) => string> = {
  loading: () => "cargando…",
  idle: (mode) => (mode === "supabase" ? "supabase · sincronizado" : "modo local"),
  saving: () => "guardando…",
  saved: (mode) => (mode === "supabase" ? "supabase · guardado" : "guardado en este navegador"),
  error: () => "sin conexión · guardado local"
};

export function TopBar({ eventName, status, mode, canUndo, canRedo, onUndo, onRedo, onOpenPalette, onToggleTheme }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <circle cx="8" cy="8" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="8" cy="1.8" r="1.3" fill="currentColor" />
            <circle cx="14.2" cy="8" r="1.3" fill="currentColor" />
            <circle cx="8" cy="14.2" r="1.3" fill="currentColor" />
            <circle cx="1.8" cy="8" r="1.3" fill="currentColor" />
          </svg>
        </span>
        <span className="brand-name">mesamétrica</span>
      </div>
      <nav className="crumbs" aria-label="Ubicación">
        <span aria-hidden="true">/</span>
        <span className="muted">Eventos</span>
        <span aria-hidden="true">/</span>
        <span className="crumb-current" aria-current="page">{eventName}</span>
      </nav>
      <div className="spacer" />
      <p className={`status ${status === "error" ? "is-error" : ""} ${status === "saving" || status === "loading" ? "is-busy" : ""}`} role="status" aria-live="polite">
        <span className="status-dot" aria-hidden="true" />
        <span className="mono">{STATUS_TEXT[status](mode)}</span>
      </p>
      <div className="topbar-actions">
        <button type="button" className="icon-btn" onClick={onUndo} disabled={!canUndo} aria-label="Deshacer" title="Deshacer (⌘Z)">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M5.5 3.5 2.5 6.5l3 3M3 6.5h6.5a4 4 0 0 1 0 8H7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="icon-btn" onClick={onRedo} disabled={!canRedo} aria-label="Rehacer" title="Rehacer (⇧⌘Z)">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M10.5 3.5l3 3-3 3M13 6.5H6.5a4 4 0 0 0 0 8H9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="cmdk" onClick={onOpenPalette} aria-label="Buscar o ejecutar (⌘K)">
          <span>Buscar o ejecutar…</span>
          <kbd>⌘K</kbd>
        </button>
        <button type="button" className="icon-btn" onClick={onToggleTheme} aria-label="Cambiar entre tema claro y oscuro" title="Tema">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 2a6 6 0 0 1 0 12Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  );
}
