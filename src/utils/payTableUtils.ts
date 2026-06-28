import type { PayTable, Pessoa, SubtipoHoraAula, ValoresConfig } from "../types";

export function payTableToValues(payTable: PayTable, limits?: Partial<Pick<ValoresConfig, "limiteMensalAjudaCusto" | "limiteMensalHoraAula">>): ValoresConfig {
  return {
    extraNormalHora: payTable.valorHoraExtraNormal,
    extraNormal12h: payTable.valorExtraNormal12h,
    extraNormal24h: payTable.valorExtraNormal24h,
    extraMajoradoHora: payTable.valorHoraExtraMajorado,
    extraMajorado12h: payTable.valorExtraMajorado12h,
    extraMajorado24h: payTable.valorExtraMajorado24h,
    horaAulaCFSD: payTable.valorHoraAulaCFSD,
    horaAulaCFS: payTable.valorHoraAulaCFS,
    horaAulaCFO: payTable.valorHoraAulaCFO,
    horaAulaOutra: payTable.valorHoraAulaCFS,
    limiteMensalAjudaCusto: limits?.limiteMensalAjudaCusto ?? 288,
    limiteMensalHoraAula: limits?.limiteMensalHoraAula ?? 40,
  };
}

export function getPayTableForGraduacao(payTables: PayTable[], graduacao: string): PayTable {
  return payTables.find((item) => item.graduacao === graduacao) ?? payTables[0];
}

export function getActivePessoa(pessoas: Pessoa[], activePessoaId: string): Pessoa {
  return pessoas.find((item) => item.id === activePessoaId) ?? pessoas[0];
}

export function getValorHoraAula(payTable: PayTable, subtipo: SubtipoHoraAula): number {
  if (subtipo === "CFSD") return payTable.valorHoraAulaCFSD;
  if (subtipo === "CFO") return payTable.valorHoraAulaCFO;
  return payTable.valorHoraAulaCFS;
}
