import type { PayTable, Pessoa, SubtipoHoraAula, ValoresConfig } from "../types";

export const FIXED_CLASS_VALUES = {
  CFSD: 43.41,
  CFS: 86.82,
  CFO: 130.24,
} as const;

export function payTableToValues(payTable: PayTable, limits?: Partial<Pick<ValoresConfig, "limiteMensalAjudaCusto" | "limiteMensalHoraAula">>): ValoresConfig {
  return {
    extraNormalHora: payTable.valorHoraExtraNormal,
    extraNormal12h: payTable.valorExtraNormal12h,
    extraNormal24h: payTable.valorExtraNormal24h,
    extraMajoradoHora: payTable.valorHoraExtraMajorado,
    extraMajorado12h: payTable.valorExtraMajorado12h,
    extraMajorado24h: payTable.valorExtraMajorado24h,
    horaAulaCFSD: FIXED_CLASS_VALUES.CFSD,
    horaAulaCFS: FIXED_CLASS_VALUES.CFS,
    horaAulaCFO: FIXED_CLASS_VALUES.CFO,
    horaAulaOutra: FIXED_CLASS_VALUES.CFS,
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
  void payTable;
  if (subtipo === "CFSD") return FIXED_CLASS_VALUES.CFSD;
  if (subtipo === "CFO") return FIXED_CLASS_VALUES.CFO;
  return FIXED_CLASS_VALUES.CFS;
}
