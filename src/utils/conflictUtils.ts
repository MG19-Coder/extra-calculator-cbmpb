import type { ClassifiedHours, ConflictSummary, FeriadoEstadual, FreeTimeSuggestion, Lancamento } from "../types";
import { addDays, addHours, calculateRealHours, HOUR_MS, parseLocalDate, toDateInput, toDateTimeInput } from "./dateUtils";
import { classifyBlock } from "./paymentBlocks";

export function hasTimeOverlap(a: Lancamento, b: Lancamento): boolean {
  const startA = new Date(a.dataHoraInicio).getTime();
  const endA = new Date(a.dataHoraFim).getTime();
  const startB = new Date(b.dataHoraInicio).getTime();
  const endB = new Date(b.dataHoraFim).getTime();
  return startA < endB && endA > startB;
}

function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a < b ? a : b;
}

function getOverlap(a: Lancamento, b: Lancamento): { inicio: Date; fim: Date; horas: number } | null {
  if (!hasTimeOverlap(a, b)) return null;
  const inicio = maxDate(new Date(a.dataHoraInicio), new Date(b.dataHoraInicio));
  const fim = minDate(new Date(a.dataHoraFim), new Date(b.dataHoraFim));
  const horas = Math.max(0, (fim.getTime() - inicio.getTime()) / HOUR_MS);
  return horas > 0 ? { inicio, fim, horas } : null;
}

function isAvailable(inicio: Date, fim: Date, agenda: Lancamento[], pessoaId?: string): boolean {
  const candidate = {
    id: "candidate",
    pessoaId: pessoaId ?? "",
    dataHoraInicio: toDateTimeInput(inicio),
    dataHoraFim: toDateTimeInput(fim),
  } as Lancamento;

  return !agenda.some((item) => {
    if (item.status === "CANCELADO") return false;
    if (pessoaId && item.pessoaId !== pessoaId) return false;
    return hasTimeOverlap(candidate, item);
  });
}

export function classifyInterval(inicioInput: string | Date, fimInput: string | Date, feriados: FeriadoEstadual[] = []): ClassifiedHours {
  const fim = typeof fimInput === "string" ? new Date(fimInput) : fimInput;
  let cursor = typeof inicioInput === "string" ? new Date(inicioInput) : inicioInput;
  let horasNormais = 0;
  let horasMajoradas = 0;

  while (cursor < fim) {
    const nextDay = parseLocalDate(toDateInput(addDays(cursor, 1)));
    const sliceEnd = minDate(nextDay, fim);
    const horas = Math.max(0, (sliceEnd.getTime() - cursor.getTime()) / HOUR_MS);
    const classification = classifyBlock(toDateInput(cursor), feriados);

    if (classification.classificacao === "MAJORADO") {
      horasMajoradas += horas;
    } else {
      horasNormais += horas;
    }

    cursor = sliceEnd;
  }

  const roundedNormal = Number(horasNormais.toFixed(2));
  const roundedMajorado = Number(horasMajoradas.toFixed(2));
  return {
    horasNormais: roundedNormal,
    horasMajoradas: roundedMajorado,
    categoria: roundedNormal > 0 && roundedMajorado > 0 ? "MISTO" : roundedMajorado > 0 ? "MAJORADO" : "NORMAL",
  };
}

function createSuggestion(inicio: Date, fim: Date, feriados: FeriadoEstadual[]): FreeTimeSuggestion {
  const classified = classifyInterval(inicio, fim, feriados);
  return {
    inicio: toDateTimeInput(inicio),
    fim: toDateTimeInput(fim),
    horas: Number(calculateRealHours(toDateTimeInput(inicio), toDateTimeInput(fim)).toFixed(2)),
    ...classified,
  };
}

export function suggestFreeTimeWindows(params: {
  dataInicial: string;
  dataFinal: string;
  quantidadeHorasNecessarias: number;
  agendaExistente: Lancamento[];
  feriados?: FeriadoEstadual[];
  pessoaId?: string;
  limite?: number;
  categoria?: "NORMAL" | "MAJORADO" | "QUALQUER";
}): FreeTimeSuggestion[] {
  const feriados = params.feriados ?? [];
  const limite = params.limite ?? 12;
  let remaining = Math.max(0, params.quantidadeHorasNecessarias);
  const start = new Date(params.dataInicial);
  const end = new Date(params.dataFinal);
  const suggestions: FreeTimeSuggestion[] = [];
  const seen = new Set<string>();
  const category = params.categoria ?? "QUALQUER";
  const occupied = params.agendaExistente
    .filter((item) => item.status !== "CANCELADO" && (!params.pessoaId || item.pessoaId === params.pessoaId))
    .map((item) => ({ inicio: maxDate(new Date(item.dataHoraInicio), start), fim: minDate(new Date(item.dataHoraFim), end) }))
    .filter((item) => item.fim > item.inicio)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  let cursor = start;
  const freeRanges: Array<{ inicio: Date; fim: Date }> = [];
  for (const busy of occupied) {
    if (busy.inicio > cursor) freeRanges.push({ inicio: cursor, fim: busy.inicio });
    if (busy.fim > cursor) cursor = busy.fim;
  }
  if (cursor < end) freeRanges.push({ inicio: cursor, fim: end });

  for (const range of freeRanges) {
    for (let day = parseLocalDate(toDateInput(range.inicio)); day < range.fim && suggestions.length < limite && remaining > 0; day = addDays(day, 1)) {
      const dayStart = maxDate(day, range.inicio);
      const dayEnd = minDate(parseLocalDate(toDateInput(addDays(day, 1))), range.fim);
      if (dayEnd <= dayStart) continue;

      const dayClass = classifyBlock(toDateInput(dayStart), feriados).classificacao;
      if (category === "NORMAL" && dayClass !== "NORMAL") continue;
      if (category === "MAJORADO" && dayClass !== "MAJORADO") continue;

      const hours = Math.min(remaining, (dayEnd.getTime() - dayStart.getTime()) / HOUR_MS);
      const candidateEnd = addHours(dayStart, hours);
      const key = `${toDateTimeInput(dayStart)}-${toDateTimeInput(candidateEnd)}`;
      if (candidateEnd <= dayStart || seen.has(key)) continue;
      if (!isAvailable(dayStart, candidateEnd, params.agendaExistente, params.pessoaId)) continue;

      seen.add(key);
      suggestions.push(createSuggestion(dayStart, candidateEnd, feriados));
      remaining = Number((remaining - hours).toFixed(2));
    }
  }

  return suggestions;
}

export function markConflicts(lancamentos: Lancamento[], feriados: FeriadoEstadual[] = []): Lancamento[] {
  const activeLaunches = lancamentos.filter((item) => item.status !== "CANCELADO");

  return lancamentos.map((item) => {
    if (item.status === "CANCELADO") {
      return {
        ...item,
        possuiConflito: false,
        idsConflitantes: [],
        detalhesConflito: [],
      };
    }

    const detalhesConflito = activeLaunches
      .filter((other) => other.id !== item.id && other.pessoaId === item.pessoaId)
      .map((other) => {
        const overlap = getOverlap(item, other);
        if (!overlap) return null;
        const dataInicial = toDateTimeInput(parseLocalDate(item.competenciaImplantacao ? `${item.competenciaImplantacao}-01` : toDateInput(overlap.inicio)));
        const dataFinal = toDateTimeInput(parseLocalDate(toDateInput(addDays(parseLocalDate(item.competenciaImplantacao ? `${item.competenciaImplantacao}-01` : toDateInput(overlap.inicio)), 62)), 23, 59));
        return {
          idConflitante: other.id,
          tituloConflitante: other.titulo,
          tipoConflitante: other.tipo,
          inicioConflito: toDateTimeInput(overlap.inicio),
          fimConflito: toDateTimeInput(overlap.fim),
          horasConflito: Number(overlap.horas.toFixed(2)),
          sugestoes: suggestFreeTimeWindows({
            dataInicial,
            dataFinal,
            quantidadeHorasNecessarias: overlap.horas,
            agendaExistente: activeLaunches,
            feriados,
            pessoaId: item.pessoaId,
          }),
        };
      })
      .filter((detail): detail is NonNullable<typeof detail> => Boolean(detail));
    const idsConflitantes = detalhesConflito.map((detail) => detail.idConflitante);

    return {
      ...item,
      possuiConflito: idsConflitantes.length > 0,
      idsConflitantes,
      detalhesConflito,
    };
  });
}

export function getConflictSummaries(lancamentos: Lancamento[]): ConflictSummary[] {
  const summaries: ConflictSummary[] = [];
  const seen = new Set<string>();

  for (const item of lancamentos) {
    for (const detail of item.detalhesConflito ?? []) {
      const pair = [item.id, detail.idConflitante].sort().join(":");
      const key = `${pair}:${detail.inicioConflito}:${detail.fimConflito}`;
      if (seen.has(key)) continue;
      seen.add(key);
      summaries.push({
        ...detail,
        id: key,
        lancamentoId: item.id,
        tituloLancamento: item.titulo,
        tipoLancamento: item.tipo,
      });
    }
  }

  return summaries;
}
