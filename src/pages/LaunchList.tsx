import { Trash2 } from "lucide-react";
import type { Lancamento } from "../types";
import { formatCurrency, formatDateTime } from "../utils/dateUtils";
import { iconButton, Section } from "../components/ui";

export function LaunchList({ items, onRemove }: { items: Lancamento[]; onRemove: (id: string) => void }) {
  return (
    <Section title="Lancamentos">
      <div className="grid gap-3">
        {items.length === 0 && <p className="text-sm text-slate-500">Nenhum lancamento para o mes selecionado.</p>}
        {items.map((item) => (
          <article key={item.id} className={`rounded-lg border p-3 ${item.possuiConflito ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{item.titulo}</p>
                <p className="mt-1 text-xs text-slate-600">{formatDateTime(item.dataHoraInicio)} ate {formatDateTime(item.dataHoraFim)}</p>
              </div>
              <button className={iconButton} type="button" onClick={() => onRemove(item.id)} aria-label="Excluir lancamento">
                <Trash2 size={18} />
              </button>
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
              <span>Tipo: <strong>{item.tipo}</strong></span>
              <span>Pagaveis: <strong>{item.horasPagaveis}h</strong></span>
              <span>Aula: <strong>{item.horasAula}h</strong></span>
              <span>Valor: <strong>{formatCurrency(item.valorTotal)}</strong></span>
            </div>
            {item.possuiConflito && <p className="mt-2 text-sm font-medium text-red-800">Conflito com {item.idsConflitantes.length} lancamento(s).</p>}
          </article>
        ))}
      </div>
    </Section>
  );
}
