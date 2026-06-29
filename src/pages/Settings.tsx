import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import type { AppState, ValoresConfig } from "../types";
import { Field, inputClass, primaryButton, secondaryButton, Section } from "../components/ui";
import { createExportFileName, createExportPayload, parseImportedScale } from "../utils/dataTransferUtils";
import { formatDateTime } from "../utils/dateUtils";
import { FIXED_CLASS_VALUES } from "../utils/payTableUtils";

const LAST_EXPORT_KEY = "controle-extras-bm:last-export";
const LAST_IMPORT_KEY = "controle-extras-bm:last-import";
const IMPORT_BACKUP_KEY = "controle-extras-bm:backup-before-import";

function downloadJson(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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
                <td className="p-2">R$ {FIXED_CLASS_VALUES.CFSD.toFixed(2)}</td>
                <td className="p-2">R$ {FIXED_CLASS_VALUES.CFS.toFixed(2)}</td>
                <td className="p-2">R$ {FIXED_CLASS_VALUES.CFO.toFixed(2)}</td>
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

export function DataManagement({
  state,
  onImport,
}: {
  state: AppState;
  onImport: (state: AppState, mode: "replace" | "merge") => { importedLaunches: number; skippedDuplicates: number };
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const [message, setMessage] = useState("");
  const [lastExport, setLastExport] = useState(() => localStorage.getItem(LAST_EXPORT_KEY) ?? "");
  const [lastImport, setLastImport] = useState(() => localStorage.getItem(LAST_IMPORT_KEY) ?? "");

  function exportScale(kind: "scale" | "backup" = "scale") {
    const payload = createExportPayload(state);
    const fileName = kind === "backup" ? `backup-escala-domar-${new Date().toISOString().slice(0, 10)}.json` : createExportFileName(state);
    downloadJson(fileName, payload);
    const now = new Date().toISOString();
    localStorage.setItem(LAST_EXPORT_KEY, now);
    setLastExport(now);
    setMessage(kind === "backup" ? "Backup exportado com sucesso." : "Escala exportada com sucesso.");
  }

  async function handleFile(file: File) {
    try {
      const imported = parseImportedScale(await file.text());
      setPendingImport(imported);
      setPendingFileName(file.name);
      setMessage("Arquivo valido. Escolha como deseja importar.");
    } catch (error) {
      setPendingImport(null);
      setPendingFileName("");
      setMessage(error instanceof Error ? error.message : "Nao foi possivel importar o arquivo.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function applyImport(mode: "replace" | "merge") {
    if (!pendingImport) return;
    if (mode === "replace" && !window.confirm("Os dados atuais serao substituidos pela escala importada. Deseja continuar?")) return;

    localStorage.setItem(IMPORT_BACKUP_KEY, JSON.stringify(createExportPayload(state)));
    const result = onImport(pendingImport, mode);
    const now = new Date().toISOString();
    localStorage.setItem(LAST_IMPORT_KEY, now);
    setLastImport(now);
    setPendingImport(null);
    setPendingFileName("");
    setMessage(`Importacao concluida. ${result.importedLaunches} lancamento(s) importado(s). ${result.skippedDuplicates} lancamento(s) ignorado(s) por duplicidade.`);
  }

  return (
    <Section title="Gerenciamento de dados">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <button className={`${primaryButton} w-full sm:w-auto`} type="button" onClick={() => exportScale("scale")}><Download size={18} /> Exportar escala</button>
          <button className={`${secondaryButton} w-full sm:w-auto`} type="button" onClick={() => fileRef.current?.click()}><Upload size={18} /> Importar escala</button>
          <button className={`${secondaryButton} w-full sm:w-auto`} type="button" onClick={() => exportScale("backup")}>Exportar backup</button>
          <input
            ref={fileRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>

        <div className="grid gap-1 text-sm text-slate-600">
          <p>Ultima exportacao: {lastExport ? formatDateTime(lastExport) : "nenhuma"}</p>
          <p>Ultima importacao: {lastImport ? formatDateTime(lastImport) : "nenhuma"}</p>
        </div>

        {pendingImport && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-950">Arquivo selecionado: {pendingFileName}</p>
            <p className="mt-1 text-sm text-amber-900">Antes de importar, um backup automatico sera salvo neste navegador.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={primaryButton} type="button" onClick={() => applyImport("replace")}>Substituir dados atuais</button>
              <button className={secondaryButton} type="button" onClick={() => applyImport("merge")}>Mesclar com dados existentes</button>
              <button className={secondaryButton} type="button" onClick={() => setPendingImport(null)}>Cancelar</button>
            </div>
          </div>
        )}

        {message && <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}
      </div>
    </Section>
  );
}

export function SettingsPage({
  state,
  onValues,
  onImport,
  showDataManagement = true,
}: {
  state: AppState;
  onValues: (values: ValoresConfig) => void;
  onImport: (state: AppState, mode: "replace" | "merge") => { importedLaunches: number; skippedDuplicates: number };
  showDataManagement?: boolean;
}) {
  return (
    <div className="grid gap-4">
      {showDataManagement && <DataManagement state={state} onImport={onImport} />}
      <ValueSettings valores={state.valores} onSave={onValues} />
      <PayTablesView state={state} />
      <CalendarImportPlaceholder />
    </div>
  );
}
