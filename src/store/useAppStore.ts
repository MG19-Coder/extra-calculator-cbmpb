import { useEffect, useMemo, useState } from "react";
import type { AppState, Contracheque, FeriadoEstadual, Lancamento, Militar, Pessoa, ValoresConfig } from "../types";
import { createDefaultState, DEFAULT_PESSOAS } from "./defaults";
import { markConflicts } from "../utils/conflictUtils";
import { mergeAutomaticHolidays } from "../utils/holidayUtils";
import { normalizeLaunch, normalizeLaunches } from "../utils/launchCompatibility";
import { DEFAULT_PAY_TABLES } from "../data/payTables";
import { mergeImportedState, replaceWithImportedState } from "../utils/dataTransferUtils";
import { recalculateHelpCostClassification } from "../utils/paymentBlocks";
import { calculateHelpCostValue } from "../utils/paymentBlocks";
import { payTableToValues } from "../utils/payTableUtils";

const STORAGE_KEY = "controle-extras-bm:v1";

function syncLaunchValuesWithPeople(lancamentos: Lancamento[], pessoas: Pessoa[], payTables: AppState["payTables"], limites: ValoresConfig): Lancamento[] {
  return lancamentos.map((item) => {
    if (item.tipo === "HORA_AULA") return item;
    const pessoa = pessoas.find((candidate) => candidate.id === item.pessoaId);
    const payTable = pessoa && payTables.find((candidate) => candidate.graduacao === pessoa.graduacao);
    if (!pessoa || !payTable) return item;
    const valores = payTableToValues(payTable, limites);
    return {
      ...item,
      graduacaoUsada: pessoa.graduacao,
      valorHoraNormal: valores.extraNormalHora,
      valorHoraMajorada: valores.extraMajoradoHora,
      valorHoraNormalUsado: valores.extraNormalHora,
      valorHoraMajoradaUsado: valores.extraMajoradoHora,
      valorTotal: calculateHelpCostValue(item.horasNormais ?? 0, item.horasMajoradas ?? 0, valores),
    };
  });
}

function readState(): AppState {
  const fallback = createDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = { ...fallback, ...JSON.parse(raw) } as AppState;
    const pessoas = parsed.pessoas?.length ? parsed.pessoas : DEFAULT_PESSOAS;
    const activePessoaId = parsed.activePessoaId ?? pessoas[0].id;
    const selectedYear = Number(parsed.selectedMonth.slice(0, 4));
    return {
      ...parsed,
      pessoas,
      activePessoaId,
      payTables: parsed.payTables?.length ? parsed.payTables : DEFAULT_PAY_TABLES,
      feriados: mergeAutomaticHolidays(parsed.feriados, [selectedYear - 1, selectedYear, selectedYear + 1]),
      lancamentos: syncLaunchValuesWithPeople(
        normalizeLaunches(parsed.lancamentos, pessoas[0]).map((item) => recalculateHelpCostClassification(item, parsed.feriados ?? [])),
        pessoas,
        parsed.payTables?.length ? parsed.payTables : DEFAULT_PAY_TABLES,
        parsed.valores,
      ),
    };
  } catch {
    return fallback;
  }
}

export function useAppStore() {
  const [state, setState] = useState<AppState>(() => readState());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const lancamentosComConflito = useMemo(() => markConflicts(state.lancamentos, state.feriados), [state.lancamentos, state.feriados]);

  function setSelectedMonth(selectedMonth: string) {
    const selectedYear = Number(selectedMonth.slice(0, 4));
    setState((current) => ({
      ...current,
      selectedMonth,
      feriados: mergeAutomaticHolidays(current.feriados, [selectedYear - 1, selectedYear, selectedYear + 1]),
    }));
  }

  function setActivePessoa(activePessoaId: string) {
    setState((current) => ({ ...current, activePessoaId }));
  }

  function upsertPessoa(pessoa: Pessoa) {
    setState((current) => {
      const exists = current.pessoas.some((item) => item.id === pessoa.id);
      const now = new Date().toISOString();
      const nextPessoa = { ...pessoa, updatedAt: now, createdAt: pessoa.createdAt || now };
      const payTable = current.payTables.find((item) => item.graduacao === nextPessoa.graduacao);
      const pessoaValores = payTable ? payTableToValues(payTable, current.valores) : current.valores;
      const lancamentos = current.lancamentos.map((item) => {
        if (item.pessoaId !== nextPessoa.id || item.tipo === "HORA_AULA") return item;
        const horasNormais = item.horasNormais ?? 0;
        const horasMajoradas = item.horasMajoradas ?? 0;
        return {
          ...item,
          graduacaoUsada: nextPessoa.graduacao,
          valorHoraNormal: pessoaValores.extraNormalHora,
          valorHoraMajorada: pessoaValores.extraMajoradoHora,
          valorHoraNormalUsado: pessoaValores.extraNormalHora,
          valorHoraMajoradaUsado: pessoaValores.extraMajoradoHora,
          valorTotal: calculateHelpCostValue(horasNormais, horasMajoradas, pessoaValores),
          updatedAt: now,
        };
      });
      return {
        ...current,
        activePessoaId: current.activePessoaId || nextPessoa.id,
        pessoas: exists ? current.pessoas.map((item) => item.id === pessoa.id ? nextPessoa : item) : [...current.pessoas, nextPessoa],
        lancamentos,
      };
    });
  }

  function removePessoa(id: string, force = false) {
    setState((current) => {
      const hasLaunches = current.lancamentos.some((item) => item.pessoaId === id);
      if (hasLaunches && !force) return current;
      const pessoas = current.pessoas.filter((item) => item.id !== id);
      return {
        ...current,
        pessoas,
        activePessoaId: current.activePessoaId === id ? pessoas[0]?.id ?? "" : current.activePessoaId,
      };
    });
  }

  function addLaunches(items: Lancamento[]) {
    const fallbackPessoa = state.pessoas.find((item) => item.id === state.activePessoaId) ?? state.pessoas[0];
    setState((current) => ({ ...current, lancamentos: markConflicts([...current.lancamentos, ...normalizeLaunches(items, fallbackPessoa)], current.feriados) }));
  }

  function updateLaunch(item: Lancamento) {
    const fallbackPessoa = state.pessoas.find((person) => person.id === state.activePessoaId) ?? state.pessoas[0];
    setState((current) => ({ ...current, lancamentos: markConflicts(current.lancamentos.map((launch) => launch.id === item.id ? normalizeLaunch(item, fallbackPessoa) : launch), current.feriados) }));
  }

  function removeLaunch(id: string) {
    setState((current) => ({ ...current, lancamentos: markConflicts(current.lancamentos.filter((item) => item.id !== id), current.feriados) }));
  }

  function updateValues(valores: ValoresConfig) {
    setState((current) => ({ ...current, valores }));
  }

  function updateMilitar(militar: Militar) {
    setState((current) => ({ ...current, militar }));
  }

  function upsertHoliday(feriado: FeriadoEstadual) {
    setState((current) => {
      const exists = current.feriados.some((item) => item.id === feriado.id);
      return {
        ...current,
        feriados: exists ? current.feriados.map((item) => item.id === feriado.id ? feriado : item) : [...current.feriados, feriado],
      };
    });
  }

  function removeHoliday(id: string) {
    setState((current) => ({ ...current, feriados: current.feriados.filter((item) => item.id !== id) }));
  }

  function upsertPaycheck(contracheque: Contracheque) {
    setState((current) => {
      const exists = current.contracheques.some((item) => item.competencia === contracheque.competencia);
      return {
        ...current,
        contracheques: exists
          ? current.contracheques.map((item) => item.competencia === contracheque.competencia ? contracheque : item)
          : [...current.contracheques, contracheque],
      };
    });
  }

  function importScale(imported: AppState, mode: "replace" | "merge") {
    let result = { importedLaunches: 0, skippedDuplicates: 0 };
    setState((current) => {
      const importedResult = mode === "replace" ? replaceWithImportedState(imported) : mergeImportedState(current, imported);
      result = {
        importedLaunches: importedResult.importedLaunches,
        skippedDuplicates: importedResult.skippedDuplicates,
      };
      return {
        ...importedResult.state,
        lancamentos: markConflicts(importedResult.state.lancamentos, importedResult.state.feriados),
      };
    });
    return result;
  }

  return {
    state: { ...state, lancamentos: lancamentosComConflito },
    setSelectedMonth,
    setActivePessoa,
    upsertPessoa,
    removePessoa,
    addLaunches,
    updateLaunch,
    removeLaunch,
    updateValues,
    updateMilitar,
    upsertHoliday,
    removeHoliday,
    upsertPaycheck,
    importScale,
  };
}

