import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ConflictSummary, FeriadoEstadual, FreeTimeSuggestion, Lancamento, Pessoa } from "../types";
import { formatCurrency, formatDate, formatDateTime, listMonthCalendarCells, listMonthDays, toDateInput, toDateTimeInput } from "../utils/dateUtils";
import { Field, inputClass, primaryButton, secondaryButton, Section } from "../components/ui";
import { findHolidayForDate } from "../utils/holidayUtils";
import { createExtraB5, createHoraAula, createMgExtra, createMgOrdinario } from "../utils/launchFactory";
import type { SubtipoHoraAula, ValoresConfig } from "../types";
import { getHoraAulaSubtipo } from "../utils/launchCompatibility";
import { getConflictSummaries, suggestFreeTimeWindows } from "../utils/conflictUtils";
import { gerarPeriodosImplantaveis, type PeriodoCalendario } from "../utils/calendarDisplayUtils";

function getCalendarDate(item: Lancamento): string {
  if (item.tipo === "HORA_AULA") {
    return item.dataHoraInicio.slice(0, 10);
  }
  return item.dataReferenciaServico;
}

function isWeekendOrHoliday(date: string, feriados: FeriadoEstadual[]): boolean {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 || weekday === 5 || weekday === 6 || Boolean(findHolidayForDate(date, feriados));
}

function isPaidExtraPeriod(period: PeriodoCalendario): boolean {
  const item = period.lancamento;
  if (!period.exibirHoras) return false;
  return ["MG_ORDINARIO", "MG_EXTRA", "EXTRA_ADMINISTRATIVO", "EXTRA_B5"].includes(item.tipo);
}

function getPeriodStyle(period: PeriodoCalendario, feriados: FeriadoEstadual[]): string {
  const item = period.lancamento;
  if (item.possuiConflito) return "bg-red-100 text-red-800 ring-1 ring-red-200";
  if (item.tipo === "HORA_AULA") return "bg-violet-50 text-violet-800 ring-1 ring-violet-200";
  if (item.tipo === "EXTRA_ADMINISTRATIVO" || item.tipo === "EXTRA_B5") return "bg-cyan-50 text-cyan-900 ring-1 ring-cyan-300";
  if (isPaidExtraPeriod(period) && isWeekendOrHoliday(period.data, feriados)) return "bg-orange-50 text-orange-900 ring-1 ring-orange-300";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-300";
}

function getItemLabel(item: Lancamento): string {
  if (item.tipo === "MG_ORDINARIO") return "Prontidao";
  if (item.tipo === "MG_EXTRA") return "Extra";
  if (item.tipo === "EXTRA_ADMINISTRATIVO" || item.tipo === "EXTRA_B5") return "Extra Administrativo";
  if (item.tipo === "HORA_AULA") return "Aula";
  if (item.tipo === "PENDENCIA_ANTERIOR") return "Pendencia";
  return item.tipo;
}

function getWeekdayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(year, month - 1, day));
}

function getClassificationLabel(item: Lancamento): string {
  if (item.tipo === "HORA_AULA") return item.disciplina || item.observacoes || "";
  if (item.categoriaPagamento === "MISTO") return `${item.horasNormais}h normais + ${item.horasMajoradas}h majoradas`;
  if (item.horasMajoradas > 0) return "Hora majorada";
  if (item.horasNormais > 0) return "Hora normal";
  return "";
}

function getConflictTitle(item: Lancamento, items: Lancamento[]): string {
  const detail = item.detalhesConflito?.[0];
  if (!detail) return "";
  const other = items.find((candidate) => candidate.id === detail.idConflitante);
  const otherLabel = other ? getItemLabel(other) : detail.tituloConflitante;
  return `Conflito com: ${otherLabel}. Periodo conflitante: ${formatDateTime(detail.inicioConflito)} ate ${formatDateTime(detail.fimConflito)}. Total: ${detail.horasConflito}h.`;
}

function suggestionLabel(suggestion: FreeTimeSuggestion): string {
  const label = suggestion.categoria === "NORMAL"
    ? `${suggestion.horas}h normais`
    : suggestion.categoria === "MAJORADO"
      ? `${suggestion.horas}h majoradas`
      : `${suggestion.horas}h mistas (${suggestion.horasNormais}h normais + ${suggestion.horasMajoradas}h majoradas)`;
  return `${formatDateTime(suggestion.inicio)} ate ${formatDateTime(suggestion.fim)} - ${label}`;
}

type SuggestionGroup = {
  date: string;
  suggestions: FreeTimeSuggestion[];
  totalHours: number;
  normalHours: number;
  majorHours: number;
  category: "NORMAL" | "MAJORADO" | "MISTO";
};

type SuggestionPlan = {
  id: "normal" | "majorado" | "magisterio";
  title: string;
  suggestions: FreeTimeSuggestion[];
  subtipo?: SubtipoHoraAula;
};

function groupSuggestionsByDay(suggestions: FreeTimeSuggestion[]): SuggestionGroup[] {
  const byDate = new Map<string, SuggestionGroup>();
  for (const suggestion of suggestions) {
    const date = suggestion.inicio.slice(0, 10);
    const group = byDate.get(date) ?? {
      date,
      suggestions: [],
      totalHours: 0,
      normalHours: 0,
      majorHours: 0,
      category: "NORMAL" as const,
    };
    group.suggestions.push(suggestion);
    group.totalHours += suggestion.horas;
    group.normalHours += suggestion.horasNormais;
    group.majorHours += suggestion.horasMajoradas;
    group.category = group.normalHours > 0 && group.majorHours > 0 ? "MISTO" : group.majorHours > 0 ? "MAJORADO" : "NORMAL";
    byDate.set(date, group);
  }
  return Array.from(byDate.values()).map((group) => ({
    ...group,
    totalHours: Number(group.totalHours.toFixed(2)),
    normalHours: Number(group.normalHours.toFixed(2)),
    majorHours: Number(group.majorHours.toFixed(2)),
  }));
}

function categoryText(category: "NORMAL" | "MAJORADO" | "MISTO", normalHours = 0, majorHours = 0): string {
  if (category === "NORMAL") return "normal";
  if (category === "MAJORADO") return "majorado";
  return `misto (${normalHours}h normais + ${majorHours}h majoradas)`;
}

function summaryTitle(summary: ConflictSummary): string {
  const left = summary.tipoLancamento === "HORA_AULA" ? "Hora-aula" : getItemLabel({ tipo: summary.tipoLancamento } as Lancamento);
  const right = summary.tipoConflitante === "HORA_AULA" ? "Hora-aula" : getItemLabel({ tipo: summary.tipoConflitante } as Lancamento);
  return `${left} x ${right}`;
}

function buildUpdatedLaunch(item: Lancamento, date: string, startTime: string, endTime: string, valores: ValoresConfig, feriados: FeriadoEstadual[]): Lancamento {
  let updated: Lancamento;
  const valoresUsados: ValoresConfig = {
    ...valores,
    extraNormalHora: item.valorHoraNormalUsado || item.valorHoraNormal || valores.extraNormalHora,
    extraMajoradoHora: item.valorHoraMajoradaUsado || item.valorHoraMajorada || valores.extraMajoradoHora,
    horaAulaCFSD: valores.horaAulaCFSD,
    horaAulaCFS: valores.horaAulaCFS,
    horaAulaCFO: valores.horaAulaCFO,
  };
  const pessoa = {
    id: item.pessoaId,
    nome: item.nomePessoa,
    graduacao: item.graduacaoUsada,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };

  if (item.tipo === "MG_ORDINARIO") {
    updated = createMgOrdinario(date, valoresUsados, feriados, item.titulo, { pessoa });
  } else if (item.tipo === "MG_EXTRA") {
    updated = createMgExtra(date, valoresUsados, feriados, item.titulo, { pessoa });
  } else if (item.tipo === "EXTRA_ADMINISTRATIVO" || item.tipo === "EXTRA_B5") {
    updated = createExtraB5({
      serviceDate: date,
      valores: valoresUsados,
      feriados,
      pessoa,
    });
  } else {
    updated = createHoraAula({
      inicio: `${date}T${startTime}`,
      fim: `${date}T${endTime}`,
      subtipo: getHoraAulaSubtipo(item),
      disciplina: item.disciplina ?? item.observacoes,
      competenciaImplantacao: item.competenciaImplantacao,
      valores: valoresUsados,
      pessoa,
    });
  }

  return {
    ...updated,
    id: item.id,
    status: item.status,
    titulo: item.titulo,
    observacoes: updated.observacoes || item.observacoes,
    origemPendencia: item.origemPendencia,
    createdAt: item.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export function CalendarMonth({
  competencia,
  items,
  feriados,
  valores,
  activePessoaId,
  onUpdate,
  onAdd,
  activePessoa,
}: {
  competencia: string;
  items: Lancamento[];
  feriados: FeriadoEstadual[];
  valores: ValoresConfig;
  activePessoaId: string;
  onUpdate: (item: Lancamento) => void;
  onAdd: (items: Lancamento[]) => void;
  activePessoa: Pessoa;
}) {
  const days = listMonthDays(competencia);
  const calendarCells = listMonthCalendarCells(competencia);
  const weekdayHeaders = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S\u00e1b"];
  const calendarItems = items.filter((item) => ["MG_ORDINARIO", "MG_EXTRA", "EXTRA_ADMINISTRATIVO", "EXTRA_B5", "HORA_AULA"].includes(item.tipo) && item.pessoaId === activePessoaId && item.status !== "CANCELADO");
  const previousPendencies = items.filter((item) => (
    item.tipo === "PENDENCIA_ANTERIOR"
    && item.pessoaId === activePessoaId
    && item.status !== "CANCELADO"
    && (item.competenciaImplantacao === competencia || item.competenciaServico < competencia)
  ));
  const conflictSummaries = getConflictSummaries(calendarItems.filter((item) => item.competenciaImplantacao === competencia || item.competenciaServico === competencia));
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("00:00");
  const [editEnd, setEditEnd] = useState("15:00");
  const [editSubtipo, setEditSubtipo] = useState<SubtipoHoraAula>("CFS");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [freePlans, setFreePlans] = useState<SuggestionPlan[]>([]);
  const [freeMessage, setFreeMessage] = useState("Clique em calcular para localizar horarios disponiveis.");
  const [desiredNormalHours, setDesiredNormalHours] = useState(0);
  const [desiredMajorHours, setDesiredMajorHours] = useState(0);
  const [desiredClassHours, setDesiredClassHours] = useState(0);
  const [desiredClassType, setDesiredClassType] = useState<SubtipoHoraAula>("CFS");
  const editRef = useRef<HTMLDivElement | null>(null);
  const editDateRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    setEditDate(getCalendarDate(editing));
    setEditStart(editing.dataHoraInicio.slice(11, 16));
    setEditEnd(editing.dataHoraFim.slice(11, 16));
    setEditSubtipo(getHoraAulaSubtipo(editing));
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    window.setTimeout(() => {
      editRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      editDateRef.current?.focus({ preventScroll: true });
    }, 50);
  }, [editing]);

  function saveEditing() {
    if (!editing) return;
    const itemToSave = editing.tipo === "HORA_AULA" ? { ...editing, subtipoHoraAula: editSubtipo, curso: editSubtipo } : editing;
    onUpdate(buildUpdatedLaunch(itemToSave, editDate, editStart, editEnd, valores, feriados));
    setEditing(null);
  }

  function startEditing(item: Lancamento) {
    setEditing(item);
  }

  function renderLaunchButton(period: PeriodoCalendario, compact = false) {
    const item = period.lancamento;
    const hoursText = period.exibirHoras ? ` ${period.horas}h` : "";
    const timeText = period.horarioInicio && period.horarioFim ? ` - ${period.horarioInicio} as ${period.horarioFim}` : "";
    return (
      <button key={period.id} type="button" onClick={() => startEditing(item)} title={period.observacao || getConflictTitle(item, calendarItems)} className={`rounded px-2 py-1 text-left text-xs font-medium ${compact ? "min-h-11 text-sm" : ""} ${getPeriodStyle(period, feriados)}`}>
        <span className="mr-1 font-bold">{period.titulo}{hoursText}</span>
        <span>{timeText}</span>
        {item.possuiConflito && <span className="ml-1 font-bold">Conflito</span>}
      </button>
    );
  }

  function calculateFreeTimes() {
    const [year, month] = competencia.split("-").map(Number);
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 0, 0);
    const plans: SuggestionPlan[] = [];
    const blockers: Lancamento[] = [...calendarItems];
    const addBlockers = (suggestions: FreeTimeSuggestion[]) => {
      blockers.push(...suggestions.map((suggestion) => ({
        id: `sugestao-${suggestion.inicio}-${suggestion.fim}`,
        pessoaId: activePessoaId,
        dataHoraInicio: suggestion.inicio,
        dataHoraFim: suggestion.fim,
        status: "LANCADO",
      } as Lancamento)));
    };

    const normalHours = desiredNormalHours || (!desiredMajorHours && !desiredClassHours ? 12 : 0);
    if (normalHours > 0) {
      const suggestions = suggestFreeTimeWindows({
        dataInicial: toDateTimeInput(start),
        dataFinal: toDateTimeInput(end),
        quantidadeHorasNecessarias: normalHours,
        agendaExistente: blockers,
        feriados,
        pessoaId: activePessoaId,
        limite: 24,
        categoria: "NORMAL",
      });
      plans.push({ id: "normal", title: `Sugestao para implantacao de ${normalHours}h normais`, suggestions });
      addBlockers(suggestions);
    }

    if (desiredMajorHours > 0) {
      const suggestions = suggestFreeTimeWindows({
        dataInicial: toDateTimeInput(start),
        dataFinal: toDateTimeInput(end),
        quantidadeHorasNecessarias: desiredMajorHours,
        agendaExistente: blockers,
        feriados,
        pessoaId: activePessoaId,
        limite: 24,
        categoria: "MAJORADO",
      });
      plans.push({ id: "majorado", title: `Sugestao para implantacao de ${desiredMajorHours}h majoradas`, suggestions });
      addBlockers(suggestions);
    }

    if (desiredClassHours > 0) {
      let suggestions = suggestFreeTimeWindows({
        dataInicial: toDateTimeInput(start),
        dataFinal: toDateTimeInput(end),
        quantidadeHorasNecessarias: desiredClassHours,
        agendaExistente: blockers,
        feriados,
        pessoaId: activePessoaId,
        limite: 24,
        categoria: "NORMAL",
      });
      const foundHours = suggestions.reduce((sum, item) => sum + item.horas, 0);
      if (foundHours < desiredClassHours) {
        const extra = suggestFreeTimeWindows({
          dataInicial: toDateTimeInput(start),
          dataFinal: toDateTimeInput(end),
          quantidadeHorasNecessarias: desiredClassHours - foundHours,
          agendaExistente: [...blockers, ...suggestions.map((suggestion) => ({ id: `mag-${suggestion.inicio}`, pessoaId: activePessoaId, dataHoraInicio: suggestion.inicio, dataHoraFim: suggestion.fim, status: "LANCADO" } as Lancamento))],
          feriados,
          pessoaId: activePessoaId,
          limite: 24,
          categoria: "QUALQUER",
        });
        suggestions = [...suggestions, ...extra];
      }
      plans.push({ id: "magisterio", title: `Sugestao para magisterio ${desiredClassType} (${desiredClassHours}h)`, suggestions, subtipo: desiredClassType });
      addBlockers(suggestions);
    }

    const total = plans.reduce((sum, plan) => sum + plan.suggestions.length, 0);
    setFreePlans(plans);
    setFreeMessage(total ? `${total} sugestao(oes) encontrada(s).` : "Nenhum horario livre encontrado no mes atual ou seguinte.");
  }

  function buildSuggestedLaunch(suggestion: FreeTimeSuggestion, plan: SuggestionPlan): Lancamento {
    if (plan.id === "magisterio") {
      return {
        ...createHoraAula({
          inicio: suggestion.inicio,
          fim: suggestion.fim,
          subtipo: plan.subtipo ?? desiredClassType,
          disciplina: `Implantacao sugerida - magisterio ${plan.subtipo ?? desiredClassType}`,
          competenciaImplantacao: competencia,
          valores,
          pessoa: activePessoa,
        }),
        titulo: `Implantacao sugerida - magisterio ${plan.subtipo ?? desiredClassType}`,
      };
    }

    const isMajor = plan.id === "majorado";
    return {
      ...createExtraB5({
        serviceDate: suggestion.inicio.slice(0, 10),
        valores,
        feriados,
        pessoa: activePessoa,
        inicio: suggestion.inicio,
        fim: suggestion.fim,
        horasNormais: isMajor ? 0 : suggestion.horas,
        horasMajoradas: isMajor ? suggestion.horas : 0,
        horasPagaveis: suggestion.horas,
      }),
      titulo: `Implantacao sugerida - ${isMajor ? "majorada" : "normal"}`,
      observacoes: `Criado a partir dos horarios livres para implantacao.`,
    };
  }

  function addSuggestionToCalendar(plan: SuggestionPlan, suggestion: FreeTimeSuggestion) {
    if (!window.confirm("Deseja adicionar essa sugestao ao calendario?")) return;
    onAdd([buildSuggestedLaunch(suggestion, plan)]);
  }

  function addAllSuggestionsToCalendar() {
    const items = freePlans.flatMap((plan) => plan.suggestions.map((suggestion) => buildSuggestedLaunch(suggestion, plan)));
    if (!items.length) return;
    if (!window.confirm("Deseja adicionar essas sugestoes ao calendario?")) return;
    onAdd(items);
  }

  return (
    <Section title="Calendario mensal">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <button className={`${viewMode === "calendar" ? primaryButton : secondaryButton} flex-1 sm:flex-none`} type="button" onClick={() => setViewMode("calendar")}>Calendario</button>
          <button className={`${viewMode === "list" ? primaryButton : secondaryButton} flex-1 sm:flex-none`} type="button" onClick={() => setViewMode("list")}>Lista</button>
        </div>

        {editing && (
          <div ref={editRef} className="max-h-[90vh] overflow-y-auto rounded-lg border border-slate-300 bg-white p-4 pb-6 shadow-soft scroll-mt-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Editar no calendario</p>
                <p className="text-xs text-slate-500">{editing.titulo}</p>
              </div>
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600" type="button" onClick={() => setEditing(null)} aria-label="Fechar edicao">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={editing.tipo === "HORA_AULA" ? "Dia da aula" : "Dia do servico/prontidao"}>
                <input ref={editDateRef} className={inputClass} type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} />
              </Field>
              <Field label="Inicio">
                <input className={inputClass} type="time" value={editStart} onChange={(event) => setEditStart(event.target.value)} disabled={editing.tipo !== "HORA_AULA"} />
              </Field>
              <Field label="Fim">
                <input className={inputClass} type="time" value={editEnd} onChange={(event) => setEditEnd(event.target.value)} disabled={editing.tipo !== "HORA_AULA"} />
              </Field>
              {editing.tipo === "HORA_AULA" && (
                <Field label="Curso/tipo de aula">
                  <select className={inputClass} value={editSubtipo} onChange={(event) => setEditSubtipo(event.target.value as SubtipoHoraAula)}>
                    <option value="CFSD">CFSD</option>
                    <option value="CFS">CFS</option>
                    <option value="CFO">CFO</option>
                  </select>
                </Field>
              )}
            </div>
            {editing.tipo !== "HORA_AULA" && <p className="mt-3 text-xs text-slate-500">Para servicos 24h, o horario real segue o padrao 18h do dia anterior ate 18h do dia informado.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button className={primaryButton} type="button" onClick={saveEditing}>Salvar alteracao</button>
              <button className={secondaryButton} type="button" onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        )}

        <div className={`${viewMode === "list" ? "grid md:hidden" : "hidden"} gap-3`}>
          {days.map((day) => {
            const key = toDateInput(day);
            const dayPeriods = calendarItems.flatMap((item) => gerarPeriodosImplantaveis(item)).filter((period) => period.data === key);
            const holiday = findHolidayForDate(key, feriados);
            if (dayPeriods.length === 0 && !holiday) return null;
            return (
              <article key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-ink">{formatDate(key)} - {getWeekdayLabel(key)}</p>
                    {holiday && <p className="mt-1 text-xs font-semibold text-amber-700">{holiday.nome}</p>}
                  </div>
                  {holiday && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Feriado</span>}
                </div>
                <div className="mt-3 grid gap-2">
                  {dayPeriods.map((period) => {
                    const item = period.lancamento;
                    return (
                    <div key={period.id} className="grid gap-1 rounded-md bg-white p-2 ring-1 ring-slate-200">
                      {renderLaunchButton(period, true)}
                      {period.observacao && <p className="text-xs text-slate-600">{period.observacao}</p>}
                      {item.possuiConflito && item.detalhesConflito?.[0] && (
                        <p className="text-xs font-semibold text-red-700">Conflito: {item.detalhesConflito[0].inicioConflito.slice(11, 16)} as {item.detalhesConflito[0].fimConflito.slice(11, 16)}</p>
                      )}
                    </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>

        {previousPendencies.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold uppercase tracking-wide text-amber-950">Pendencias anteriores</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {previousPendencies.map((item) => (
                <article key={item.id} className="rounded-md border border-amber-200 bg-white p-3 text-sm text-amber-950">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.titulo}</p>
                      <p className="mt-1 text-xs text-amber-800">Origem: {item.origemPendencia || item.competenciaServico}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold tabular-nums text-amber-900">{item.horasPagaveis}h</span>
                  </div>
                  <p className="mt-2 text-xs text-amber-800">{item.categoriaPagamento.toLowerCase()} - {formatCurrency(item.valorTotal)}</p>
                </article>
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-amber-900">Informacao historica separada: nao entra nas horas, valores previstos ou totais do mes atual.</p>
          </div>
        )}

        <div className={`${viewMode === "calendar" ? "block" : "hidden md:block"} overflow-x-auto`}>
        <div className="grid min-w-[760px] grid-cols-7 gap-2">
          {weekdayHeaders.map((weekday) => (
            <div key={weekday} className="rounded-md bg-ink px-2 py-2 text-center text-xs font-bold uppercase tracking-wide text-white">
              {weekday}
            </div>
          ))}
          {calendarCells.map((cell, index) => {
            if (!cell.date) {
              return <div key={`empty-${index}`} className="min-h-28 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-2" aria-hidden="true" />;
            }
            const key = toDateInput(cell.date);
            const dayPeriods = calendarItems.flatMap((item) => gerarPeriodosImplantaveis(item)).filter((period) => period.data === key);
            const holiday = findHolidayForDate(key, feriados);
            return (
              <div key={key} className="min-h-28 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-600">{formatDate(key)}</p>
                  {holiday && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800" title={holiday.nome}>Feriado</span>}
                </div>
                {holiday && <p className="mt-1 truncate text-[11px] text-amber-700">{holiday.nome}</p>}
                <div className="mt-2 grid gap-1">
                  {dayPeriods.map((period) => renderLaunchButton(period))}
                </div>
              </div>
            );
          })}
        </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold uppercase tracking-wide text-ink">CONFLITOS IDENTIFICADOS</p>
          {conflictSummaries.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Nenhum conflito de horario identificado.</p>
          ) : (
            <div className="mt-3 grid gap-3">
              {conflictSummaries.map((summary, index) => (
                <article key={summary.id} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950">
                  <p className="font-semibold">{index + 1}. {summaryTitle(summary)}</p>
                  <p className="mt-1">Data: {formatDate(summary.inicioConflito.slice(0, 10))}</p>
                  <p>Periodo conflitante: {formatDateTime(summary.inicioConflito)} ate {formatDateTime(summary.fimConflito)}</p>
                  <p>Total em conflito: <strong>{summary.horasConflito}h</strong></p>
                  <div className="mt-3">
                    <p className="font-semibold">Sugestoes de realocacao:</p>
                    {summary.sugestoes.length === 0 ? (
                      <p className="mt-1 text-red-800">Nenhum horario livre encontrado no mes atual ou seguinte.</p>
                    ) : (
                      <ul className="mt-1 grid gap-1 text-red-900">
                        {groupSuggestionsByDay(summary.sugestoes).map((group) => (
                          <li key={`${summary.id}-${group.date}`}>
                            <span className="font-semibold">{formatDate(group.date)}:</span> {group.totalHours}h livres - {categoryText(group.category, group.normalHours, group.majorHours)}
                            <ul className="ml-3 mt-1 grid gap-1">
                              {group.suggestions.map((suggestion) => (
                                <li key={`${summary.id}-${suggestion.inicio}`}>- {suggestion.inicio.slice(11, 16)} as {suggestion.fim.slice(11, 16)} - {suggestion.horas}h</li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-ink">Horarios livres para implantacao</p>
              <p className="mt-1 text-sm text-slate-600">{freeMessage}</p>
            </div>
            <button className={`${primaryButton} w-full sm:w-auto`} type="button" onClick={calculateFreeTimes}>Calcular horarios livres</button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Field label="Horas normais que desejo implantar">
              <input className={inputClass} type="number" min="0" step="0.5" value={desiredNormalHours} onChange={(event) => setDesiredNormalHours(Number(event.target.value))} />
            </Field>
            <Field label="Horas majoradas que desejo implantar">
              <input className={inputClass} type="number" min="0" step="0.5" value={desiredMajorHours} onChange={(event) => setDesiredMajorHours(Number(event.target.value))} />
            </Field>
            <Field label="Horas de magisterio">
              <input className={inputClass} type="number" min="0" step="0.5" value={desiredClassHours} onChange={(event) => setDesiredClassHours(Number(event.target.value))} />
            </Field>
            <Field label="Tipo de magisterio">
              <select className={inputClass} value={desiredClassType} onChange={(event) => setDesiredClassType(event.target.value as SubtipoHoraAula)}>
                <option value="CFSD">CFSD</option>
                <option value="CFS">CFS</option>
                <option value="CFO">CFO</option>
              </select>
            </Field>
          </div>
          {freePlans.length > 0 && (
            <div className="mt-4 grid gap-4">
              <button className={`${secondaryButton} w-full sm:w-fit`} type="button" onClick={addAllSuggestionsToCalendar}>Adicionar todas as sugestoes ao calendario</button>
              {freePlans.map((plan) => (
                <div key={plan.id} className="grid gap-3">
                  <p className="text-sm font-semibold text-ink">{plan.title}</p>
                  {plan.suggestions.length === 0 ? (
                    <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Nenhum horario encontrado para esta categoria.</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {groupSuggestionsByDay(plan.suggestions).map((group) => (
                        <article key={`${plan.id}-${group.date}`} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                          <p className="font-semibold">{formatDate(group.date)} - {getWeekdayLabel(group.date)}</p>
                          <p className="mt-1">{group.totalHours}h disponiveis</p>
                          <div className="mt-2 grid gap-2">
                            {group.suggestions.map((suggestion) => (
                              <div key={`${suggestion.inicio}-${suggestion.fim}`} className="rounded-md bg-white/70 p-2">
                                <p>Das {suggestion.inicio.slice(11, 16)} as {suggestion.fim.slice(11, 16)} - {suggestion.horas}h</p>
                                <p>Tipo: {plan.id === "magisterio" ? `magisterio ${plan.subtipo}` : categoryText(suggestion.categoria, suggestion.horasNormais, suggestion.horasMajoradas)}</p>
                                {plan.id === "magisterio" && <p>Classificacao: {categoryText(suggestion.categoria, suggestion.horasNormais, suggestion.horasMajoradas)}</p>}
                                <button className={`${secondaryButton} mt-2 w-full`} type="button" onClick={() => addSuggestionToCalendar(plan, suggestion)}>Adicionar ao calendario</button>
                              </div>
                            ))}
                          </div>
                          <p className="mt-2">Total do dia: {categoryText(group.category, group.normalHours, group.majorHours)}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
