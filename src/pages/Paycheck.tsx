import { useMemo, useState } from "react";
import type { AppState, Contracheque, MonthlyTotals } from "../types";
import { Field, inputClass, primaryButton, Section, Stat } from "../components/ui";
import { comparePaycheck } from "../utils/paycheckUtils";

export function Paycheck({ state, totals, onSave }: { state: AppState; totals: MonthlyTotals; onSave: (item: Contracheque) => void }) {
  const existing = state.contracheques.find((item) => item.competencia === state.selectedMonth);
  const [item, setItem] = useState<Contracheque>(existing ?? {
    competencia: state.selectedMonth,
    ajudaCustoOperacional: 0,
    horasNormaisImplantadas: 0,
    horasMajoradasImplantadas: 0,
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
    <Section title="Controle de horas implantadas">
      <div className="grid gap-4">
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          Use esta tela para registrar as horas que ja foram implantadas no sistema de pagamento. Horas normais e majoradas contam na cota principal de 288h; magisterio tem limite separado de 40h.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Status" value={status} tone={status === "CONFERIDO" ? "good" : status === "DIVERGENTE" ? "warn" : "neutral"} />
          <Stat label="Principal implantado" value={`${totals.implantadoHoras.ajudaCusto}h`} />
          <Stat label="Magisterio implantado" value={`${totals.implantadoHoras.horaAula}h`} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Principal lancado no mes" value={`${totals.ajudaCusto.horasTotal}h`} />
          <Stat label="Principal implantavel" value={`${totals.ajudaCusto.horasImplantaveis}h`} tone="good" />
          <Stat label="Principal pendente/excedente" value={`${totals.pendenteHoras.ajudaCusto + totals.ajudaCusto.horasExcedentes}h`} tone={totals.pendenteHoras.ajudaCusto || totals.ajudaCusto.horasExcedentes ? "warn" : "neutral"} />
          <Stat label="Magisterio saldo disponivel" value={`${totals.horaAula.horasRestantes}h`} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Competencia"><input className={inputClass} type="month" value={item.competencia} onChange={(event) => setItem({ ...item, competencia: event.target.value })} /></Field>
          <Field label="Horas normais implantadas"><input className={inputClass} type="number" step="0.5" value={item.horasNormaisImplantadas ?? 0} onChange={(event) => setNumber("horasNormaisImplantadas", event.target.value)} /></Field>
          <Field label="Horas majoradas implantadas"><input className={inputClass} type="number" step="0.5" value={item.horasMajoradasImplantadas ?? 0} onChange={(event) => setNumber("horasMajoradasImplantadas", event.target.value)} /></Field>
          <Field label="Magisterio CFSD implantado"><input className={inputClass} type="number" step="0.5" value={item.magisterioCFSD} onChange={(event) => setNumber("magisterioCFSD", event.target.value)} /></Field>
          <Field label="Magisterio CFS implantado"><input className={inputClass} type="number" step="0.5" value={item.magisterioCFS} onChange={(event) => setNumber("magisterioCFS", event.target.value)} /></Field>
          <Field label="Magisterio CFO implantado"><input className={inputClass} type="number" step="0.5" value={item.magisterioCFO} onChange={(event) => setNumber("magisterioCFO", event.target.value)} /></Field>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <p className="font-semibold text-ink">Ainda faltam implantar</p>
          <p>Normais: {totals.pendenteHoras.normais}h</p>
          <p>Majoradas: {totals.pendenteHoras.majoradas}h</p>
          <p>Magisterio CFSD: {totals.pendenteHoras.cfsd}h</p>
          <p>Magisterio CFS: {totals.pendenteHoras.cfs}h</p>
          <p>Magisterio CFO: {totals.pendenteHoras.cfo}h</p>
        </div>

        <Field label="Observacoes"><textarea className={inputClass} value={item.observacoes} onChange={(event) => setItem({ ...item, observacoes: event.target.value })} /></Field>
        <button className={primaryButton} type="button" onClick={() => onSave(item)}>Salvar horas implantadas</button>
      </div>
    </Section>
  );
}
