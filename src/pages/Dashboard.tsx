import { AlertTriangle, CheckCircle2, Clock, DollarSign } from "lucide-react";
import type { AppState, MonthlyTotals } from "../types";
import { formatCurrency } from "../utils/dateUtils";
import { Section, Stat } from "../components/ui";

function ValueLine({ label, hours, value, tone }: { label: string; hours: number; value: number; tone: "normal" | "majorado" | "total" }) {
  const toneClass = {
    normal: "bg-slate-100 text-slate-700",
    majorado: "bg-zinc-700 text-white",
    total: "bg-moss text-white",
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 py-2 first:border-t-0">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-1 text-xs font-bold tabular-nums ${toneClass[tone === "total" ? "majorado" : tone]}`}>{hours}h</span>
        <span className={`rounded-full px-2 py-1 text-xs font-bold tabular-nums ${toneClass[tone]}`}>{formatCurrency(value)}</span>
      </div>
    </div>
  );
}

export function Dashboard({ state, totals }: { state: AppState; totals: MonthlyTotals }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total previsto" value={formatCurrency(totals.ajudaCusto.valorTotal + totals.horaAula.valorTotal)} tone="good" />
        <Stat label="Conflitos" value={`${totals.conflitos.length}`} tone={totals.conflitos.length ? "danger" : "good"} />
        <Stat label="Implantado" value={formatCurrency(totals.implantado.total)} />
        <Stat label="Diferenca" value={formatCurrency(totals.diferenca.total)} tone={totals.diferenca.total === 0 ? "neutral" : "warn"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Ajuda de custo">
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Cota mensal" value={`${state.valores.limiteMensalAjudaCusto}h`} />
            <Stat label="Horas lancadas" value={`${totals.ajudaCusto.horasTotal}h`} />
            <Stat label="Horas normais" value={`${totals.ajudaCusto.horasNormais}h`} />
            <Stat label="Horas majoradas" value={`${totals.ajudaCusto.horasMajoradas}h`} />
            <Stat label="Implantaveis" value={`${totals.ajudaCusto.horasImplantaveis}h`} tone="good" />
            <Stat label="Excedentes" value={`${totals.ajudaCusto.horasExcedentes}h`} tone={totals.ajudaCusto.horasExcedentes ? "warn" : "neutral"} />
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3">
            <ValueLine label="Extra normal" hours={totals.ajudaCusto.horasNormais} value={totals.ajudaCusto.valorNormal} tone="normal" />
            <ValueLine label="Extra majorado/especial" hours={totals.ajudaCusto.horasMajoradas} value={totals.ajudaCusto.valorMajorado} tone="majorado" />
            <ValueLine label="Soma dos extras" hours={totals.ajudaCusto.horasTotal} value={totals.ajudaCusto.valorTotal} tone="total" />
          </div>
          <p className="mt-4 flex items-center gap-2 text-lg font-semibold text-ink"><DollarSign size={20} /> Total ajuda de custo: {formatCurrency(totals.ajudaCusto.valorTotal)}</p>
        </Section>

        <Section title="Hora-aula">
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Teto mensal" value={`${state.valores.limiteMensalHoraAula}h`} />
            <Stat label="Horas lancadas" value={`${totals.horaAula.horasTotal}h`} tone={totals.horaAula.excedeuTeto ? "danger" : "neutral"} />
            <Stat label="Horas restantes" value={`${totals.horaAula.horasRestantes}h`} />
            <Stat label="Valor previsto" value={formatCurrency(totals.horaAula.valorTotal)} tone="good" />
          </div>
          {totals.horaAula.excedeuTeto && (
            <p className="mt-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">
              <AlertTriangle size={18} /> Limite mensal de 40h de hora-aula ultrapassado.
            </p>
          )}
        </Section>
      </div>

      <Section title="Alertas do mes">
        <div className="grid gap-3 lg:grid-cols-3">
          <p className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700"><Clock size={18} /> {totals.pendencias.length} pendencia(s) de meses anteriores.</p>
          <p className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700"><CheckCircle2 size={18} /> Contracheque: {totals.implantado.total ? "com valores lancados" : "pendente"}.</p>
          <p className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700"><AlertTriangle size={18} /> {totals.conflitos.length} conflito(s) encontrados.</p>
        </div>
      </Section>
    </div>
  );
}
