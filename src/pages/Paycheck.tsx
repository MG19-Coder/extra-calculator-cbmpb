import { useMemo, useState } from "react";
import type { AppState, Contracheque, MonthlyTotals } from "../types";
import { Field, inputClass, primaryButton, Section, Stat } from "../components/ui";
import { formatCurrency } from "../utils/dateUtils";
import { comparePaycheck } from "../utils/paycheckUtils";

export function Paycheck({ state, totals, onSave }: { state: AppState; totals: MonthlyTotals; onSave: (item: Contracheque) => void }) {
  const existing = state.contracheques.find((item) => item.competencia === state.selectedMonth);
  const [item, setItem] = useState<Contracheque>(existing ?? {
    competencia: state.selectedMonth,
    ajudaCustoOperacional: 0,
    magisterioCFSD: 0,
    magisterioCFS: 0,
    magisterioCFO: 0,
    outrosValores: 0,
    observacoes: "",
  });
  const status = useMemo(() => comparePaycheck(totals, existing), [totals, existing]);

  function setNumber(key: keyof Contracheque, value: string) {
    setItem((current) => ({ ...current, [key]: Number(value) }));
  }

  return (
    <Section title="Conferencia de contracheque">
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Status" value={status} tone={status === "CONFERIDO" ? "good" : status === "DIVERGENTE" ? "warn" : "neutral"} />
          <Stat label="Previsto" value={formatCurrency(totals.ajudaCusto.valorTotal + totals.horaAula.valorTotal)} />
          <Stat label="Diferenca" value={formatCurrency(totals.diferenca.total)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Competencia"><input className={inputClass} type="month" value={item.competencia} onChange={(event) => setItem({ ...item, competencia: event.target.value })} /></Field>
          <Field label="Ajuda Custo Operacional PM"><input className={inputClass} type="number" step="0.01" value={item.ajudaCustoOperacional} onChange={(event) => setNumber("ajudaCustoOperacional", event.target.value)} /></Field>
          <Field label="Magisterio CFSD"><input className={inputClass} type="number" step="0.01" value={item.magisterioCFSD} onChange={(event) => setNumber("magisterioCFSD", event.target.value)} /></Field>
          <Field label="Magisterio CFS"><input className={inputClass} type="number" step="0.01" value={item.magisterioCFS} onChange={(event) => setNumber("magisterioCFS", event.target.value)} /></Field>
          <Field label="Magisterio CFO"><input className={inputClass} type="number" step="0.01" value={item.magisterioCFO} onChange={(event) => setNumber("magisterioCFO", event.target.value)} /></Field>
          <Field label="Outros valores"><input className={inputClass} type="number" step="0.01" value={item.outrosValores} onChange={(event) => setNumber("outrosValores", event.target.value)} /></Field>
        </div>
        <Field label="Observacoes"><textarea className={inputClass} value={item.observacoes} onChange={(event) => setItem({ ...item, observacoes: event.target.value })} /></Field>
        <button className={primaryButton} type="button" onClick={() => onSave(item)}>Salvar conferencia</button>
      </div>
    </Section>
  );
}
