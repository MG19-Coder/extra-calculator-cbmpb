import type { AppState, Lancamento, MonthlyTotals } from "../types";
import { markConflicts } from "./conflictUtils";
import { getHoraAulaSubtipo } from "./launchCompatibility";

function isInCompetencia(item: Lancamento, competencia: string): boolean {
  return item.competenciaImplantacao === competencia && item.status !== "CANCELADO";
}

export function calculateHelpCostQuota(horasAjudaCustoLancadas: number, limiteMensalAjudaCusto: number): { horasExcedentes: number; horasImplantaveis: number } {
  return {
    horasExcedentes: Math.max(0, horasAjudaCustoLancadas - limiteMensalAjudaCusto),
    horasImplantaveis: Math.min(horasAjudaCustoLancadas, limiteMensalAjudaCusto),
  };
}

export function calculateClassHourLimit(horasAula: number, limiteMensalHoraAula: number): { horasRestantes: number; excedeuTeto: boolean } {
  return {
    horasRestantes: Math.max(0, limiteMensalHoraAula - horasAula),
    excedeuTeto: horasAula > limiteMensalHoraAula,
  };
}

export function calculateMonthlyTotals(state: AppState): MonthlyTotals {
  const marked = markConflicts(state.lancamentos);
  const monthItems = marked.filter((item) => isInCompetencia(item, state.selectedMonth));
  const helpCostItems = monthItems.filter((item) => ["MG_ORDINARIO", "MG_EXTRA", "EXTRA_B5", "PENDENCIA_ANTERIOR"].includes(item.tipo));
  const classItems = monthItems.filter((item) => item.tipo === "HORA_AULA");

  const horasNormais = helpCostItems.reduce((sum, item) => sum + item.horasNormais, 0);
  const horasMajoradas = helpCostItems.reduce((sum, item) => sum + item.horasMajoradas, 0);
  const horasTotal = horasNormais + horasMajoradas;
  const quota = calculateHelpCostQuota(horasTotal, state.valores.limiteMensalAjudaCusto);
  const valorNormal = Number((horasNormais * state.valores.extraNormalHora).toFixed(2));
  const valorMajorado = Number((horasMajoradas * state.valores.extraMajoradoHora).toFixed(2));

  const classBy = (subtipo: "CFSD" | "CFS" | "CFO") => classItems.filter((item) => getHoraAulaSubtipo(item) === subtipo);
  const sumClass = (subtipo: "CFSD" | "CFS" | "CFO") => {
    const items = classBy(subtipo);
    return {
      horas: items.reduce((sum, item) => sum + item.horasAula, 0),
      valor: Number(items.reduce((sum, item) => sum + item.valorTotal, 0).toFixed(2)),
    };
  };
  const cfsd = sumClass("CFSD");
  const cfs = sumClass("CFS");
  const cfo = sumClass("CFO");
  const outras = { horas: 0, valor: 0 };
  const horasAulaTotal = cfsd.horas + cfs.horas + cfo.horas + outras.horas;
  const classLimit = calculateClassHourLimit(horasAulaTotal, state.valores.limiteMensalHoraAula);

  const paycheck = state.contracheques.find((item) => item.competencia === state.selectedMonth);
  const implantadoAjuda = paycheck?.ajudaCustoOperacional ?? 0;
  const implantadoAula = (paycheck?.magisterioCFSD ?? 0) + (paycheck?.magisterioCFS ?? 0) + (paycheck?.magisterioCFO ?? 0) + (paycheck?.outrosValores ?? 0);
  const valorAjuda = Number((valorNormal + valorMajorado).toFixed(2));
  const valorAula = Number((cfsd.valor + cfs.valor + cfo.valor + outras.valor).toFixed(2));

  return {
    competencia: state.selectedMonth,
    ajudaCusto: {
      horasNormais,
      horasMajoradas,
      horasTotal,
      horasImplantaveis: quota.horasImplantaveis,
      horasExcedentes: quota.horasExcedentes,
      valorNormal,
      valorMajorado,
      valorTotal: valorAjuda,
    },
    horaAula: {
      cfsd,
      cfs,
      cfo,
      outras,
      horasTotal: horasAulaTotal,
      horasRestantes: classLimit.horasRestantes,
      valorTotal: valorAula,
      excedeuTeto: classLimit.excedeuTeto,
    },
    conflitos: marked.filter((item) => item.possuiConflito && item.competenciaImplantacao === state.selectedMonth),
    pendencias: monthItems.filter((item) => item.tipo === "PENDENCIA_ANTERIOR"),
    implantado: {
      ajudaCusto: implantadoAjuda,
      horaAula: implantadoAula,
      total: Number((implantadoAjuda + implantadoAula).toFixed(2)),
    },
    diferenca: {
      ajudaCusto: Number((valorAjuda - implantadoAjuda).toFixed(2)),
      horaAula: Number((valorAula - implantadoAula).toFixed(2)),
      total: Number((valorAjuda + valorAula - implantadoAjuda - implantadoAula).toFixed(2)),
    },
  };
}
