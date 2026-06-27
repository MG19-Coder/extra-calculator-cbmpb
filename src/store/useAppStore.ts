import { useEffect, useMemo, useState } from "react";
import type { AppState, Contracheque, FeriadoEstadual, Lancamento, Militar, ValoresConfig } from "../types";
import { createDefaultState } from "./defaults";
import { markConflicts } from "../utils/conflictUtils";
import { mergeAutomaticHolidays } from "../utils/holidayUtils";

const STORAGE_KEY = "controle-extras-bm:v1";

function readState(): AppState {
  const fallback = createDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = { ...fallback, ...JSON.parse(raw) } as AppState;
    const selectedYear = Number(parsed.selectedMonth.slice(0, 4));
    return {
      ...parsed,
      feriados: mergeAutomaticHolidays(parsed.feriados, [selectedYear - 1, selectedYear, selectedYear + 1]),
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

  function addLaunches(items: Lancamento[]) {
    setState((current) => ({ ...current, lancamentos: markConflicts([...current.lancamentos, ...items]) }));
  }

  function updateLaunch(item: Lancamento) {
    setState((current) => ({ ...current, lancamentos: markConflicts(current.lancamentos.map((launch) => launch.id === item.id ? item : launch)) }));
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
