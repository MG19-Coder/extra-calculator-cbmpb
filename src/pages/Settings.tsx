import type { AppState, ValoresConfig } from "../types";
import { Field, inputClass, primaryButton, Section } from "../components/ui";

export function ValueSettings({ valores, onSave }: { valores: ValoresConfig; onSave: (valores: ValoresConfig) => void }) {
  function setValue(key: keyof ValoresConfig, value: string) {
    onSave({ ...valores, [key]: Number(value) });
  }

  const fields: Array<[keyof ValoresConfig, string]> = [
    ["limiteMensalAjudaCusto", "Cota ajuda de custo"],
    ["limiteMensalHoraAula", "Teto hora-aula"],
  ];

  return (
    <Section title="Configuracoes de valores">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([key, label]) => (
          <Field key={key} label={label}>
            <input className={inputClass} type="number" step="0.01" value={valores[key]} onChange={(event) => setValue(key, event.target.value)} />
          </Field>
        ))}
      </div>
    </Section>
  );
}

export function PayTablesView({ state }: { state: AppState }) {
  return (
    <Section title="Tabela de valores da planilha">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <th className="p-2">Graduacao</th>
              <th className="p-2">Normal/h</th>
              <th className="p-2">Normal 24h</th>
              <th className="p-2">Majorado/h</th>
              <th className="p-2">Majorado 24h</th>
              <th className="p-2">CFSD</th>
              <th className="p-2">CFS</th>
              <th className="p-2">CFO</th>
            </tr>
          </thead>
          <tbody>
            {state.payTables.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="p-2 font-semibold">{row.graduacao}</td>
                <td className="p-2">R$ {row.valorHoraExtraNormal.toFixed(2)}</td>
                <td className="p-2">R$ {row.valorExtraNormal24h.toFixed(2)}</td>
                <td className="p-2">R$ {row.valorHoraExtraMajorado.toFixed(2)}</td>
                <td className="p-2">R$ {row.valorExtraMajorado24h.toFixed(2)}</td>
                <td className="p-2">R$ {row.valorHoraAulaCFSD.toFixed(2)}</td>
                <td className="p-2">R$ {row.valorHoraAulaCFS.toFixed(2)}</td>
                <td className="p-2">R$ {row.valorHoraAulaCFO.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function CalendarImportPlaceholder() {
  return (
    <Section title="Importar Google Agenda">
      <div className="grid gap-3">
        <p className="text-sm text-slate-600">Estrutura preparada para importacao futura por OAuth. No MVP, cadastre manualmente ou use a escala 24x48.</p>
        <button className={primaryButton} type="button" disabled>Importar Google Agenda em breve</button>
      </div>
    </Section>
  );
}

export function SettingsPage({ state, onValues }: { state: AppState; onValues: (values: ValoresConfig) => void }) {
  return (
    <div className="grid gap-4">
      <ValueSettings valores={state.valores} onSave={onValues} />
      <PayTablesView state={state} />
      <CalendarImportPlaceholder />
    </div>
  );
}
