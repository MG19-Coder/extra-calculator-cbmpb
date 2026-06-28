import type { Lancamento } from "../types";

export function hasTimeOverlap(a: Lancamento, b: Lancamento): boolean {
  const startA = new Date(a.dataHoraInicio).getTime();
  const endA = new Date(a.dataHoraFim).getTime();
  const startB = new Date(b.dataHoraInicio).getTime();
  const endB = new Date(b.dataHoraFim).getTime();
  return startA < endB && endA > startB;
}

export function markConflicts(lancamentos: Lancamento[]): Lancamento[] {
  return lancamentos.map((item) => {
    const idsConflitantes = lancamentos
      .filter((other) => other.id !== item.id && other.pessoaId === item.pessoaId && other.status !== "CANCELADO" && hasTimeOverlap(item, other))
      .map((other) => other.id);

    return {
      ...item,
      possuiConflito: idsConflitantes.length > 0,
      idsConflitantes,
    };
  });
}
