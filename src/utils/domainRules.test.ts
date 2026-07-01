import { describe, expect, it } from "vitest";
import type { AppState, Pessoa } from "../types";
import { DEFAULT_PAY_TABLES } from "../data/payTables";
import { DEFAULT_FERIADOS, DEFAULT_MILITAR, DEFAULT_VALUES } from "../store/defaults";
import { markConflicts, suggestFreeTimeWindows } from "./conflictUtils";
import { createExportPayload, mergeImportedState, parseImportedScale } from "./dataTransferUtils";
import { listMonthCalendarCells } from "./dateUtils";
import { gerarPeriodosImplantaveis } from "./calendarDisplayUtils";
import { createExtraB5, createHoraAula, createMgExtra, createMgOrdinario, createPendenciaAnterior } from "./launchFactory";
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

  it("conta prontidao do primeiro dia do mes seguinte no mes do sobreaviso", () => {
    const launch = createMgOrdinario("2026-07-01", valuesFor("2Âº SGT"), DEFAULT_FERIADOS, "MG", { pessoa: cristian });
    const juneTotals = calculateMonthlyTotals(stateOf({ selectedMonth: "2026-06", lancamentos: [launch] }));
    const julyTotals = calculateMonthlyTotals(stateOf({ selectedMonth: "2026-07", lancamentos: [launch] }));

    expect(launch.dataHoraInicio).toBe("2026-06-30T18:00");
    expect(launch.competenciaImplantacao).toBe("2026-06");
    expect(juneTotals.ajudaCusto.horasTotal).toBe(12);
    expect(julyTotals.ajudaCusto.horasTotal).toBe(0);
  });

  it("MG Extra gera 24h pagaveis", () => {
    const launch = createMgExtra("2026-06-10", valuesFor("2º SGT"), DEFAULT_FERIADOS, "Extra", { pessoa: cristian });
    expect(launch.horasReais).toBe(24);
    expect(launch.horasPagaveis).toBe(24);
  });

  it("mantem sexta, sabado, domingo e feriado como majorado", () => {
    const feriado = createMgExtra("2026-06-04", valuesFor("2º SGT"), DEFAULT_FERIADOS, "Corpus Christi", { pessoa: cristian });
    const sexta = createMgOrdinario("2026-06-06", valuesFor("2º SGT"), DEFAULT_FERIADOS, "Sexta", { pessoa: cristian });
    const segunda = createMgOrdinario("2026-06-09", valuesFor("2º SGT"), DEFAULT_FERIADOS, "Segunda", { pessoa: cristian });

    expect(feriado.horasMajoradas).toBeGreaterThan(0);
    expect(sexta.horasMajoradas).toBe(12);
    expect(segunda.horasNormais).toBe(12);
  });

  it("Extra Administrativo gera 24h pagaveis automaticamente", () => {
    const launch = createExtraB5({ serviceDate: "2026-06-10", valores: valuesFor("2º SGT"), feriados: DEFAULT_FERIADOS, pessoa: cristian });
    expect(launch.tipo).toBe("EXTRA_ADMINISTRATIVO");
    expect(launch.horasReais).toBe(24);
    expect(launch.horasPagaveis).toBe(24);
  });

  it("limita o valor pagavel de ajuda de custo a 288h", () => {
    const valores = valuesFor("2º SGT");
    const launch = createExtraB5({
      serviceDate: "2026-06-10",
      valores,
      feriados: DEFAULT_FERIADOS,
      pessoa: cristian,
      horasNormais: 300,
      horasPagaveis: 300,
    });
    const totals = calculateMonthlyTotals(stateOf({ lancamentos: [launch] }));

    expect(totals.ajudaCusto.horasTotal).toBe(300);
    expect(totals.ajudaCusto.horasImplantaveis).toBe(288);
    expect(totals.ajudaCusto.valorImplantavel).toBe(Number((288 * valores.extraNormalHora).toFixed(2)));
    expect(totals.ajudaCusto.valorExcedente).toBe(Number((12 * valores.extraNormalHora).toFixed(2)));
  });

  it("hora-aula fica fora da cota de 288h", () => {
    const aula = createHoraAula({ inicio: "2026-06-10T00:00", fim: "2026-06-10T15:00", subtipo: "CFS", disciplina: "Instrucao", valores: valuesFor("2º SGT"), pessoa: cristian });
    const totals = calculateMonthlyTotals(stateOf({ lancamentos: [aula] }));
    expect(totals.ajudaCusto.horasTotal).toBe(0);
    expect(totals.horaAula.horasTotal).toBe(15);
  });

  it("hora-aula usa valores fixos por curso", () => {
    const valores = valuesFor("SD");
    const cfsd = createHoraAula({ inicio: "2026-06-10T08:00", fim: "2026-06-10T09:00", subtipo: "CFSD", disciplina: "Instrucao", valores, pessoa: cristian });
    const cfs = createHoraAula({ inicio: "2026-06-10T09:00", fim: "2026-06-10T10:00", subtipo: "CFS", disciplina: "Instrucao", valores, pessoa: cristian });
    const cfo = createHoraAula({ inicio: "2026-06-10T10:00", fim: "2026-06-10T11:00", subtipo: "CFO", disciplina: "Instrucao", valores, pessoa: cristian });

    expect(cfsd.valorHoraAulaUsado).toBe(43.41);
    expect(cfs.valorHoraAulaUsado).toBe(86.82);
    expect(cfo.valorHoraAulaUsado).toBe(130.24);
  });

  it("hora-aula respeita teto mensal de 40h", () => {
    const aula1 = createHoraAula({ inicio: "2026-06-10T00:00", fim: "2026-06-10T23:00", subtipo: "CFS", disciplina: "Instrucao", valores: valuesFor("2º SGT"), pessoa: cristian });
    const aula2 = createHoraAula({ inicio: "2026-06-11T00:00", fim: "2026-06-11T22:00", subtipo: "CFO", disciplina: "Instrucao", valores: valuesFor("2º SGT"), pessoa: cristian });
    const totals = calculateMonthlyTotals(stateOf({ lancamentos: [aula1, aula2] }));
    expect(totals.horaAula.horasTotal).toBe(45);
    expect(totals.horaAula.excedeuTeto).toBe(true);
  });

  it("nao gera conflito entre hora-aula e servico operacional", () => {
    const mg = createMgOrdinario("2026-06-11", valuesFor("2º SGT"), DEFAULT_FERIADOS, "MG", { pessoa: cristian });
    const aula = createHoraAula({ inicio: "2026-06-11T08:00", fim: "2026-06-11T12:00", subtipo: "CFS", disciplina: "Instrucao", valores: valuesFor("2º SGT"), pessoa: cristian });
    const marked = markConflicts([mg, aula], DEFAULT_FERIADOS);
    expect(marked.every((item) => item.possuiConflito)).toBe(false);
  });

  it("nao gera conflito entre prontidao ordinaria e extra 12h", () => {
    const prontidao = createMgOrdinario("2026-06-29", DEFAULT_VALUES, DEFAULT_FERIADOS, "MG Ordinario", { pessoa: cristian });
    const extra12h = createExtraB5({
      serviceDate: "2026-06-29",
      valores: DEFAULT_VALUES,
      feriados: DEFAULT_FERIADOS,
      pessoa: cristian,
      inicio: "2026-06-29T06:00",
      fim: "2026-06-29T18:00",
      horasNormais: 12,
      horasPagaveis: 12,
    });
    const marked = markConflicts([prontidao, extra12h], DEFAULT_FERIADOS);

    expect(marked.every((item) => item.possuiConflito)).toBe(false);
  });

  it("calcula periodo conflitante e sugestoes livres entre servicos operacionais", () => {
    const extra1 = createExtraB5({
      serviceDate: "2026-06-28",
      valores: valuesFor("2Âº SGT"),
      feriados: DEFAULT_FERIADOS,
      pessoa: cristian,
      inicio: "2026-06-27T08:00",
      fim: "2026-06-27T23:00",
      horasMajoradas: 15,
      horasPagaveis: 15,
    });
    const extra = createExtraB5({
      serviceDate: "2026-06-28",
      valores: valuesFor("2º SGT"),
      feriados: DEFAULT_FERIADOS,
      pessoa: cristian,
      inicio: "2026-06-27T18:00",
      fim: "2026-06-28T06:00",
      horasMajoradas: 12,
      horasPagaveis: 12,
    });
    const marked = markConflicts([extra1, extra], DEFAULT_FERIADOS, true);
    const detail = marked[0].detalhesConflito?.[0];

    expect(detail?.inicioConflito).toBe("2026-06-27T18:00");
    expect(detail?.fimConflito).toBe("2026-06-27T23:00");
    expect(detail?.horasConflito).toBe(5);
    expect(detail?.sugestoes.length).toBeGreaterThan(0);
  });

  it("sugere janela livre sem sobrepor agenda existente", () => {
    const ocupada = createHoraAula({ inicio: "2026-06-30T08:00", fim: "2026-06-30T13:00", subtipo: "CFS", disciplina: "Instrucao", valores: valuesFor("2º SGT"), pessoa: cristian });
    const sugestoes = suggestFreeTimeWindows({
      dataInicial: "2026-06-30T00:00",
      dataFinal: "2026-07-31T23:59",
      quantidadeHorasNecessarias: 5,
      agendaExistente: [ocupada],
      feriados: DEFAULT_FERIADOS,
      pessoaId: cristian.id,
    });

    expect(sugestoes.some((item) => item.inicio === "2026-06-30T08:00")).toBe(false);
    expect(sugestoes[0].horas).toBeGreaterThan(0);
  });

  it("sugere horas majoradas apenas em sexta, sabado, domingo ou feriado", () => {
    const sugestoes = suggestFreeTimeWindows({
      dataInicial: "2026-06-01T00:00",
      dataFinal: "2026-06-10T23:59",
      quantidadeHorasNecessarias: 24,
      agendaExistente: [],
      feriados: DEFAULT_FERIADOS,
      pessoaId: cristian.id,
      categoria: "MAJORADO",
      limite: 10,
    });

    expect(sugestoes.length).toBeGreaterThan(0);
    expect(sugestoes.every((item) => item.horasNormais === 0 && item.horasMajoradas > 0)).toBe(true);
    expect(sugestoes.some((item) => item.inicio.startsWith("2026-06-03"))).toBe(false);
  });

  it("sugere horas normais apenas em segunda a quinta sem feriado", () => {
    const sugestoes = suggestFreeTimeWindows({
      dataInicial: "2026-06-01T00:00",
      dataFinal: "2026-06-10T23:59",
      quantidadeHorasNecessarias: 24,
      agendaExistente: [],
      feriados: DEFAULT_FERIADOS,
      pessoaId: cristian.id,
      categoria: "NORMAL",
      limite: 10,
    });

    expect(sugestoes.length).toBeGreaterThan(0);
    expect(sugestoes.every((item) => item.horasMajoradas === 0 && item.horasNormais > 0)).toBe(true);
    expect(sugestoes.some((item) => item.inicio.startsWith("2026-06-05"))).toBe(false);
  });

  it("nao gera conflito entre pessoas diferentes", () => {
    const mgCristian = createMgOrdinario("2026-06-11", valuesFor("2º SGT"), DEFAULT_FERIADOS, "MG Cristian", { pessoa: cristian });
    const mgMaria = createMgOrdinario("2026-06-11", valuesFor("CB"), DEFAULT_FERIADOS, "MG Maria", { pessoa: maria });
    const marked = markConflicts([mgCristian, mgMaria], DEFAULT_FERIADOS);
    expect(marked.every((item) => item.possuiConflito)).toBe(false);
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

  it("mantem pendencias anteriores fora dos totais do mes", () => {
    const launch = createMgExtra("2026-06-10", valuesFor("2Âº SGT"), DEFAULT_FERIADOS, "Extra", { pessoa: cristian });
    const pendencia = createPendenciaAnterior({
      competenciaImplantacao: "2026-06",
      mesOrigem: "05",
      anoOrigem: "2026",
      horas: 12,
      tipo: "MAJORADO",
      valores: valuesFor("2Âº SGT"),
      pessoa: cristian,
    });
    const totals = calculateMonthlyTotals(stateOf({ lancamentos: [launch, pendencia] }));

    expect(totals.pendencias).toHaveLength(1);
    expect(totals.ajudaCusto.horasTotal).toBe(24);
    expect(totals.ajudaCusto.horasMajoradas).toBe(0);
    expect(totals.ajudaCusto.valorTotal).toBe(launch.valorTotal);
  });

  it("salva observacao opcional em pendencia anterior", () => {
    const pendencia = createPendenciaAnterior({
      competenciaImplantacao: "2026-06",
      mesOrigem: "05",
      anoOrigem: "2026",
      horas: 12,
      tipo: "MAJORADO",
      valores: valuesFor("2Ã‚Âº SGT"),
      pessoa: cristian,
      observacao: "Extra implantado parcialmente",
    });

    expect(pendencia.observacoes).toBe("Extra implantado parcialmente");
    expect(pendencia.observacao).toBe("Extra implantado parcialmente");
  });

  it("calcula totais apenas pela data do servico no mes selecionado", () => {
    const maioImplantadoEmJunho = createHoraAula({
      inicio: "2026-05-31T08:00",
      fim: "2026-05-31T12:00",
      subtipo: "CFS",
      disciplina: "Instrucao",
      competenciaImplantacao: "2026-06",
      valores: valuesFor("2Âº SGT"),
      pessoa: cristian,
    });
    const junho = createHoraAula({
      inicio: "2026-06-01T08:00",
      fim: "2026-06-01T12:00",
      subtipo: "CFS",
      disciplina: "Instrucao",
      competenciaImplantacao: "2026-06",
      valores: valuesFor("2Âº SGT"),
      pessoa: cristian,
    });
    const totals = calculateMonthlyTotals(stateOf({ lancamentos: [maioImplantadoEmJunho, junho] }));

    expect(totals.horaAula.horasTotal).toBe(4);
  });

  it("monta calendario mensal iniciando no domingo", () => {
    const cells = listMonthCalendarCells("2026-06");
    const firstWeek = cells.slice(0, 7).map((cell) => cell.date?.getDate() ?? null);

    expect(firstWeek).toEqual([null, 1, 2, 3, 4, 5, 6]);
    expect(cells[7].date?.getDate()).toBe(7);
    expect(cells.length % 7).toBe(0);
  });

  it("gera periodos visuais de prontidao sem mostrar 12h na prontidao", () => {
    const launch = createMgOrdinario("2026-06-29", valuesFor("2Âº SGT"), DEFAULT_FERIADOS, "MG", { pessoa: cristian });
    const periods = gerarPeriodosImplantaveis(launch);

    expect(periods.map((period) => ({ data: period.data, titulo: period.titulo, horas: period.horas, exibirHoras: period.exibirHoras, inicio: period.horarioInicio, fim: period.horarioFim }))).toEqual([
      { data: "2026-06-28", titulo: "Sobreaviso", horas: 12, exibirHoras: true, inicio: "18:00", fim: "06:00" },
      { data: "2026-06-29", titulo: "Prontidao", horas: 12, exibirHoras: false, inicio: "06:00", fim: "18:00" },
    ]);
  });

  it("gera extra de 24h dividido em dois periodos de 12h", () => {
    const launch = createMgExtra("2026-06-10", valuesFor("2Âº SGT"), DEFAULT_FERIADOS, "Extra", { pessoa: cristian });
    const periods = gerarPeriodosImplantaveis(launch);

    expect(periods.map((period) => ({ data: period.data, titulo: period.titulo, horas: period.horas, exibirHoras: period.exibirHoras, inicio: period.horarioInicio, fim: period.horarioFim }))).toEqual([
      { data: "2026-06-09", titulo: "Extra", horas: 12, exibirHoras: true, inicio: "18:00", fim: "06:00" },
      { data: "2026-06-10", titulo: "Extra", horas: 12, exibirHoras: true, inicio: "06:00", fim: "18:00" },
    ]);
  });
});

describe("exportacao e importacao de escala", () => {
  it("exporta e restaura a escala completa em JSON", () => {
    const launch = createMgExtra("2026-06-10", valuesFor("2º SGT"), DEFAULT_FERIADOS, "Extra", { pessoa: cristian });
    const state = stateOf({ lancamentos: [launch] });
    const payload = createExportPayload(state);
    const imported = parseImportedScale(JSON.stringify(payload));

    expect(payload.versao).toBe("1.0");
    expect(imported.lancamentos).toHaveLength(1);
    expect(imported.lancamentos[0].tipo).toBe("MG_EXTRA");
    expect(imported.pessoas[0].nome).toBe("Cristian");
  });

  it("mescla escala ignorando lancamentos duplicados", () => {
    const launch = createMgExtra("2026-06-10", valuesFor("2º SGT"), DEFAULT_FERIADOS, "Extra", { pessoa: cristian });
    const current = stateOf({ lancamentos: [launch] });
    const imported = stateOf({ lancamentos: [{ ...launch, id: "outro-id" }] });
    const result = mergeImportedState(current, imported);

    expect(result.importedLaunches).toBe(0);
    expect(result.skippedDuplicates).toBe(1);
    expect(result.state.lancamentos).toHaveLength(1);
  });
});
