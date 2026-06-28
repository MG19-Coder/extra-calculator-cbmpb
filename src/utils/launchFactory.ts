import type { CategoriaPagamento, FeriadoEstadual, Lancamento, StatusLancamento, SubtipoHoraAula, ValoresConfig } from "../types";
import { addDays, calculateRealHours, getCompetencia, parseLocalDate, toDateInput, toDateTimeInput } from "./dateUtils";
import { calculateClassHours, calculateClassValue, calculateClassifiedHours, calculateHelpCostValue, generateHelpCostBlocks } from "./paymentBlocks";

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
}

function baseStatus(): StatusLancamento {
  return "LANCADO";
}

export function createMgOrdinario(serviceDate: string, valores: ValoresConfig, feriados: FeriadoEstadual[], title = "MG Ordinario"): Lancamento {
  const serviceDay = parseLocalDate(serviceDate);
  const inicio = toDateTimeInput(parseLocalDate(toDateInput(addDays(serviceDay, -1)), 18));
  const fim = toDateTimeInput(parseLocalDate(serviceDate, 18));
  const blocks = generateHelpCostBlocks(serviceDate, "MG_ORDINARIO", feriados);
  const classified = calculateClassifiedHours(blocks);
  const valorTotal = calculateHelpCostValue(classified.horasNormais, classified.horasMajoradas, valores);

  return {
    id: id("mg-ord"),
    titulo: title,
    tipo: "MG_ORDINARIO",
    natureza: "ORDINARIO",
    categoriaPagamento: classified.categoria,
    dataHoraInicio: inicio,
    dataHoraFim: fim,
    dataReferenciaServico: serviceDate,
    horasReais: calculateRealHours(inicio, fim),
    horasPagaveis: 12,
    horasNormais: classified.horasNormais,
    horasMajoradas: classified.horasMajoradas,
    horasAula: 0,
    valorHoraNormal: valores.extraNormalHora,
    valorHoraMajorada: valores.extraMajoradoHora,
    valorHoraAula: 0,
    valorTotal,
    competenciaServico: getCompetencia(`${serviceDate}T00:00`),
    competenciaImplantacao: getCompetencia(`${serviceDate}T00:00`),
    status: baseStatus(),
    observacoes: blocks.map((block) => `${block.dataReferencia}: ${block.classificacao.toLowerCase()} (${block.motivo})`).join("; "),
    origemPendencia: "",
    possuiConflito: false,
    idsConflitantes: [],
  };
}

export function createMgExtra(serviceDate: string, valores: ValoresConfig, feriados: FeriadoEstadual[], title = "MG Extra"): Lancamento {
  const serviceDay = parseLocalDate(serviceDate);
  const inicio = toDateTimeInput(parseLocalDate(toDateInput(addDays(serviceDay, -1)), 18));
  const fim = toDateTimeInput(parseLocalDate(serviceDate, 18));
  const blocks = generateHelpCostBlocks(serviceDate, "MG_EXTRA", feriados);
  const classified = calculateClassifiedHours(blocks);
  const valorTotal = calculateHelpCostValue(classified.horasNormais, classified.horasMajoradas, valores);

  return {
    id: id("mg-extra"),
    titulo: title,
    tipo: "MG_EXTRA",
    natureza: "EXTRA",
    categoriaPagamento: classified.categoria,
    dataHoraInicio: inicio,
    dataHoraFim: fim,
    dataReferenciaServico: serviceDate,
    horasReais: calculateRealHours(inicio, fim),
    horasPagaveis: 24,
    horasNormais: classified.horasNormais,
    horasMajoradas: classified.horasMajoradas,
    horasAula: 0,
    valorHoraNormal: valores.extraNormalHora,
    valorHoraMajorada: valores.extraMajoradoHora,
    valorHoraAula: 0,
    valorTotal,
    competenciaServico: getCompetencia(`${serviceDate}T00:00`),
    competenciaImplantacao: getCompetencia(`${serviceDate}T00:00`),
    status: baseStatus(),
    observacoes: blocks.map((block) => `${block.dataReferencia}: ${block.classificacao.toLowerCase()} (${block.motivo})`).join("; "),
    origemPendencia: "",
    possuiConflito: false,
    idsConflitantes: [],
  };
}

export function createExtraB5(params: {
  serviceDate: string;
  valores: ValoresConfig;
  feriados: FeriadoEstadual[];
  horasNormais?: number;
  horasMajoradas?: number;
  horasPagaveis?: number;
  inicio?: string;
  fim?: string;
}): Lancamento {
  const serviceDay = parseLocalDate(params.serviceDate);
  const inicio = params.inicio || toDateTimeInput(parseLocalDate(toDateInput(addDays(serviceDay, -1)), 18));
  const fim = params.fim || toDateTimeInput(parseLocalDate(params.serviceDate, 18));
  const manual = params.horasNormais !== undefined || params.horasMajoradas !== undefined || params.horasPagaveis !== undefined;
  const blocks = manual ? [] : generateHelpCostBlocks(params.serviceDate, "EXTRA_B5", params.feriados);
  const classified = manual
    ? {
        horasNormais: params.horasNormais ?? 0,
        horasMajoradas: params.horasMajoradas ?? 0,
        categoria: ((params.horasNormais ?? 0) > 0 && (params.horasMajoradas ?? 0) > 0 ? "MISTO" : (params.horasMajoradas ?? 0) > 0 ? "MAJORADO" : "NORMAL") as CategoriaPagamento,
      }
    : calculateClassifiedHours(blocks);

  return {
    id: id("b5"),
    titulo: "Extra Administrativo",
    tipo: "EXTRA_B5",
    natureza: "B5",
    categoriaPagamento: classified.categoria,
    dataHoraInicio: inicio,
    dataHoraFim: fim,
    dataReferenciaServico: params.serviceDate,
    horasReais: calculateRealHours(inicio, fim),
    horasPagaveis: params.horasPagaveis ?? classified.horasNormais + classified.horasMajoradas,
    horasNormais: classified.horasNormais,
    horasMajoradas: classified.horasMajoradas,
    horasAula: 0,
    valorHoraNormal: params.valores.extraNormalHora,
    valorHoraMajorada: params.valores.extraMajoradoHora,
    valorHoraAula: 0,
    valorTotal: calculateHelpCostValue(classified.horasNormais, classified.horasMajoradas, params.valores),
    competenciaServico: getCompetencia(`${params.serviceDate}T00:00`),
    competenciaImplantacao: getCompetencia(`${params.serviceDate}T00:00`),
    status: baseStatus(),
    observacoes: manual ? "Extra administrativo informado manualmente." : "Extra administrativo com preset 18h as 18h.",
    origemPendencia: "",
    possuiConflito: false,
    idsConflitantes: [],
  };
}

export function createHoraAula(params: {
  inicio: string;
  fim: string;
  subtipo: SubtipoHoraAula;
  disciplina: string;
  competenciaImplantacao?: string;
  valores: ValoresConfig;
}): Lancamento {
  const valorHora = params.subtipo === "CFSD"
    ? params.valores.horaAulaCFSD
    : params.subtipo === "CFS"
      ? params.valores.horaAulaCFS
      : params.valores.horaAulaCFO;
  const horas = calculateClassHours(params.inicio, params.fim);

  return {
    id: id("aula"),
    titulo: `Hora-aula ${params.subtipo}`,
    tipo: "HORA_AULA",
    natureza: "MAGISTERIO",
    categoriaPagamento: "HORA_AULA",
    dataHoraInicio: params.inicio,
    dataHoraFim: params.fim,
    dataReferenciaServico: params.inicio.slice(0, 10),
    horasReais: horas,
    horasPagaveis: horas,
    horasNormais: 0,
    horasMajoradas: 0,
    horasAula: horas,
    valorHoraNormal: 0,
    valorHoraMajorada: 0,
    valorHoraAula: valorHora,
    valorTotal: calculateClassValue(horas, valorHora),
    competenciaServico: getCompetencia(params.inicio),
    competenciaImplantacao: params.competenciaImplantacao ?? getCompetencia(params.inicio),
    status: baseStatus(),
    observacoes: params.disciplina,
    origemPendencia: "",
    possuiConflito: false,
    idsConflitantes: [],
    subtipoHoraAula: params.subtipo,
    curso: params.subtipo,
    disciplina: params.disciplina,
  };
}

export function createPendenciaAnterior(params: {
  competenciaImplantacao: string;
  mesOrigem: string;
  anoOrigem: string;
  horas: number;
  tipo: "NORMAL" | "MAJORADO";
  valores: ValoresConfig;
}): Lancamento {
  const date = `${params.competenciaImplantacao}-01T00:00`;
  const horasNormais = params.tipo === "NORMAL" ? params.horas : 0;
  const horasMajoradas = params.tipo === "MAJORADO" ? params.horas : 0;
  return {
    id: id("pend"),
    titulo: `Pendencia ${params.mesOrigem}/${params.anoOrigem}`,
    tipo: "PENDENCIA_ANTERIOR",
    natureza: "PENDENCIA",
    categoriaPagamento: params.tipo,
    dataHoraInicio: date,
    dataHoraFim: `${params.competenciaImplantacao}-01T01:00`,
    dataReferenciaServico: `${params.competenciaImplantacao}-01`,
    horasReais: 0,
    horasPagaveis: params.horas,
    horasNormais,
    horasMajoradas,
    horasAula: 0,
    valorHoraNormal: params.valores.extraNormalHora,
    valorHoraMajorada: params.valores.extraMajoradoHora,
    valorHoraAula: 0,
    valorTotal: calculateHelpCostValue(horasNormais, horasMajoradas, params.valores),
    competenciaServico: `${params.anoOrigem}-${params.mesOrigem}`,
    competenciaImplantacao: params.competenciaImplantacao,
    status: baseStatus(),
    observacoes: "Resto de mes anterior.",
    origemPendencia: `${params.mesOrigem}/${params.anoOrigem}`,
    possuiConflito: false,
    idsConflitantes: [],
  };
}
