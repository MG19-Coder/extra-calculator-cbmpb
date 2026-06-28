import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FeriadoEstadual, Lancamento } from "../types";
import { formatDate, listMonthDays, toDateInput } from "../utils/dateUtils";
import { Field, inputClass, primaryButton, secondaryButton, Section } from "../components/ui";
import { findHolidayForDate } from "../utils/holidayUtils";
import { createExtraB5, createHoraAula, createMgExtra, createMgOrdinario } from "../utils/launchFactory";
import type { SubtipoHoraAula, ValoresConfig } from "../types";
import { getHoraAulaSubtipo } from "../utils/launchCompatibility";

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

function buildUpdatedLaunch(item: Lancamento, date: string, startTime: string, endTime: string, valores: ValoresConfig, feriados: FeriadoEstadual[]): Lancamento {
  let updated: Lancamento;
  const valoresUsados: ValoresConfig = {
    ...valores,
    extraNormalHora: item.valorHoraNormalUsado || item.valorHoraNormal || valores.extraNormalHora,
    extraMajoradoHora: item.valorHoraMajoradaUsado || item.valorHoraMajorada || valores.extraMajoradoHora,
    horaAulaCFSD: item.valorHoraAulaUsado || valores.horaAulaCFSD,
    horaAulaCFS: item.valorHoraAulaUsado || valores.horaAulaCFS,
    horaAulaCFO: item.valorHoraAulaUsado || valores.horaAulaCFO,
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
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("00:00");
  const [editEnd, setEditEnd] = useState("15:00");
  const [editSubtipo, setEditSubtipo] = useState<SubtipoHoraAula>("CFS");

  useEffect(() => {
    if (!editing) return;
    setEditDate(getCalendarDate(editing));
    setEditStart(editing.dataHoraInicio.slice(11, 16));
    setEditEnd(editing.dataHoraFim.slice(11, 16));
    setEditSubtipo(getHoraAulaSubtipo(editing));
  }, [editing]);

  function saveEditing() {
    if (!editing) return;
    const itemToSave = editing.tipo === "HORA_AULA" ? { ...editing, subtipoHoraAula: editSubtipo, curso: editSubtipo } : editing;
    onUpdate(buildUpdatedLaunch(itemToSave, editDate, editStart, editEnd, valores, feriados));
    setEditing(null);
  }

  return (
    <Section title="Calendario mensal">
      <div className="grid gap-4">
        {editing && (
          <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-soft">
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
                <input className={inputClass} type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} />
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

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
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
                  {dayItems.map((item) => (
                    <button key={item.id} type="button" onClick={() => setEditing(item)} className={`rounded px-2 py-1 text-left text-xs font-medium ${getItemStyle(item)}`}>
                      <span className="mr-1 font-bold">{getItemLabel(item)}:</span>
                      {item.tipo === "HORA_AULA" ? `${item.horasAula}h ${getHoraAulaSubtipo(item)}` : `${item.horasPagaveis}h`}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
