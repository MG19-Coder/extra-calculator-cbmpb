import type { AppState, Contracheque, FeriadoEstadual, Lancamento, PayTable, Pessoa } from "../types";
import { mergeAutomaticHolidays } from "./holidayUtils";
import { normalizeLaunches } from "./launchCompatibility";
import { recalculateHelpCostClassification } from "./paymentBlocks";

export const EXPORT_VERSION = "1.0";

export interface ExportedScaleFile {
  versao: string;
  exportadoEm: string;
  aplicativo: "Controle de Extras BM";
  usuario: {
    nome: string;
    graduacao: string;
  };
  referencia: {
    mes: number;
    ano: number;
    competencia: string;
  };
  configuracoes: {
    cotaPrincipalHoras: number;
    cotaMagisterioHoras: number;
  };
  dados: AppState;
  lancamentos: Lancamento[];
  pendencias: Lancamento[];
  feriados: FeriadoEstadual[];
}

export interface ImportResult {
  state: AppState;
  importedLaunches: number;
  skippedDuplicates: number;
}

export function createExportPayload(state: AppState): ExportedScaleFile {
  const [year, month] = state.selectedMonth.split("-").map(Number);
  const activePessoa = state.pessoas.find((item) => item.id === state.activePessoaId) ?? state.pessoas[0];
  return {
    versao: EXPORT_VERSION,
    exportadoEm: new Date().toISOString(),
    aplicativo: "Controle de Extras BM",
    usuario: {
      nome: activePessoa?.nome || state.militar.nome || "Usuario",
      graduacao: activePessoa?.graduacao || state.militar.postoGraduacao || "",
    },
    referencia: {
      mes: month,
      ano: year,
      competencia: state.selectedMonth,
    },
    configuracoes: {
      cotaPrincipalHoras: state.valores.limiteMensalAjudaCusto,
      cotaMagisterioHoras: state.valores.limiteMensalHoraAula,
    },
    dados: state,
    lancamentos: state.lancamentos,
    pendencias: state.lancamentos.filter((item) => item.tipo === "PENDENCIA_ANTERIOR"),
    feriados: state.feriados,
  };
}

export function createExportFileName(state: AppState): string {
  return `escala-domar-${state.selectedMonth}.json`;
}

export function parseImportedScale(raw: string): AppState {
  const parsed = JSON.parse(raw) as Partial<ExportedScaleFile> & Partial<AppState>;
  const maybeState = parsed.dados ?? parsed;

  if (!maybeState || !Array.isArray(maybeState.lancamentos) || !Array.isArray(maybeState.feriados) || !maybeState.valores) {
    throw new Error("Arquivo invalido para importacao de escala.");
  }

  const state = maybeState as AppState;
  const fallbackPessoa = state.pessoas?.[0];
  const selectedMonth = state.selectedMonth || parsed.referencia?.competencia || new Date().toISOString().slice(0, 7);
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const pessoas = state.pessoas?.length ? state.pessoas : fallbackPessoa ? [fallbackPessoa] : [];

  return {
    ...state,
    selectedMonth,
    pessoas,
    activePessoaId: state.activePessoaId || pessoas[0]?.id || "",
    feriados: mergeAutomaticHolidays(state.feriados, [selectedYear - 1, selectedYear, selectedYear + 1]),
    lancamentos: normalizeLaunches(state.lancamentos, pessoas[0]).map((item) => recalculateHelpCostClassification(item, state.feriados)),
    contracheques: state.contracheques ?? [],
    payTables: state.payTables ?? [],
  };
}

function launchDuplicateKey(item: Lancamento): string {
  return [
    item.pessoaId,
    item.dataHoraInicio,
    item.dataHoraFim,
    item.tipo,
    item.subtipoHoraAula ?? item.curso ?? "",
    item.horasPagaveis,
    item.horasAula,
    item.observacoes ?? "",
  ].join("|").toLowerCase();
}

function mergeBy<T>(current: T[], imported: T[], keyOf: (item: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const item of current) byKey.set(keyOf(item), item);
  for (const item of imported) {
    const key = keyOf(item);
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return Array.from(byKey.values());
}

export function mergeImportedState(current: AppState, imported: AppState): ImportResult {
  const existingLaunchKeys = new Set(current.lancamentos.map(launchDuplicateKey));
  const importedLaunches: Lancamento[] = [];
  let skippedDuplicates = 0;

  for (const item of imported.lancamentos) {
    const key = launchDuplicateKey(item);
    if (existingLaunchKeys.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    existingLaunchKeys.add(key);
    importedLaunches.push(item);
  }

  const selectedYear = Number(imported.selectedMonth.slice(0, 4));
  const nextState: AppState = {
    ...current,
    selectedMonth: imported.selectedMonth || current.selectedMonth,
    activePessoaId: imported.activePessoaId || current.activePessoaId,
    militar: imported.militar ?? current.militar,
    valores: imported.valores ?? current.valores,
    pessoas: mergeBy<Pessoa>(current.pessoas, imported.pessoas, (item) => item.id || `${item.nome}-${item.graduacao}`),
    payTables: mergeBy<PayTable>(current.payTables, imported.payTables, (item) => item.id || item.graduacao),
    feriados: mergeAutomaticHolidays(
      mergeBy<FeriadoEstadual>(current.feriados, imported.feriados, (item) => item.id || `${item.data}-${item.nome}`),
      [selectedYear - 1, selectedYear, selectedYear + 1],
    ),
    contracheques: mergeBy<Contracheque>(current.contracheques, imported.contracheques, (item) => item.competencia),
    lancamentos: [...current.lancamentos, ...importedLaunches],
  };

  return {
    state: nextState,
    importedLaunches: importedLaunches.length,
    skippedDuplicates,
  };
}

export function replaceWithImportedState(imported: AppState): ImportResult {
  return {
    state: imported,
    importedLaunches: imported.lancamentos.length,
    skippedDuplicates: 0,
  };
}

