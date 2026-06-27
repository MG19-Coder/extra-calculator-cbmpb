import { Copy } from "lucide-react";
import type { AppState, MonthlyTotals } from "../types";
import { secondaryButton, Section } from "../components/ui";
import { generateWhatsAppReport } from "../utils/reportUtils";

export function Report({ state, totals }: { state: AppState; totals: MonthlyTotals }) {
  const text = generateWhatsAppReport(state, totals);
  return (
    <Section title="Relatorio mensal para WhatsApp">
      <div className="grid gap-3">
        <button className={secondaryButton} type="button" onClick={() => navigator.clipboard.writeText(text)}><Copy size={18} /> Copiar texto</button>
        <textarea className="min-h-96 rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-sm text-slate-800" value={text} readOnly />
      </div>
    </Section>
  );
}
