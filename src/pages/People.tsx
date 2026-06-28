import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { AppState, Pessoa } from "../types";
import { Field, iconButton, inputClass, primaryButton, Section, secondaryButton } from "../components/ui";

function newPessoa(): Pessoa {
  const now = new Date().toISOString();
  return {
    id: `pessoa-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
    nome: "",
    graduacao: "2º SGT",
    createdAt: now,
    updatedAt: now,
  };
}

export function People({
  state,
  onSave,
  onRemove,
  onSelect,
}: {
  state: AppState;
  onSave: (pessoa: Pessoa) => void;
  onRemove: (id: string, force?: boolean) => void;
  onSelect: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Pessoa>(() => newPessoa());
  const graduacoes = state.payTables.map((item) => item.graduacao);

  function editPessoa(pessoa: Pessoa) {
    setDraft(pessoa);
  }

  function save() {
    if (!draft.nome.trim()) return;
    onSave({ ...draft, nome: draft.nome.trim() });
    setDraft(newPessoa());
  }

  function remove(pessoa: Pessoa) {
    const hasLaunches = state.lancamentos.some((item) => item.pessoaId === pessoa.id);
    if (hasLaunches && !window.confirm(`Existem lancamentos de ${pessoa.nome}. Excluir mesmo assim?`)) return;
    onRemove(pessoa.id, hasLaunches);
  }

  return (
    <Section title="Pessoas">
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <Field label="Nome">
            <input className={inputClass} value={draft.nome} onChange={(event) => setDraft({ ...draft, nome: event.target.value })} />
          </Field>
          <Field label="Graduacao">
            <select className={inputClass} value={draft.graduacao} onChange={(event) => setDraft({ ...draft, graduacao: event.target.value })}>
              {graduacoes.map((graduacao) => <option key={graduacao} value={graduacao}>{graduacao}</option>)}
            </select>
          </Field>
          <button className={primaryButton} type="button" onClick={save}>Salvar pessoa</button>
        </div>

        <div className="grid gap-2">
          {state.pessoas.map((pessoa) => {
            const active = pessoa.id === state.activePessoaId;
            return (
              <article key={pessoa.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${active ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
                <div>
                  <p className="text-sm font-semibold text-ink">{pessoa.nome}</p>
                  <p className="text-xs text-slate-600">{pessoa.graduacao}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={secondaryButton} type="button" onClick={() => onSelect(pessoa.id)}>{active ? "Ativa" : "Selecionar"}</button>
                  <button className={secondaryButton} type="button" onClick={() => editPessoa(pessoa)}>Editar</button>
                  <button className={iconButton} type="button" onClick={() => remove(pessoa)} aria-label="Excluir pessoa"><Trash2 size={18} /></button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
