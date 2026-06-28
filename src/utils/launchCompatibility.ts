import type { Lancamento, SubtipoHoraAula } from "../types";

export function getHoraAulaSubtipo(item: Lancamento): SubtipoHoraAula {
  if (item.subtipoHoraAula) return item.subtipoHoraAula;
  if (item.categoriaPagamento === "HORA_AULA_CFSD" || item.curso?.toUpperCase() === "CFSD") return "CFSD";
  if (item.categoriaPagamento === "HORA_AULA_CFS" || item.curso?.toUpperCase() === "CFS") return "CFS";
  if (item.categoriaPagamento === "HORA_AULA_CFO" || item.curso?.toUpperCase() === "CFO") return "CFO";
  return "CFS";
}

export function normalizeLaunch(item: Lancamento): Lancamento {
  if (item.tipo === "HORA_AULA") {
    const subtipoHoraAula = getHoraAulaSubtipo(item);
    return {
      ...item,
      titulo: item.titulo && !item.titulo.includes("Instrucao") && !item.titulo.includes("Outra") ? item.titulo : `Hora-aula ${subtipoHoraAula}`,
      categoriaPagamento: "HORA_AULA",
      subtipoHoraAula,
      curso: subtipoHoraAula,
    };
  }

  if (item.tipo === "EXTRA_B5") {
    return {
      ...item,
      titulo: item.titulo === "Extra B5" || item.titulo.includes("B5") ? "Extra Administrativo" : item.titulo,
      observacoes: item.observacoes.replace(/B5/g, "Extra administrativo"),
    };
  }

  return item;
}

export function normalizeLaunches(items: Lancamento[]): Lancamento[] {
  return items.map(normalizeLaunch);
}
