import { AlertTriangle, CheckCircle2, Clock, DollarSign } from "lucide-react";
import type { AppState, MonthlyTotals } from "../types";
import { formatCurrency } from "../utils/dateUtils";
import { Section, Stat } from "../components/ui";
import { getCompetencia } from "../utils/dateUtils";

type OriginTotals = { normal: number; major: number; value: number };

function sumOrigin(items: AppState["lancamentos"]): OriginTotals {
  return items.reduce((sum, item) => ({
    normal: sum.normal + item.horasNormais,
    major: sum.major + item.horasMajoradas,
    value: sum.value + item.horasNormais * (item.valorHoraNormalUsado ?? item.valorHoraNormal)
      + item.horasMajoradas * (item.valorHoraMajoradaUsado ?? item.valorHoraMajorada),
  }), { normal: 0, major: 0, value: 0 });
}

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
  const ajudaCustoItems = state.lancamentos.filter((item) => {
    if (item.status === "CANCELADO" || (state.activePessoaId && item.pessoaId !== state.activePessoaId)) return false;
    if (!(["MG_ORDINARIO", "MG_EXTRA", "EXTRA_ADMINISTRATIVO", "EXTRA_B5"] as string[]).includes(item.tipo)) return false;
    const competenciaPagavel = item.tipo === "MG_ORDINARIO"
      ? getCompetencia(item.dataHoraInicio)
      : getCompetencia(`${item.dataReferenciaServico}T00:00`);
    return competenciaPagavel === state.selectedMonth;
  });
  const ordinario = sumOrigin(ajudaCustoItems.filter((item) => item.tipo === "MG_ORDINARIO"));
  const extras = sumOrigin(ajudaCustoItems.filter((item) => item.tipo !== "MG_ORDINARIO"));

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total pagavel" value={formatCurrency(totals.ajudaCusto.valorImplantavel + totals.horaAula.valorTotal)} tone="good" />
        <Stat label="Conflitos" value={`${totals.conflitos.length}`} tone={totals.conflitos.length ? "danger" : "good"} />
        <Stat label="Horas implantadas" value={`${totals.implantadoHoras.total}h`} />
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
            <ValueLine label="Extra normal pagavel" hours={totals.ajudaCusto.horasNormaisImplantaveis} value={totals.ajudaCusto.valorNormalImplantavel} tone="normal" />
            <ValueLine label="Extra majorado pagavel" hours={totals.ajudaCusto.horasMajoradasImplantaveis} value={totals.ajudaCusto.valorMajoradoImplantavel} tone="majorado" />
            <ValueLine label="Soma pagavel ate 288h" hours={totals.ajudaCusto.horasImplantaveis} value={totals.ajudaCusto.valorImplantavel} tone="total" />
            <ValueLine label="Total lancado no mes" hours={totals.ajudaCusto.horasTotal} value={totals.ajudaCusto.valorTotal} tone="normal" />
            <ValueLine label="Excedente fora da cota" hours={totals.ajudaCusto.horasExcedentes} value={totals.ajudaCusto.valorExcedente} tone="majorado" />
          </div>
          <p className="mt-4 flex items-center gap-2 text-lg font-semibold text-ink"><DollarSign size={20} /> Total pagavel ajuda de custo: {formatCurrency(totals.ajudaCusto.valorImplantavel)}</p>
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

      <Section title="Ajuda de custo por origem">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: "Serviço ordinário", detail: "Lançamentos MG Ordinário", value: ordinario },
            { title: "Extras lançados", detail: "MG Extra e extras administrativos", value: extras },
          ].map((group) => {
            const totalHours = group.value.normal + group.value.major;
            return (
              <article key={group.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3">
                  <h3 className="font-bold text-ink">{group.title}</h3>
                  <p className="text-sm text-slate-600">{group.detail}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Stat label="Horas normais" value={`${group.value.normal}h`} />
                  <Stat label="Horas majoradas" value={`${group.value.major}h`} />
                  <Stat label="Total de horas" value={`${totalHours}h`} />
                  <Stat label="Valor total" value={formatCurrency(group.value.value)} tone="good" />
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-600">Este detalhamento divide os lançamentos que já compõem o total de ajuda de custo acima.</p>
      </Section>

      <Section title="Alertas do mes">
        <div className="grid gap-3 lg:grid-cols-3">
          <p className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700"><Clock size={18} /> {totals.pendencias.length} pendencia(s) de meses anteriores.</p>
          <p className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700"><CheckCircle2 size={18} /> Horas implantadas: {totals.implantadoHoras.total ? `${totals.implantadoHoras.total}h registradas` : "pendente"}.</p>
          <p className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700"><AlertTriangle size={18} /> {totals.conflitos.length} conflito(s) encontrados.</p>
        </div>
      </Section>
    </div>
  );
}
