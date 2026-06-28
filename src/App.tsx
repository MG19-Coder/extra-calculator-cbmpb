import { BarChart3, CalendarDays, ClipboardCheck, FileText, ListChecks, Menu, PlusCircle, Settings, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { LaunchList } from "./pages/LaunchList";
import { NewLaunch } from "./pages/NewLaunch";
import { ScaleGenerator } from "./pages/ScaleGenerator";
import { CalendarMonth } from "./pages/CalendarMonth";
import { Report } from "./pages/Report";
import { Paycheck } from "./pages/Paycheck";
import { SettingsPage } from "./pages/Settings";
import { Holidays } from "./pages/Holidays";
import { People } from "./pages/People";
import { useAppStore } from "./store/useAppStore";
import { getMonthName } from "./utils/dateUtils";
import { calculateMonthlyTotals } from "./utils/quotaUtils";
import { secondaryButton } from "./components/ui";

type Tab = "pessoas" | "dashboard" | "lancamentos" | "novo" | "escala" | "calendario" | "relatorio" | "contracheque" | "config" | "feriados";

const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
  { id: "pessoas", label: "Pessoas", icon: Users },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "lancamentos", label: "Lancamentos", icon: ListChecks },
  { id: "novo", label: "Novo", icon: PlusCircle },
  { id: "escala", label: "Escala 24x48", icon: Sparkles },
  { id: "calendario", label: "Calendario", icon: CalendarDays },
  { id: "relatorio", label: "WhatsApp", icon: FileText },
  { id: "contracheque", label: "Contracheque", icon: ClipboardCheck },
  { id: "config", label: "Configuracoes", icon: Settings },
  { id: "feriados", label: "Feriados", icon: CalendarDays },
];

function App() {
  const store = useAppStore();
  const { state } = store;
  const [tab, setTab] = useState<Tab>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const totals = useMemo(() => calculateMonthlyTotals(state), [state]);
  const activePessoa = state.pessoas.find((item) => item.id === state.activePessoaId) ?? state.pessoas[0];
  const monthItems = state.lancamentos.filter((item) => (item.competenciaImplantacao === state.selectedMonth || item.competenciaServico === state.selectedMonth) && item.pessoaId === state.activePessoaId);

  const content = {
    pessoas: <People state={state} onSave={store.upsertPessoa} onRemove={store.removePessoa} onSelect={store.setActivePessoa} />,
    dashboard: <Dashboard state={state} totals={totals} />,
    lancamentos: <LaunchList items={monthItems} onRemove={store.removeLaunch} />,
    novo: <NewLaunch state={state} onAdd={store.addLaunches} />,
    escala: <ScaleGenerator state={state} onAdd={store.addLaunches} />,
    calendario: <CalendarMonth competencia={state.selectedMonth} items={state.lancamentos} feriados={state.feriados} valores={state.valores} activePessoaId={state.activePessoaId} onUpdate={store.updateLaunch} />,
    relatorio: <Report state={state} totals={totals} />,
    contracheque: <Paycheck state={state} totals={totals} onSave={store.upsertPaycheck} />,
    config: <SettingsPage state={state} onValues={store.updateValues} />,
    feriados: <Holidays feriados={state.feriados} onSave={store.upsertHoliday} onRemove={store.removeHoliday} />,
  }[tab];

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <header className="border-b border-slate-200 bg-ink text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-200">Controle pessoal</p>
            <h1 className="text-2xl font-bold">Controle de Extras BM</h1>
            <p className="mt-1 text-sm text-slate-300">{activePessoa?.nome ?? "Sem pessoa"} - {activePessoa?.graduacao ?? ""} · {getMonthName(state.selectedMonth)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="min-h-11 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" value={state.activePessoaId} onChange={(event) => store.setActivePessoa(event.target.value)}>
              {state.pessoas.map((pessoa) => <option key={pessoa.id} value={pessoa.id} className="text-ink">{pessoa.nome}</option>)}
            </select>
            <input className="min-h-11 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white" type="month" value={state.selectedMonth} onChange={(event) => store.setSelectedMonth(event.target.value)} />
            <button className={secondaryButton} type="button" onClick={store.resetSamples}>Recarregar exemplos</button>
            <button className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/10 lg:hidden" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Abrir menu"><Menu size={20} /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[240px_1fr]">
        <nav className={`${menuOpen ? "grid" : "hidden"} gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-soft lg:grid lg:self-start`}>
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" onClick={() => { setTab(item.id); setMenuOpen(false); }} className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition ${tab === item.id ? "bg-rescue text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <main>{content}</main>
      </div>
    </div>
  );
}

export default App;
