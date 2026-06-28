export type TipoLancamento =
  | "MG_ORDINARIO"
  | "MG_EXTRA"
  | "EXTRA_ADMINISTRATIVO"
  | "EXTRA_B5"
  | "HORA_AULA"
  | "PENDENCIA_ANTERIOR"
  | "OUTRO";

export type NaturezaLancamento =
  | "ORDINARIO"
  | "EXTRA"
  | "B5"
  | "MAGISTERIO"
  | "PENDENCIA"
  | "OUTRO";

export type SubtipoHoraAula = "CFSD" | "CFS" | "CFO";

export type CategoriaPagamento =
  | "NORMAL"
  | "MAJORADO"
  | "MISTO"
  | "HORA_AULA"
  | "HORA_AULA_INSTRUCAO"
  | "HORA_AULA_CFSD"
  | "HORA_AULA_CFS"
  | "HORA_AULA_CFO"
  | "HORA_AULA_OUTRA"
  | "OUTRA";

export type StatusLancamento =
  | "LANCADO"
  | "ENVIADO"
  | "IMPLANTADO"
  | "PAGO"
  | "CORTADO"
  | "RESTO_PROXIMO_MES"
  | "CANCELADO";

export interface Militar {
  nome: string;
  postoGraduacao: string;
  matricula: string;
  unidade: string;
  funcao: string;
  observacoes: string;
}

export interface Pessoa {
  id: string;
  nome: string;
  graduacao: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayTable {
  id: string;
  graduacao: string;
  valorHoraExtraNormal: number;
  valorExtraNormal12h: number;
  valorExtraNormal24h: number;
  valorHoraExtraMajorado: number;
  valorExtraMajorado12h: number;
  valorExtraMajorado24h: number;
  valorHoraAulaCFSD: number;
  valorHoraAulaCFS: number;
  valorHoraAulaCFO: number;
  createdAt: string;
  updatedAt: string;
}

export interface ValoresConfig {
  extraNormalHora: number;
  extraNormal12h: number;
  extraNormal24h: number;
  extraMajoradoHora: number;
  extraMajorado12h: number;
  extraMajorado24h: number;
  horaAulaCFSD: number;
  horaAulaCFS: number;
  horaAulaCFO: number;
  horaAulaOutra: number;
  limiteMensalAjudaCusto: number;
  limiteMensalHoraAula: number;
}

export interface FeriadoEstadual {
  id: string;
  data: string;
  nome: string;
  recorrente: boolean;
  observacoes: string;
}

export interface Lancamento {
  id: string;
  pessoaId: string;
  nomePessoa: string;
  graduacaoUsada: string;
  titulo: string;
  tipo: TipoLancamento;
  natureza: NaturezaLancamento;
  categoriaPagamento: CategoriaPagamento;
  dataHoraInicio: string;
  dataHoraFim: string;
  dataReferenciaServico: string;
  horasReais: number;
  horasPagaveis: number;
  horasNormais: number;
  horasMajoradas: number;
  horasAula: number;
  valorHoraNormal: number;
  valorHoraMajorada: number;
  valorHoraAula: number;
  valorHoraNormalUsado: number;
  valorHoraMajoradaUsado: number;
  valorHoraAulaUsado: number;
  valorTotal: number;
  competenciaServico: string;
  competenciaImplantacao: string;
  status: StatusLancamento;
  observacoes: string;
  origemPendencia: string;
  possuiConflito: boolean;
  idsConflitantes: string[];
  subtipoHoraAula?: SubtipoHoraAula;
  curso?: string;
  disciplina?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contracheque {
  competencia: string;
  ajudaCustoOperacional: number;
  magisterioCFSD: number;
  magisterioCFS: number;
  magisterioCFO: number;
  outrosValores: number;
  observacoes: string;
}

export interface PaymentBlock {
  inicio: string;
  fim: string;
  dataReferencia: string;
  horas: number;
  classificacao: "NORMAL" | "MAJORADO";
  motivo: string;
}

export interface MonthlyTotals {
  competencia: string;
  ajudaCusto: {
    horasNormais: number;
    horasMajoradas: number;
    horasTotal: number;
    horasImplantaveis: number;
    horasExcedentes: number;
    valorNormal: number;
    valorMajorado: number;
    valorTotal: number;
  };
  horaAula: {
    cfsd: { horas: number; valor: number };
    cfs: { horas: number; valor: number };
    cfo: { horas: number; valor: number };
    outras: { horas: number; valor: number };
    horasTotal: number;
    horasRestantes: number;
    valorTotal: number;
    excedeuTeto: boolean;
  };
  conflitos: Lancamento[];
  pendencias: Lancamento[];
  implantado: {
    ajudaCusto: number;
    horaAula: number;
    total: number;
  };
  diferenca: {
    ajudaCusto: number;
    horaAula: number;
    total: number;
  };
}

export interface AppState {
  selectedMonth: string;
  activePessoaId: string;
  pessoas: Pessoa[];
  payTables: PayTable[];
  militar: Militar;
  valores: ValoresConfig;
  feriados: FeriadoEstadual[];
  lancamentos: Lancamento[];
  contracheques: Contracheque[];
}
