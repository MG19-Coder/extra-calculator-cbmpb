export const HOUR_MS = 60 * 60 * 1000;

export function toDate(value: string): Date {
  return new Date(value);
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toDateTimeInput(date: Date): string {
  return `${toDateInput(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseLocalDate(date: string, hour = 0, minute = 0): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * HOUR_MS);
}

export function calculateRealHours(inicio: string, fim: string): number {
  return Math.max(0, (toDate(fim).getTime() - toDate(inicio).getTime()) / HOUR_MS);
}

export function getCompetencia(value: string): string {
  const date = toDate(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function getMonthName(competencia: string): string {
  const [year, month] = competencia.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(toDate(value));
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(parseLocalDate(value));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function isSameMonth(value: string, competencia: string): boolean {
  return getCompetencia(value) === competencia;
}

export function monthBounds(competencia: string): { start: Date; end: Date } {
  const [year, month] = competencia.split("-").map(Number);
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

export function listMonthDays(competencia: string): Date[] {
  const { start, end } = monthBounds(competencia);
  const days: Date[] = [];
  for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
    days.push(new Date(date));
  }
  return days;
}

export type CalendarMonthCell = {
  date: Date | null;
  inCurrentMonth: boolean;
};

export function listMonthCalendarCells(competencia: string): CalendarMonthCell[] {
  const { start } = monthBounds(competencia);
  const days = listMonthDays(competencia);
  const leadingEmptyCells = start.getDay();
  const cells: CalendarMonthCell[] = [
    ...Array.from({ length: leadingEmptyCells }, () => ({ date: null, inCurrentMonth: false })),
    ...days.map((date) => ({ date, inCurrentMonth: true })),
  ];
  const trailingEmptyCells = (7 - (cells.length % 7)) % 7;

  return [
    ...cells,
    ...Array.from({ length: trailingEmptyCells }, () => ({ date: null, inCurrentMonth: false })),
  ];
}
