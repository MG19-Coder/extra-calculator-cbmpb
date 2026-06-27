import type { AppState, Lancamento, MonthlyTotals } from "../types";
import { formatCurrency, getMonthName } from "./dateUtils";

function sumByType(items: Lancamento[], tipo: Lancamento["tipo"]) {
  const filtered = items.filter((item) => item.tipo === tipo);
  const horasNormais = filtered.reduce((sum, item) => sum + item.horasNormais, 0);
  const horasMajoradas = filtered.reduce((sum, item) => sum + item.horasMajoradas, 0);
  const valor = filtered.reduce((sum, item) => sum + item.valorTotal, 0);
  return { horasNormais, horasMajoradas, total: horasNormais + horasMajoradas, valor };
}

export function generateWhatsAppReport(state: AppState, totals: MonthlyTotals): string {
  const items = state.lancamentos.filter((item) => item.competenciaImplantacao === state.selectedMonth && item.status !== "CANCELADO");
  const mgOrd = sumByType(items, "MG_ORDINARIO");
  const mgExtra = sumByType(items, "MG_EXTRA");
  const b5 = sumByType(items, "EXTRA_B5");
  const militar = [state.militar.postoGraduacao, state.militar.nome].filter(Boolean).join(" ") || "Nao informado";
  const conflicts = totals.conflitos.length
    ? `Conflitos encontrados: ${totals.conflitos.map((item) => item.titulo).join(", ")}.`
    : "Nao foram identificados conflitos de horario.";

  return `# Extras ${getMonthName(state.selectedMonth)}

Militar: ${militar}
Matricula: ${state.militar.matricula || "Nao informada"}

Cota ajuda de custo: ${state.valores.limiteMensalAjudaCusto}h

MG Ordinario:
* Horas normais: ${mgOrd.horasNormais}h
* Horas majoradas: ${mgOrd.horasMajoradas}h
* Total: ${mgOrd.total}h
* Valor: ${formatCurrency(mgOrd.valor)}

MG Extra:
* Horas normais: ${mgExtra.horasNormais}h
* Horas majoradas: ${mgExtra.horasMajoradas}h
* Total: ${mgExtra.total}h
* Valor: ${formatCurrency(mgExtra.valor)}

Extra B5:
* Horas normais: ${b5.horasNormais}h
* Horas majoradas: ${b5.horasMajoradas}h
* Total: ${b5.total}h
* Valor: ${formatCurrency(b5.valor)}

Pendencias anteriores:
${totals.pendencias.length ? totals.pendencias.map((item) => `* Resto de ${item.origemPendencia}: ${item.horasPagaveis}h ${item.categoriaPagamento.toLowerCase()} - ${formatCurrency(item.valorTotal)}`).join("\n") : "* Nenhuma pendencia implantada no mes"}

Resumo ajuda de custo:
* Total lancado: ${totals.ajudaCusto.horasTotal}h
* Implantavel no mes: ${totals.ajudaCusto.horasImplantaveis}h
* Resta para o mes seguinte: ${totals.ajudaCusto.horasExcedentes}h
* Valor previsto: ${formatCurrency(totals.ajudaCusto.valorTotal)}

Horas-aula:
* CFSD: ${totals.horaAula.cfsd.horas}h - ${formatCurrency(totals.horaAula.cfsd.valor)}
* CFS: ${totals.horaAula.cfs.horas}h - ${formatCurrency(totals.horaAula.cfs.valor)}
* CFO: ${totals.horaAula.cfo.horas}h - ${formatCurrency(totals.horaAula.cfo.valor)}
* Instrucao/Outras: ${totals.horaAula.outras.horas}h - ${formatCurrency(totals.horaAula.outras.valor)}
* Total de horas-aula: ${totals.horaAula.horasTotal}h de ${state.valores.limiteMensalHoraAula}h
* Valor previsto de hora-aula: ${formatCurrency(totals.horaAula.valorTotal)}

Total geral previsto:
${formatCurrency(totals.ajudaCusto.valorTotal + totals.horaAula.valorTotal)}

Observacoes:
${conflicts}`;
}
