import { describe, expect, it } from "vitest";
import type { AppState, Pessoa } from "../types";
import { DEFAULT_PAY_TABLES } from "../data/payTables";
import { DEFAULT_FERIADOS, DEFAULT_MILITAR, DEFAULT_VALUES } from "../store/defaults";
import { markConflicts } from "./conflictUtils";
import { createExtraB5, createHoraAula, createMgExtra, createMgOrdinario } from "./launchFactory";
import { payTableToValues } from "./payTableUtils";
import { calculateMonthlyTotals } from "./quotaUtils";
import { generateWhatsAppReport } from "./reportUtils";

const cristian: Pessoa = {
  id: "pessoa-cristian",
  nome: "Cristian",
  graduacao: "2º SGT",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const maria: Pessoa = {
  id: "pessoa-maria",
  nome: "Maria",
  graduacao: "CB",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

function valuesFor(graduacao: string) {
  const table = DEFAULT_PAY_TABLES.find((item) => item.graduacao === graduacao) ?? DEFAULT_PAY_TABLES[0];
  return payTableToValues(table, DEFAULT_VALUES);
}

function stateOf(overrides: Partial<AppState>): AppState {
  return {
    selectedMonth: "2026-06",
    activePessoaId: cristian.id,
    pessoas: [cristian, maria],
    payTables: DEFAULT_PAY_TABLES,
    militar: DEFAULT_MILITAR,
    valores: DEFAULT_VALUES,
    feriados: DEFAULT_FERIADOS,
    lancamentos: [],
    contracheques: [],
    ...overrides,
  };
}

describe("regras por pessoa e graduacao", () => {
  it("usa valores de 2º SGT para pessoa com graduacao 2º SGT", () => {
    const launch = createMgOrdinario("2026-06-29", valuesFor("2º SGT"), DEFAULT_FERIADOS, "MG", { pessoa: cristian });
    expect(launch.graduacaoUsada).toBe("2º SGT");
    expect(launch.valorHoraNormalUsado).toBe(17.57);
    expect(launch.valorHoraMajoradaUsado).toBe(22.84);
  });

  it("usa valores da graduacao da respectiva pessoa", () => {
    const launch = createMgExtra("2026-06-10", valuesFor("CB"), DEFAULT_FERIADOS, "MG Extra", { pessoa: maria });
    expect(launch.graduacaoUsada).toBe("CB");
    expect(launch.valorHoraNormalUsado).toBe(14.52);
    expect(launch.valorHoraMajoradaUsado).toBe(18.88);
  });

  it("mudanca de graduacao afeta apenas lancamentos novos", () => {
    const oldLaunch = createMgOrdinario("2026-06-29", valuesFor("2º SGT"), DEFAULT_FERIADOS, "MG antigo", { pessoa: cristian });
    const promoted = { ...cristian, graduacao: "1º SGT" };
    const newLaunch = createMgOrdinario("2026-07-02", valuesFor("1º SGT"), DEFAULT_FERIADOS, "MG novo", { pessoa: promoted });

    expect(oldLaunch.graduacaoUsada).toBe("2º SGT");
    expect(oldLaunch.valorHoraNormalUsado).toBe(17.57);
    expect(newLaunch.graduacaoUsada).toBe("1º SGT");
    expect(newLaunch.valorHoraNormalUsado).toBe(19.33);
  });

  it("lancamentos antigos mantem valores usados nos totais", () => {
    const launch = createMgOrdinario("2026-06-29", valuesFor("2º SGT"), DEFAULT_FERIADOS, "MG", { pessoa: cristian });
    const totals = calculateMonthlyTotals(stateOf({ lancamentos: [launch], valores: valuesFor("1º SGT") }));
    expect(totals.ajudaCusto.valorMajorado).toBe(274.08);
  });
});

describe("regras de servico, cotas e conflitos", () => {
  it("MG Ordinario gera 12h pagaveis", () => {
    const launch = createMgOrdinario("2026-06-29", valuesFor("2º SGT"), DEFAULT_FERIADOS, "MG", { pessoa: cristian });
    expect(launch.horasReais).toBe(24);
    expect(launch.horasPagaveis).toBe(12);
  });

  it("MG Extra gera 24h pagaveis", () => {
    const launch = createMgExtra("2026-06-10", valuesFor("2º SGT"), DEFAULT_FERIADOS, "Extra", { pessoa: cristian });
    expect(launch.horasReais).toBe(24);
    expect(launch.horasPagaveis).toBe(24);
  });

  it("Extra Administrativo gera 24h pagaveis automaticamente", () => {
    const launch = createExtraB5({ serviceDate: "2026-06-10", valores: valuesFor("2º SGT"), feriados: DEFAULT_FERIADOS, pessoa: cristian });
    expect(launch.tipo).toBe("EXTRA_ADMINISTRATIVO");
    expect(launch.horasReais).toBe(24);
    expect(launch.horasPagaveis).toBe(24);
  });

  it("hora-aula fica fora da cota de 288h", () => {
    const aula = createHoraAula({ inicio: "2026-06-10T00:00", fim: "2026-06-10T15:00", subtipo: "CFS", disciplina: "Instrucao", valores: valuesFor("2º SGT"), pessoa: cristian });
    const totals = calculateMonthlyTotals(stateOf({ lancamentos: [aula] }));
    expect(totals.ajudaCusto.horasTotal).toBe(0);
    expect(totals.horaAula.horasTotal).toBe(15);
  });

  it("hora-aula respeita teto mensal de 40h", () => {
    const aula1 = createHoraAula({ inicio: "2026-06-10T00:00", fim: "2026-06-10T23:00", subtipo: "CFS", disciplina: "Instrucao", valores: valuesFor("2º SGT"), pessoa: cristian });
    const aula2 = createHoraAula({ inicio: "2026-06-11T00:00", fim: "2026-06-11T22:00", subtipo: "CFO", disciplina: "Instrucao", valores: valuesFor("2º SGT"), pessoa: cristian });
    const totals = calculateMonthlyTotals(stateOf({ lancamentos: [aula1, aula2] }));
    expect(totals.horaAula.horasTotal).toBe(45);
    expect(totals.horaAula.excedeuTeto).toBe(true);
  });

  it("conflitos usam horas reais", () => {
    const mg = createMgOrdinario("2026-06-11", valuesFor("2º SGT"), DEFAULT_FERIADOS, "MG", { pessoa: cristian });
    const aula = createHoraAula({ inicio: "2026-06-11T08:00", fim: "2026-06-11T12:00", subtipo: "CFS", disciplina: "Instrucao", valores: valuesFor("2º SGT"), pessoa: cristian });
    const marked = markConflicts([mg, aula]);
    expect(marked.every((item) => item.possuiConflito)).toBe(true);
  });

  it("relatorio filtra por pessoa e mes", () => {
    const launchCristian = createMgExtra("2026-06-10", valuesFor("2º SGT"), DEFAULT_FERIADOS, "Extra Cristian", { pessoa: cristian });
    const launchMaria = createMgExtra("2026-06-10", valuesFor("CB"), DEFAULT_FERIADOS, "Extra Maria", { pessoa: maria });
    const state = stateOf({ lancamentos: [launchCristian, launchMaria] });
    const totals = calculateMonthlyTotals(state);
    const report = generateWhatsAppReport(state, totals);

    expect(report).toContain("Militar: Cristian");
    expect(report).toContain("Graduacao: 2º SGT");
    expect(totals.ajudaCusto.horasTotal).toBe(24);
  });
});
