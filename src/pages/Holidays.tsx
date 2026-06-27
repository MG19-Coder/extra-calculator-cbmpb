import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { FeriadoEstadual } from "../types";
import { Field, iconButton, inputClass, primaryButton, Section } from "../components/ui";

export function Holidays({ feriados, onSave, onRemove }: { feriados: FeriadoEstadual[]; onSave: (feriado: FeriadoEstadual) => void; onRemove: (id: string) => void }) {
  const [draft, setDraft] = useState<FeriadoEstadual>({
    id: "",
    data: "2026-08-05",
    nome: "",
    recorrente: true,
    observacoes: "",
  });

  function submit() {
    onSave({ ...draft, id: draft.id || `feriado-${Date.now()}` });
    setDraft({ id: "", data: "2026-08-05", nome: "", recorrente: true, observacoes: "" });
  }

  return (
    <Section title="Feriados nacionais e estaduais">
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Data"><input className={inputClass} type="date" value={draft.data} onChange={(event) => setDraft({ ...draft, data: event.target.value })} /></Field>
          <Field label="Nome"><input className={inputClass} value={draft.nome} onChange={(event) => setDraft({ ...draft, nome: event.target.value })} /></Field>
          <Field label="Recorrente">
            <select className={inputClass} value={draft.recorrente ? "sim" : "nao"} onChange={(event) => setDraft({ ...draft, recorrente: event.target.value === "sim" })}>
              <option value="sim">Sim</option>
              <option value="nao">Nao</option>
            </select>
          </Field>
          <button className={primaryButton} type="button" onClick={submit}>Salvar feriado</button>
        </div>

        <div className="grid gap-2">
          {feriados.map((feriado) => (
            <div key={feriado.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-sm font-semibold text-ink">{feriado.nome || "Feriado sem nome"}</p>
                <p className="text-xs text-slate-600">{feriado.data} {feriado.recorrente ? "- recorrente" : ""}</p>
              </div>
              <button className={iconButton} type="button" onClick={() => onRemove(feriado.id)} aria-label="Excluir feriado"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
