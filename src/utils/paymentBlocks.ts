import type { FeriadoEstadual, PaymentBlock, ValoresConfig } from "../types";
import { addDays, calculateRealHours, parseLocalDate, toDateInput, toDateTimeInput } from "./dateUtils";
import { mergeAutomaticHolidays } from "./holidayUtils";

function isHoliday(dataReferencia: string, feriados: FeriadoEstadual[]): string | null {
  const [year, month, day] = dataReferencia.split("-");
  const availableHolidays = mergeAutomaticHolidays(feriados, [Number(year)]);
  const holiday = availableHolidays.find((feriado) => {
    if (feriado.recorrente) {
      return feriado.data.slice(5) === `${month}-${day}`;
    }
    return feriado.data === `${year}-${month}-${day}`;
  });
  return holiday?.nome ?? null;
}

export function classifyBlock(dataReferencia: string, feriados: FeriadoEstadual[]): Pick<PaymentBlock, "classificacao" | "motivo"> {
  const holidayName = isHoliday(dataReferencia, feriados);
  if (holidayName) {
    return { classificacao: "MAJORADO", motivo: `Feriado: ${holidayName}` };
  }

  const day = parseLocalDate(dataReferencia).getDay();
  if ([0, 5, 6].includes(day)) {
    const names = ["domingo", "segunda-feira", "terca-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sabado"];
    return { classificacao: "MAJORADO", motivo: `Dia de referencia: ${names[day]}` };
  }

  return { classificacao: "NORMAL", motivo: "Dia util de segunda a quinta" };
}

export function generateHelpCostBlocks(serviceDate: string, kind: "MG_ORDINARIO" | "MG_EXTRA" | "EXTRA_ADMINISTRATIVO" | "EXTRA_B5", feriados: FeriadoEstadual[]): PaymentBlock[] {
  const serviceDay = parseLocalDate(serviceDate);
  const previousDay = addDays(serviceDay, -1);
  const nightStart = parseLocalDate(toDateInput(previousDay), 18);
  const nightEnd = parseLocalDate(serviceDate, 6);
  const dayStart = parseLocalDate(serviceDate, 6);
  const dayEnd = parseLocalDate(serviceDate, 18);

  const rawBlocks = kind === "MG_ORDINARIO"
    ? [{ inicio: nightStart, fim: nightEnd, dataReferencia: toDateInput(previousDay) }]
    : [
        { inicio: nightStart, fim: nightEnd, dataReferencia: toDateInput(previousDay) },
        { inicio: dayStart, fim: dayEnd, dataReferencia: serviceDate },
      ];

  return rawBlocks.map((block) => {
    const classification = classifyBlock(block.dataReferencia, feriados);
    return {
      inicio: toDateTimeInput(block.inicio),
      fim: toDateTimeInput(block.fim),
      dataReferencia: block.dataReferencia,
      horas: calculateRealHours(toDateTimeInput(block.inicio), toDateTimeInput(block.fim)),
      ...classification,
    };
  });
}

export function calculateHelpCostValue(horasNormais: number, horasMajoradas: number, valores: ValoresConfig): number {
  return Number((horasNormais * valores.extraNormalHora + horasMajoradas * valores.extraMajoradoHora).toFixed(2));
}

export function calculateClassifiedHours(blocks: PaymentBlock[]): { horasNormais: number; horasMajoradas: number; categoria: "NORMAL" | "MAJORADO" | "MISTO" } {
  const horasNormais = blocks.filter((block) => block.classificacao === "NORMAL").reduce((sum, block) => sum + block.horas, 0);
  const horasMajoradas = blocks.filter((block) => block.classificacao === "MAJORADO").reduce((sum, block) => sum + block.horas, 0);
  const categoria = horasNormais > 0 && horasMajoradas > 0 ? "MISTO" : horasMajoradas > 0 ? "MAJORADO" : "NORMAL";
  return { horasNormais, horasMajoradas, categoria };
}

export function calculateClassHours(inicio: string, fim: string): number {
  return calculateRealHours(inicio, fim);
}

export function calculateClassValue(horas: number, valorHora: number): number {
  return Number((horas * valorHora).toFixed(2));
}
