import { AlertTriangle, CheckCircle2, Clock, DollarSign } from "lucide-react";
import type { AppState, MonthlyTotals } from "../types";
import { formatCurrency, formatDate, getCompetencia } from "../utils/dateUtils";
import { Section, Stat } from "../components/ui";
import { getHoraAulaSubtipo } from "../utils/launchCompatibility";

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
  const aulasDoMes = state.lancamentos
    .filter((item) => item.tipo === "HORA_AULA" && item.status !== "CANCELADO" && item.pessoaId === state.activePessoaId && getCompetencia(item.dataHoraInicio) === state.selectedMonth)
    .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total pagavel" value={formatCurrency(totals.ajudaCusto.valorImplantavel + totals.horaAula.valorTotal)} tone="good" />
        <Stat label="Conflitos" value={`${totals.conflitos.length}`} tone={totals.conflitos.length ? "danger" : "good"} />
        <Stat label="Horas implantadas" value={`${totals.implantadoHoras.total}h`} />
        <Stat label="Diferenca" value={formatCurrency(totals.diferenca.total)} tone={totals.diferenca.total === 0 ? "neutral" : "warn"} />
      </div>

      <Section title="Detalhes do mês">
        <div className="grid gap-3 xl:grid-cols-2">
        <details className="group rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
            <span className="flex items-center justify-between gap-3">Ajuda de custo <span className="text-sm font-normal text-slate-500">{totals.ajudaCusto.horasTotal}h · {formatCurrency(totals.ajudaCusto.valorImplantavel)}</span></span>
          </summary>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Cota mensal" value={`${state.valores.limiteMensalAjudaCusto}h`} />
            <Stat label="Horas lancadas" value={`${totals.ajudaCusto.horasTotal}h`} />
            <Stat label="Horas normais" value={`${totals.ajudaCusto.horasNormais}h`} />
            <Stat label="Horas majoradas" value={`${totals.ajudaCusto.horasMajoradas}h`} />
            <Stat label="Implantaveis" value={`${totals.ajudaCusto.horasImplantaveis}h`} tone="good" />
            <Stat label="Excedentes" value={`${totals.ajudaCusto.horasExcedentes}h`} tone={totals.ajudaCusto.horasExcedentes ? "warn" : "neutral"} />
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3">
            <ValueLine label="Extra normal pagavel" hours={totals.ajudaCusto.horasNormaisImplantaveis} value={totals.ajudaCusto.valorNormalImplantavel} tone="normal" />
            <ValueLine label="Extra majorado pagavel" hours={totals.ajudaCusto.horasMajoradasImplantaveis} value={totals.ajudaCusto.valorMajoradoImplantavel} tone="majorado" />
            <ValueLine label="Soma pagavel ate 288h" hours={totals.ajudaCusto.horasImplantaveis} value={totals.ajudaCusto.valorImplantavel} tone="total" />
            <ValueLine label="Total lancado no mes" hours={totals.ajudaCusto.horasTotal} value={totals.ajudaCusto.valorTotal} tone="normal" />
            <ValueLine label="Excedente fora da cota" hours={totals.ajudaCusto.horasExcedentes} value={totals.ajudaCusto.valorExcedente} tone="majorado" />
          </div>
          <p className="mt-4 flex items-center gap-2 text-lg font-semibold text-ink"><DollarSign size={20} /> Total pagavel ajuda de custo: {formatCurrency(totals.ajudaCusto.valorImplantavel)}</p>
        </details>

        <details className="group rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
            <span className="flex items-center justify-between gap-3">Hora-aula <span className="text-sm font-normal text-slate-500">{totals.horaAula.horasTotal}h · {formatCurrency(totals.horaAula.valorTotal)}</span></span>
          </summary>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Teto mensal" value={`${state.valores.limiteMensalHoraAula}h`} />
            <Stat label="Horas lancadas" value={`${totals.horaAula.horasTotal}h`} tone={totals.horaAula.excedeuTeto ? "danger" : "neutral"} />
            <Stat label="Horas restantes" value={`${totals.horaAula.horasRestantes}h`} />
            <Stat label="Valor previsto" value={formatCurrency(totals.horaAula.valorTotal)} tone="good" />
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3">
            <p className="border-b border-slate-200 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">Lançamentos por aula</p>
            {aulasDoMes.length === 0 ? (
              <p className="py-3 text-sm text-slate-500">Nenhuma hora-aula lançada neste mês.</p>
            ) : aulasDoMes.map((aula) => (
              <div key={aula.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{getHoraAulaSubtipo(aula)}</p>
                  <p className="truncate text-xs text-slate-500">{aula.disciplina || aula.observacoes}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold tabular-nums text-slate-700">{aula.horasAula}h</span>
              </div>
            ))}
          </div>
          {totals.horaAula.excedeuTeto && (
            <p className="mt-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">
              <AlertTriangle size={18} /> Limite mensal de 40h de hora-aula ultrapassado.
            </p>
          )}
        </details>
        </div>
      </Section>

      {(totals.pendencias.length > 0 || totals.conflitos.length > 0 || totals.implantadoHoras.total === 0) && (
        <Section title="Atenção">
          <div className="grid gap-3 lg:grid-cols-3">
            {totals.pendencias.length > 0 && <p className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900"><Clock size={18} /> {totals.pendencias.length} pendência(s) de meses anteriores.</p>}
            {totals.implantadoHoras.total === 0 && <p className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700"><CheckCircle2 size={18} /> Nenhuma hora implantada neste mês.</p>}
            {totals.conflitos.length > 0 && <p className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800"><AlertTriangle size={18} /> {totals.conflitos.length} conflito(s) encontrados.</p>}
          </div>
        </Section>
      )}
    </div>
  );
}
