import type { Contracheque, MonthlyTotals } from "../types";

export function comparePaycheck(totals: MonthlyTotals, paycheck?: Contracheque): "CONFERIDO" | "DIVERGENTE" | "PENDENTE" {
  if (!paycheck) return "PENDENTE";
  return Math.abs(totals.diferenca.total) < 0.01 ? "CONFERIDO" : "DIVERGENTE";
}
