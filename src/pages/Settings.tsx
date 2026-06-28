import type { AppState, Militar, ValoresConfig } from "../types";
import { Field, inputClass, primaryButton, Section } from "../components/ui";

export function ValueSettings({ valores, onSave }: { valores: ValoresConfig; onSave: (valores: ValoresConfig) => void }) {
  function setValue(key: keyof ValoresConfig, value: string) {
    onSave({ ...valores, [key]: Number(value) });
  }

  const fields: Array<[keyof ValoresConfig, string]> = [
    ["extraNormalHora", "Extra normal por hora"],
    ["extraNormal12h", "Extra normal 12h"],
    ["extraNormal24h", "Extra normal 24h"],
    ["extraMajoradoHora", "Extra majorado por hora"],
    ["extraMajorado12h", "Extra majorado 12h"],
    ["extraMajorado24h", "Extra majorado 24h"],
    ["horaAulaCFSD", "Hora-aula CFSD"],
    ["horaAulaCFS", "Hora-aula CFS"],
    ["horaAulaCFO", "Hora-aula CFO"],
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

export function MilitarSettings({ militar, onSave }: { militar: Militar; onSave: (militar: Militar) => void }) {
  function setValue(key: keyof Militar, value: string) {
    onSave({ ...militar, [key]: value });
  }

  return (
    <Section title="Configuracoes do militar">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome"><input className={inputClass} value={militar.nome} onChange={(event) => setValue("nome", event.target.value)} /></Field>
        <Field label="Posto/graduacao"><input className={inputClass} value={militar.postoGraduacao} onChange={(event) => setValue("postoGraduacao", event.target.value)} /></Field>
        <Field label="Matricula"><input className={inputClass} value={militar.matricula} onChange={(event) => setValue("matricula", event.target.value)} /></Field>
        <Field label="Unidade"><input className={inputClass} value={militar.unidade} onChange={(event) => setValue("unidade", event.target.value)} /></Field>
        <Field label="Funcao"><input className={inputClass} value={militar.funcao} onChange={(event) => setValue("funcao", event.target.value)} /></Field>
        <Field label="Observacoes"><textarea className={inputClass} value={militar.observacoes} onChange={(event) => setValue("observacoes", event.target.value)} /></Field>
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

export function SettingsPage({ state, onValues, onMilitar }: { state: AppState; onValues: (values: ValoresConfig) => void; onMilitar: (militar: Militar) => void }) {
  return (
    <div className="grid gap-4">
      <ValueSettings valores={state.valores} onSave={onValues} />
      <MilitarSettings militar={state.militar} onSave={onMilitar} />
      <CalendarImportPlaceholder />
    </div>
  );
}
