import { useEffect, useMemo, useState } from "react";
import type { AppState, Contracheque, FeriadoEstadual, Lancamento, Militar, Pessoa, ValoresConfig } from "../types";
import { createDefaultState, DEFAULT_PESSOAS } from "./defaults";
import { markConflicts } from "../utils/conflictUtils";
import { mergeAutomaticHolidays } from "../utils/holidayUtils";
import { normalizeLaunch, normalizeLaunches } from "../utils/launchCompatibility";
import { DEFAULT_PAY_TABLES } from "../data/payTables";

const STORAGE_KEY = "controle-extras-bm:v1";

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
      lancamentos: normalizeLaunches(parsed.lancamentos, pessoas[0]),
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

  const lancamentosComConflito = useMemo(() => markConflicts(state.lancamentos), [state.lancamentos]);

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
      return {
        ...current,
        activePessoaId: current.activePessoaId || nextPessoa.id,
        pessoas: exists ? current.pessoas.map((item) => item.id === pessoa.id ? nextPessoa : item) : [...current.pessoas, nextPessoa],
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
    setState((current) => ({ ...current, lancamentos: markConflicts([...current.lancamentos, ...normalizeLaunches(items, fallbackPessoa)]) }));
  }

  function updateLaunch(item: Lancamento) {
    const fallbackPessoa = state.pessoas.find((person) => person.id === state.activePessoaId) ?? state.pessoas[0];
    setState((current) => ({ ...current, lancamentos: markConflicts(current.lancamentos.map((launch) => launch.id === item.id ? normalizeLaunch(item, fallbackPessoa) : launch)) }));
  }

  function removeLaunch(id: string) {
    setState((current) => ({ ...current, lancamentos: markConflicts(current.lancamentos.filter((item) => item.id !== id)) }));
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

  function resetSamples() {
    setState(createDefaultState());
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
    resetSamples,
  };
}
