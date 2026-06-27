import type { FeriadoEstadual } from "../types";
import { pad2 } from "./dateUtils";

function holidayId(prefix: string, date: string): string {
  return `${prefix}-${date}`;
}

function dateFromOffset(easter: Date, offsetDays: number): string {
  const date = new Date(easter);
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getAutomaticHolidaysForYear(year: number): FeriadoEstadual[] {
  const fixed = [
    ["01-01", "Confraternizacao Universal", "nacional"],
    ["04-21", "Tiradentes", "nacional"],
    ["05-01", "Dia do Trabalho", "nacional"],
    ["09-07", "Independencia do Brasil", "nacional"],
    ["10-12", "Nossa Senhora Aparecida", "nacional"],
    ["11-02", "Finados", "nacional"],
    ["11-15", "Proclamacao da Republica", "nacional"],
    ["11-20", "Consciencia Negra", "nacional"],
    ["12-25", "Natal", "nacional"],
    ["08-05", "Fundacao da Paraiba", "estadual-pb"],
  ] as const;

  const recurring = fixed.map(([monthDay, nome, scope]) => ({
    id: holidayId(scope, `${year}-${monthDay}`),
    data: `${year}-${monthDay}`,
    nome,
    recorrente: true,
    observacoes: scope === "estadual-pb" ? "Feriado estadual da Paraiba." : "Feriado nacional automatico.",
  }));

  const easter = easterDate(year);
  const movable = [
    [dateFromOffset(easter, -47), "Carnaval"],
    [dateFromOffset(easter, -46), "Carnaval"],
    [dateFromOffset(easter, -2), "Sexta-feira Santa"],
    [dateFromOffset(easter, 60), "Corpus Christi"],
  ] as const;

  return [
    ...recurring,
    ...movable.map(([data, nome]) => ({
      id: holidayId("movel", data),
      data,
      nome,
      recorrente: false,
      observacoes: "Feriado/ponto facultativo movel automatico.",
    })),
  ];
}

export function mergeAutomaticHolidays(feriados: FeriadoEstadual[], years: number[]): FeriadoEstadual[] {
  const byId = new Map<string, FeriadoEstadual>();
  for (const feriado of feriados) {
    byId.set(feriado.id, feriado);
  }
  for (const year of years) {
    for (const feriado of getAutomaticHolidaysForYear(year)) {
      byId.set(feriado.id, byId.get(feriado.id) ?? feriado);
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.data.localeCompare(b.data));
}

export function findHolidayForDate(date: string, feriados: FeriadoEstadual[]): FeriadoEstadual | undefined {
  const [, month, day] = date.split("-");
  return feriados.find((feriado) => {
    if (feriado.recorrente) {
      return feriado.data.slice(5) === `${month}-${day}`;
    }
    return feriado.data === date;
  });
}
