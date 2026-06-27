import type { FeriadoEstadual, Lancamento, ValoresConfig } from "../types";
import { addDays, monthBounds, parseLocalDate, toDateInput } from "./dateUtils";
import { createMgOrdinario } from "./launchFactory";

export function generateScale24x48(params: {
  firstServiceDate: string;
  competencia: string;
  valores: ValoresConfig;
  feriados: FeriadoEstadual[];
}): Lancamento[] {
  const { end } = monthBounds(params.competencia);
  const launches: Lancamento[] = [];
  for (let serviceDate = parseLocalDate(params.firstServiceDate); serviceDate <= end; serviceDate = addDays(serviceDate, 3)) {
    const serviceDateInput = toDateInput(serviceDate);
    if (serviceDateInput.startsWith(params.competencia)) {
      launches.push(createMgOrdinario(serviceDateInput, params.valores, params.feriados, `MG Ordinario ${serviceDateInput}`));
    }
  }
  return launches;
}
