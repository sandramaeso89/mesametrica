import { signed, STEP_REASON } from "@/lib/format";
import type { SeatingPlan } from "@/types";
import type { SolveReport } from "@/state/planReducer";

type Props = { plan: SeatingPlan; report: SolveReport | null };

export function SolverLog({ plan, report }: Props) {
  const name = (id: string) => plan.guests.find((guest) => guest.id === id)?.name ?? "Invitado eliminado";
  const table = (id: string | null) => (id ? plan.tables.find((item) => item.id === id)?.name ?? "—" : "—");

  return (
    <section className="panel-section" aria-labelledby="log-title">
      <div className="panel-title">
        <h2 id="log-title" className="eyebrow">Registro del algoritmo</h2>
        {report && <span className="mono muted">{report.steps.length} pasos · {report.improvements} mejoras</span>}
      </div>
      {report ? (
        <>
          <ol className="log mono">
            {report.steps.map((step, index) => (
              <li key={`${step.guestId}-${index}`} className={step.reason === "forced-conflict" || step.reason === "no-capacity" ? "is-bad" : ""}>
                <span className="log-n">{String(index + 1).padStart(2, "0")}</span>
                <span className="log-text">
                  {name(step.guestId)} <span className="muted">→</span> {table(step.tableId)}
                  <span className="log-why">
                    {STEP_REASON[step.reason]}
                    {step.partners.length > 0 && ` con ${step.partners.map(name).join(", ")}`}
                  </span>
                </span>
                <span className={`log-v ${step.value < 0 ? "neg" : step.value > 0 ? "pos" : ""}`}>{signed(step.value)}</span>
              </li>
            ))}
          </ol>
          <p className="hint">
            Orden: primero quien tiene más relaciones. Cada persona va a la mesa con plaza que más suma, nunca junto a alguien con quien tiene conflicto si existe alternativa.
            {report.improvements > 0 ? ` Después, ${report.improvements} intercambios mejoraron el resultado.` : " La mejora local no encontró intercambios mejores."}
          </p>
        </>
      ) : (
        <p className="hint">Pulsa <kbd>G</kbd> o «Generar propuesta» para ver, paso a paso, por qué cada persona acaba en su mesa.</p>
      )}
    </section>
  );
}
