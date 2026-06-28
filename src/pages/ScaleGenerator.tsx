import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import type { AppState, Lancamento } from "../types";
import { Field, inputClass, primaryButton, Section } from "../components/ui";
import { generateScale24x48 } from "../utils/scaleUtils";
import { getActivePessoa, getPayTableForGraduacao, payTableToValues } from "../utils/payTableUtils";

export function ScaleGenerator({ state, onAdd }: { state: AppState; onAdd: (items: Lancamento[]) => void }) {
  const pessoa = getActivePessoa(state.pessoas, state.activePessoaId);
  const valores = payTableToValues(getPayTableForGraduacao(state.payTables, pessoa.graduacao), state.valores);
  const [firstServiceDate, setFirstServiceDate] = useState(`${state.selectedMonth}-01`);
  const [generated, setGenerated] = useState(0);

  function submit() {
    const items = generateScale24x48({ firstServiceDate, competencia: state.selectedMonth, valores, feriados: state.feriados, pessoa });
    onAdd(items);
    setGenerated(items.length);
  }

  return (
    <Section title="Gerar escala 24x48">
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Primeira prontidao"><input className={inputClass} type="date" value={firstServiceDate} onChange={(event) => setFirstServiceDate(event.target.value)} /></Field>
          <Field label="Inicio real padrao"><input className={inputClass} value="18:00 do dia anterior" disabled /></Field>
          <Field label="Fim real padrao"><input className={inputClass} value="18:00 do dia do servico" disabled /></Field>
        </div>
        <button className={primaryButton} type="button" onClick={submit}><CalendarPlus size={18} /> Gerar MG Ordinario no mes</button>
        {generated > 0 && <p className="text-sm font-medium text-emerald-700">{generated} servico(s) gerado(s).</p>}
      </div>
    </Section>
  );
}
