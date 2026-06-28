import type { AppState, FeriadoEstadual, Lancamento, Militar, Pessoa, ValoresConfig } from "../types";
import { createMgExtra, createMgOrdinario, createHoraAula, createPendenciaAnterior } from "../utils/launchFactory";
import { mergeAutomaticHolidays } from "../utils/holidayUtils";
import { DEFAULT_PAY_TABLES } from "../data/payTables";
import { payTableToValues } from "../utils/payTableUtils";

export const DEFAULT_VALUES: ValoresConfig = {
  extraNormalHora: 17.57,
  extraNormal12h: 210.84,
  extraNormal24h: 421.68,
  extraMajoradoHora: 22.84,
  extraMajorado12h: 274.08,
  extraMajorado24h: 548.16,
  horaAulaCFSD: 43.41,
  horaAulaCFS: 86.82,
  horaAulaCFO: 130.24,
  horaAulaOutra: 43.41,
  limiteMensalAjudaCusto: 288,
  limiteMensalHoraAula: 40,
};

export const DEFAULT_PESSOAS: Pessoa[] = [
  {
    id: "pessoa-cristian",
    nome: "Cristian",
    graduacao: "2º SGT",
    createdAt: "2026-06-27T00:00:00.000Z",
    updatedAt: "2026-06-27T00:00:00.000Z",
  },
];

export const DEFAULT_MILITAR: Militar = {
  nome: "",
  postoGraduacao: "",
  matricula: "",
  unidade: "",
  funcao: "",
  observacoes: "",
};

export const DEFAULT_FERIADOS: FeriadoEstadual[] = mergeAutomaticHolidays([], [2025, 2026, 2027]);

export function createSampleLaunches(valores: ValoresConfig, feriados: FeriadoEstadual[]): Lancamento[] {
  const pessoa = DEFAULT_PESSOAS[0];
  return [
    createMgOrdinario("2026-06-29", valores, feriados, "Exemplo MG Ordinario 29/06", { pessoa }),
    createMgExtra("2026-05-08", valores, feriados, "Exemplo MG Extra 08/05", { pessoa }),
    createMgOrdinario("2026-05-06", valores, feriados, "Exemplo MG Ordinario 06/05", { pessoa }),
    createHoraAula({
      inicio: "2026-06-10T00:00",
      fim: "2026-06-10T15:00",
      subtipo: "CFS",
      disciplina: "Instrucao",
      competenciaImplantacao: "2026-06",
      valores,
      pessoa,
    }),
    createPendenciaAnterior({
      competenciaImplantacao: "2026-06",
      mesOrigem: "05",
      anoOrigem: "2026",
      horas: 12,
      tipo: "MAJORADO",
      valores,
      pessoa,
    }),
  ];
}

export function createDefaultState(): AppState {
  const values = payTableToValues(DEFAULT_PAY_TABLES[3], {
    limiteMensalAjudaCusto: DEFAULT_VALUES.limiteMensalAjudaCusto,
    limiteMensalHoraAula: DEFAULT_VALUES.limiteMensalHoraAula,
  });
  return {
    selectedMonth: "2026-06",
    activePessoaId: DEFAULT_PESSOAS[0].id,
    pessoas: DEFAULT_PESSOAS,
    payTables: DEFAULT_PAY_TABLES,
    militar: DEFAULT_MILITAR,
    valores: values,
    feriados: DEFAULT_FERIADOS,
    lancamentos: createSampleLaunches(values, DEFAULT_FERIADOS),
    contracheques: [],
  };
}
