import { signed } from "@/lib/format";
import type { PlanAnalysis } from "@/types";

type Props = { analysis: PlanAnalysis; previous: number | null; onAddTable: () => void };

export function ScoreCard({ analysis, previous, onAddTable }: Props) {
  const delta = previous === null ? 0 : analysis.score - previous;
  const nobodySeated = analysis.seated === 0;
  const verdict = nobodySeated
    ? "Sin distribución"
    : analysis.missingSeats > 0
      ? "Faltan plazas"
      : analysis.conflicts > 0
        ? "Hay conflictos en mesa"
        : analysis.unseated.length > 0
          ? "Falta gente por sentar"
          : analysis.score >= 85 ? "Distribución sólida" : "Mejorable";

  return (
    <section className="panel-section" aria-labelledby="score-title">
      <div className="panel-title">
        <h2 id="score-title" className="eyebrow">Puntuación</h2>
        <span className="mono muted">determinista</span>
      </div>
      <div className="score">
        <output className="score-value mono" aria-live="polite" aria-label={`Puntuación ${analysis.score} de 100`}>{analysis.score}</output>
        <span className="score-max mono">/100</span>
        {delta !== 0 && <span className={`score-delta mono ${delta > 0 ? "up" : "down"}`}>{signed(delta)}</span>}
      </div>
      <p className="score-verdict">{verdict}</p>
      <div className="meter" aria-hidden="true">
        {Array.from({ length: 40 }, (_, index) => <span key={index} className={index < Math.round(analysis.score / 2.5) ? "on" : ""} />)}
      </div>

      <dl className="stats">
        <dt>Sentados</dt>
        <dd className="mono">{analysis.seated}/{analysis.seated + analysis.unseated.length}</dd>
        <dt>Afinidades cumplidas</dt>
        <dd className="mono">{analysis.affinities}/{analysis.affinitiesTotal}</dd>
        <dt>Conflictos en mesa</dt>
        <dd className={`mono ${analysis.conflicts ? "text-bad" : ""}`}>{analysis.conflicts}/{analysis.conflictsTotal}</dd>
        <dt>Plazas libres</dt>
        <dd className="mono">{analysis.freeSeats}</dd>
      </dl>

      {analysis.missingSeats > 0 && (
        <div className="notice notice-bad" role="status">
          <p><strong>Faltan {analysis.missingSeats} plazas.</strong> Ninguna distribución puede sentar a todo el mundo: añade mesas o amplía su capacidad.</p>
          <button type="button" className="btn btn-sm" onClick={onAddTable}>Nueva mesa</button>
        </div>
      )}
      {analysis.missingSeats === 0 && analysis.unseated.length > 0 && !nobodySeated && (
        <div className="notice" role="status">
          <p>
            {analysis.unseated.length === 1
              ? "Una persona sigue sin mesa. Arrástrala desde la lista o vuelve a generar."
              : `${analysis.unseated.length} personas siguen sin mesa. Arrástralas desde la lista o vuelve a generar.`}
          </p>
        </div>
      )}

      <details className="explain">
        <summary>Cómo se calcula</summary>
        <p>Cada afinidad cumplida y cada conflicto separado suman <span className="mono">3 × peso</span>; cada conflicto en la misma mesa resta <span className="mono">7 × peso</span>. El resultado se normaliza a 0–100 y se multiplica por la proporción de invitados sentados, para que un plan que deja gente fuera nunca parezca bueno.</p>
      </details>
    </section>
  );
}
