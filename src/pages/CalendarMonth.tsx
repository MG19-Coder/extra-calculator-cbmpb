import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ConflictSummary, FeriadoEstadual, FreeTimeSuggestion, Lancamento } from "../types";
import { formatDate, formatDateTime, listMonthDays, toDateInput, toDateTimeInput } from "../utils/dateUtils";
import { Field, inputClass, primaryButton, secondaryButton, Section } from "../components/ui";
import { findHolidayForDate } from "../utils/holidayUtils";
import { createExtraB5, createHoraAula, createMgExtra, createMgOrdinario } from "../utils/launchFactory";
import type { SubtipoHoraAula, ValoresConfig } from "../types";
import { getHoraAulaSubtipo } from "../utils/launchCompatibility";
import { getConflictSummaries, suggestFreeTimeWindows } from "../utils/conflictUtils";

function getCalendarDate(item: Lancamento): string {
  if (item.tipo === "HORA_AULA") {
    return item.dataHoraInicio.slice(0, 10);
  }
  return item.dataReferenciaServico;
}

function getItemStyle(item: Lancamento): string {
  if (item.possuiConflito) return "bg-red-100 text-red-800 ring-1 ring-red-200";
  if (item.tipo === "MG_ORDINARIO") return "bg-white text-slate-700 ring-1 ring-slate-200";
  if (item.tipo === "MG_EXTRA") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
  if (item.tipo === "EXTRA_ADMINISTRATIVO" || item.tipo === "EXTRA_B5") return "bg-sky-50 text-sky-800 ring-1 ring-sky-200";
  if (item.tipo === "HORA_AULA") return "bg-violet-50 text-violet-800 ring-1 ring-violet-200";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

function getItemLabel(item: Lancamento): string {
  if (item.tipo === "MG_ORDINARIO") return "Prontidao";
  if (item.tipo === "MG_EXTRA") return "Extra";
  if (item.tipo === "EXTRA_ADMINISTRATIVO" || item.tipo === "EXTRA_B5") return "Extra Administrativo";
  if (item.tipo === "HORA_AULA") return "Aula";
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
}: {
  competencia: string;
  items: Lancamento[];
  feriados: FeriadoEstadual[];
  valores: ValoresConfig;
  activePessoaId: string;
  onUpdate: (item: Lancamento) => void;
}) {
  const days = listMonthDays(competencia);
  const calendarItems = items.filter((item) => ["MG_ORDINARIO", "MG_EXTRA", "EXTRA_ADMINISTRATIVO", "EXTRA_B5", "HORA_AULA"].includes(item.tipo) && item.pessoaId === activePessoaId);
  const conflictSummaries = getConflictSummaries(calendarItems.filter((item) => item.competenciaImplantacao === competencia || item.competenciaServico === competencia));
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("00:00");
  const [editEnd, setEditEnd] = useState("15:00");
  const [editSubtipo, setEditSubtipo] = useState<SubtipoHoraAula>("CFS");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [freeSuggestions, setFreeSuggestions] = useState<FreeTimeSuggestion[]>([]);
  const [freeMessage, setFreeMessage] = useState("Clique em calcular para localizar horarios disponiveis.");
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

  function renderLaunchButton(item: Lancamento, compact = false) {
    return (
      <button key={item.id} type="button" onClick={() => startEditing(item)} title={getConflictTitle(item, calendarItems)} className={`rounded px-2 py-1 text-left text-xs font-medium ${compact ? "min-h-11 text-sm" : ""} ${getItemStyle(item)}`}>
        <span className="mr-1 font-bold">{getItemLabel(item)}:</span>
        {item.tipo === "HORA_AULA" ? `${item.horasAula}h ${getHoraAulaSubtipo(item)}` : `${item.horasPagaveis}h`}
        {item.possuiConflito && <span className="ml-1 font-bold">Conflito</span>}
      </button>
    );
  }

  function calculateFreeTimes() {
    const [year, month] = competencia.split("-").map(Number);
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 0, 0);
    const neededHours = Math.max(5, Math.min(12, conflictSummaries.reduce((sum, item) => sum + item.horasConflito, 0) || 12));
    const suggestions = suggestFreeTimeWindows({
      dataInicial: toDateTimeInput(start),
      dataFinal: toDateTimeInput(end),
      quantidadeHorasNecessarias: neededHours,
      agendaExistente: calendarItems,
      feriados,
      pessoaId: activePessoaId,
      limite: 8,
    });
    setFreeSuggestions(suggestions);
    setFreeMessage(suggestions.length ? `${suggestions.length} horario(s) livre(s) encontrado(s).` : "Nenhum horario livre encontrado no mes atual ou seguinte.");
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
            const dayItems = calendarItems.filter((item) => getCalendarDate(item) === key);
            const holiday = findHolidayForDate(key, feriados);
            if (dayItems.length === 0 && !holiday) return null;
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
                  {dayItems.map((item) => (
                    <div key={item.id} className="grid gap-1 rounded-md bg-white p-2 ring-1 ring-slate-200">
                      {renderLaunchButton(item, true)}
                      {getClassificationLabel(item) && <p className="text-xs text-slate-600">{getClassificationLabel(item)}</p>}
                      {item.possuiConflito && item.detalhesConflito?.[0] && (
                        <p className="text-xs font-semibold text-red-700">Conflito: {item.detalhesConflito[0].inicioConflito.slice(11, 16)} as {item.detalhesConflito[0].fimConflito.slice(11, 16)}</p>
                      )}
                      {item.observacoes && <p className="text-xs text-slate-500">{item.observacoes}</p>}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <div className={`${viewMode === "calendar" ? "block" : "hidden md:block"} overflow-x-auto`}>
        <div className="grid min-w-[760px] grid-cols-7 gap-2">
          {days.map((day) => {
            const key = toDateInput(day);
            const dayItems = calendarItems.filter((item) => getCalendarDate(item) === key);
            const holiday = findHolidayForDate(key, feriados);
            return (
              <div key={key} className="min-h-28 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-600">{formatDate(key)}</p>
                  {holiday && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800" title={holiday.nome}>Feriado</span>}
                </div>
                {holiday && <p className="mt-1 truncate text-[11px] text-amber-700">{holiday.nome}</p>}
                <div className="mt-2 grid gap-1">
                  {dayItems.map((item) => renderLaunchButton(item))}
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
                        {summary.sugestoes.map((suggestion) => (
                          <li key={`${summary.id}-${suggestion.inicio}`}>- {suggestionLabel(suggestion)}</li>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-ink">Horarios livres para implantacao</p>
              <p className="mt-1 text-sm text-slate-600">{freeMessage}</p>
            </div>
            <button className={`${primaryButton} w-full sm:w-auto`} type="button" onClick={calculateFreeTimes}>Calcular horarios livres</button>
          </div>
          {freeSuggestions.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {freeSuggestions.map((suggestion) => (
                <article key={`${suggestion.inicio}-${suggestion.fim}`} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                  <p className="font-semibold">Horario livre</p>
                  <p className="mt-1">{formatDate(suggestion.inicio.slice(0, 10))}</p>
                  <p>{suggestion.inicio.slice(11, 16)} as {suggestion.fim.slice(11, 16)}</p>
                  <p>{suggestion.horas}h disponiveis</p>
                  <p>Tipo: {suggestion.categoria === "NORMAL" ? "normal" : suggestion.categoria === "MAJORADO" ? "majorado" : `misto (${suggestion.horasNormais}h normais + ${suggestion.horasMajoradas}h majoradas)`}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
