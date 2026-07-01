import type { Lancamento, Pessoa, SubtipoHoraAula } from "../types";
import { getCompetencia } from "./dateUtils";

export function getHoraAulaSubtipo(item: Lancamento): SubtipoHoraAula {
  if (item.subtipoHoraAula) return item.subtipoHoraAula;
  if (item.categoriaPagamento === "HORA_AULA_CFSD" || item.curso?.toUpperCase() === "CFSD") return "CFSD";
  if (item.categoriaPagamento === "HORA_AULA_CFS" || item.curso?.toUpperCase() === "CFS") return "CFS";
  if (item.categoriaPagamento === "HORA_AULA_CFO" || item.curso?.toUpperCase() === "CFO") return "CFO";
  return "CFS";
}

export function normalizeLaunch(item: Lancamento, fallbackPessoa?: Pessoa): Lancamento {
  const now = new Date().toISOString();
  const base = {
    ...item,
    pessoaId: item.pessoaId ?? fallbackPessoa?.id ?? "pessoa-padrao",
    nomePessoa: item.nomePessoa ?? fallbackPessoa?.nome ?? "Pessoa padrao",
    graduacaoUsada: item.graduacaoUsada ?? fallbackPessoa?.graduacao ?? "2º SGT",
    valorHoraNormalUsado: item.valorHoraNormalUsado ?? item.valorHoraNormal ?? 0,
    valorHoraMajoradaUsado: item.valorHoraMajoradaUsado ?? item.valorHoraMajorada ?? 0,
    valorHoraAulaUsado: item.valorHoraAulaUsado ?? item.valorHoraAula ?? 0,
    observacoes: item.observacoes ?? item.observacao ?? "",
    observacao: item.observacao ?? item.observacoes ?? "",
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
  };

  if (base.tipo === "HORA_AULA") {
    const subtipoHoraAula = getHoraAulaSubtipo(base);
    return {
      ...base,
      titulo: base.titulo && !base.titulo.includes("Instrucao") && !base.titulo.includes("Outra") ? base.titulo : `Hora-aula ${subtipoHoraAula}`,
      categoriaPagamento: "HORA_AULA",
      subtipoHoraAula,
      curso: subtipoHoraAula,
    };
  }

  if (base.tipo === "EXTRA_B5" || base.tipo === "EXTRA_ADMINISTRATIVO") {
    return {
      ...base,
      tipo: "EXTRA_ADMINISTRATIVO",
      titulo: base.titulo === "Extra B5" || base.titulo.includes("B5") ? "Extra Administrativo" : base.titulo,
      observacoes: base.observacoes.replace(/B5/g, "Extra administrativo"),
    };
  }

  if (base.tipo === "MG_ORDINARIO") {
    const competenciaSobreaviso = getCompetencia(base.dataHoraInicio);
    return {
      ...base,
      competenciaServico: competenciaSobreaviso,
      competenciaImplantacao: competenciaSobreaviso,
    };
  }

  return base;
}

export function normalizeLaunches(items: Lancamento[], fallbackPessoa?: Pessoa): Lancamento[] {
  return items.map((item) => normalizeLaunch(item, fallbackPessoa));
}
