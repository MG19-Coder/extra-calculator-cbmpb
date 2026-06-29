import type { Contracheque, MonthlyTotals } from "../types";

export function comparePaycheck(totals: MonthlyTotals, paycheck?: Contracheque): "CONFERIDO" | "DIVERGENTE" | "PENDENTE" {
  if (!paycheck) return "PENDENTE";
  const pending =
    totals.pendenteHoras.normais +
    totals.pendenteHoras.majoradas +
    totals.pendenteHoras.cfsd +
    totals.pendenteHoras.cfs +
    totals.pendenteHoras.cfo;
  return pending <= 0.01 ? "CONFERIDO" : "DIVERGENTE";
}
