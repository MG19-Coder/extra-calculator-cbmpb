import type { AppState, Lancamento, MonthlyTotals } from "../types";
import { getConflictSummaries, markConflicts } from "./conflictUtils";
import { getCompetencia } from "./dateUtils";
import { getHoraAulaSubtipo } from "./launchCompatibility";

function getServiceDate(item: Lancamento): string {
  return item.tipo === "HORA_AULA" ? item.dataHoraInicio : `${item.dataReferenciaServico}T00:00`;
}

function getPayableMonthDate(item: Lancamento): string {
  if (item.tipo === "MG_ORDINARIO") {
    return item.dataHoraInicio;
  }
  return getServiceDate(item);
}

function isInSelectedMonth(item: Lancamento, competencia: string): boolean {
  return getCompetencia(getPayableMonthDate(item)) === competencia && item.status !== "CANCELADO";
}

function isActivePessoa(item: Lancamento, activePessoaId: string): boolean {
  return !activePessoaId || item.pessoaId === activePessoaId;
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

function calculatePayableHelpCost(items: Lancamento[], limit: number): {
  horasNormaisImplantaveis: number;
  horasMajoradasImplantaveis: number;
  valorNormalImplantavel: number;
  valorMajoradoImplantavel: number;
  valorImplantavel: number;
} {
  let remaining = limit;
  let horasNormaisImplantaveis = 0;
  let horasMajoradasImplantaveis = 0;
  let valorNormalImplantavel = 0;
  let valorMajoradoImplantavel = 0;
  let valorImplantavel = 0;
  const ordered = [...items].sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime());

  for (const item of ordered) {
    if (remaining <= 0) break;
    const normalRate = item.valorHoraNormalUsado ?? item.valorHoraNormal;
    const majorRate = item.valorHoraMajoradaUsado ?? item.valorHoraMajorada;
    const normalHours = Math.min(item.horasNormais, remaining);
    horasNormaisImplantaveis += normalHours;
    valorNormalImplantavel += normalHours * normalRate;
    valorImplantavel += normalHours * normalRate;
    remaining -= normalHours;

    if (remaining <= 0) continue;
    const majorHours = Math.min(item.horasMajoradas, remaining);
    horasMajoradasImplantaveis += majorHours;
    valorMajoradoImplantavel += majorHours * majorRate;
    valorImplantavel += majorHours * majorRate;
    remaining -= majorHours;
  }

  return {
    horasNormaisImplantaveis: Number(horasNormaisImplantaveis.toFixed(2)),
    horasMajoradasImplantaveis: Number(horasMajoradasImplantaveis.toFixed(2)),
    valorNormalImplantavel: Number(valorNormalImplantavel.toFixed(2)),
    valorMajoradoImplantavel: Number(valorMajoradoImplantavel.toFixed(2)),
    valorImplantavel: Number(valorImplantavel.toFixed(2)),
  };
}

export function calculateMonthlyTotals(state: AppState): MonthlyTotals {
  const marked = markConflicts(state.lancamentos, state.feriados);
  const monthItems = marked.filter((item) => isInSelectedMonth(item, state.selectedMonth) && isActivePessoa(item, state.activePessoaId));
  const previousPendencies = marked.filter((item) => (
    item.tipo === "PENDENCIA_ANTERIOR"
    && item.status !== "CANCELADO"
    && isActivePessoa(item, state.activePessoaId)
    && (item.competenciaImplantacao === state.selectedMonth || item.competenciaServico < state.selectedMonth)
  ));
  const conflitosDetalhados = getConflictSummaries(monthItems);
  const helpCostItems = monthItems.filter((item) => ["MG_ORDINARIO", "MG_EXTRA", "EXTRA_ADMINISTRATIVO", "EXTRA_B5"].includes(item.tipo));
  const classItems = monthItems.filter((item) => item.tipo === "HORA_AULA");

  const horasNormais = helpCostItems.reduce((sum, item) => sum + item.horasNormais, 0);
  const horasMajoradas = helpCostItems.reduce((sum, item) => sum + item.horasMajoradas, 0);
  const horasTotal = horasNormais + horasMajoradas;
  const quota = calculateHelpCostQuota(horasTotal, state.valores.limiteMensalAjudaCusto);
  const valorNormal = Number(helpCostItems.reduce((sum, item) => sum + item.horasNormais * (item.valorHoraNormalUsado ?? item.valorHoraNormal), 0).toFixed(2));
  const valorMajorado = Number(helpCostItems.reduce((sum, item) => sum + item.horasMajoradas * (item.valorHoraMajoradaUsado ?? item.valorHoraMajorada), 0).toFixed(2));
  const payableHelpCost = calculatePayableHelpCost(helpCostItems, state.valores.limiteMensalAjudaCusto);

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
  const horasNormaisImplantadas = paycheck?.horasNormaisImplantadas ?? 0;
  const horasMajoradasImplantadas = paycheck?.horasMajoradasImplantadas ?? 0;
  const horasAjudaImplantadas = horasNormaisImplantadas + horasMajoradasImplantadas;
  const horasCfsdImplantadas = paycheck?.magisterioCFSD ?? 0;
  const horasCfsImplantadas = paycheck?.magisterioCFS ?? 0;
  const horasCfoImplantadas = paycheck?.magisterioCFO ?? 0;
  const horasAulaImplantadas = horasCfsdImplantadas + horasCfsImplantadas + horasCfoImplantadas;
  const implantadoAjuda = paycheck?.ajudaCustoOperacional ?? 0;
  const implantadoAula = paycheck?.outrosValores ?? 0;
  const valorAjuda = Number((valorNormal + valorMajorado).toFixed(2));
  const valorAjudaImplantavel = payableHelpCost.valorImplantavel;
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
      valorImplantavel: valorAjudaImplantavel,
      valorExcedente: Number(Math.max(0, valorAjuda - valorAjudaImplantavel).toFixed(2)),
      valorNormalImplantavel: payableHelpCost.valorNormalImplantavel,
      valorMajoradoImplantavel: payableHelpCost.valorMajoradoImplantavel,
      horasNormaisImplantaveis: payableHelpCost.horasNormaisImplantaveis,
      horasMajoradasImplantaveis: payableHelpCost.horasMajoradasImplantaveis,
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
    conflitos: marked.filter((item) => item.possuiConflito && item.competenciaImplantacao === state.selectedMonth && isActivePessoa(item, state.activePessoaId)),
    conflitosDetalhados,
    pendencias: previousPendencies,
    implantado: {
      ajudaCusto: implantadoAjuda,
      horaAula: implantadoAula,
      total: Number((implantadoAjuda + implantadoAula).toFixed(2)),
    },
    implantadoHoras: {
      normais: horasNormaisImplantadas,
      majoradas: horasMajoradasImplantadas,
      ajudaCusto: horasAjudaImplantadas,
      cfsd: horasCfsdImplantadas,
      cfs: horasCfsImplantadas,
      cfo: horasCfoImplantadas,
      horaAula: horasAulaImplantadas,
      total: horasAjudaImplantadas + horasAulaImplantadas,
    },
    pendenteHoras: {
      normais: Math.max(0, payableHelpCost.horasNormaisImplantaveis - horasNormaisImplantadas),
      majoradas: Math.max(0, payableHelpCost.horasMajoradasImplantaveis - horasMajoradasImplantadas),
      ajudaCusto: Math.max(0, quota.horasImplantaveis - horasAjudaImplantadas),
      cfsd: Math.max(0, cfsd.horas - horasCfsdImplantadas),
      cfs: Math.max(0, cfs.horas - horasCfsImplantadas),
      cfo: Math.max(0, cfo.horas - horasCfoImplantadas),
      horaAula: Math.max(0, horasAulaTotal - horasAulaImplantadas),
    },
    diferenca: {
      ajudaCusto: Number((valorAjudaImplantavel - implantadoAjuda).toFixed(2)),
      horaAula: Number((valorAula - implantadoAula).toFixed(2)),
      total: Number((valorAjudaImplantavel + valorAula - implantadoAjuda - implantadoAula).toFixed(2)),
    },
  };
}
