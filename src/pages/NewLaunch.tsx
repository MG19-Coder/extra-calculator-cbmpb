import { CheckCircle2, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AppState, Lancamento, SubtipoHoraAula } from "../types";
import { Field, inputClass, primaryButton, Section } from "../components/ui";
import { createExtraB5, createHoraAula, createMgExtra, createMgOrdinario, createPendenciaAnterior } from "../utils/launchFactory";
import { getActivePessoa, getPayTableForGraduacao, payTableToValues } from "../utils/payTableUtils";

export function NewLaunch({ state, onAdd }: { state: AppState; onAdd: (items: Lancamento[]) => void }) {
  const pessoa = getActivePessoa(state.pessoas, state.activePessoaId);
  const payTable = getPayTableForGraduacao(state.payTables, pessoa.graduacao);
  const valores = payTableToValues(payTable, state.valores);
  const [preset, setPreset] = useState("MG_ORDINARIO");
  const [serviceDate, setServiceDate] = useState(`${state.selectedMonth}-10`);
  const [aulaDate, setAulaDate] = useState(`${state.selectedMonth}-10`);
  const [horaInicioAula, setHoraInicioAula] = useState("00:00");
  const [horaFimAula, setHoraFimAula] = useState("15:00");
  const [competenciaImplantacaoAula, setCompetenciaImplantacaoAula] = useState(state.selectedMonth);
  const [subtipoHoraAula, setSubtipoHoraAula] = useState<SubtipoHoraAula>("CFS");
  const [disciplina, setDisciplina] = useState("Instrucao");
  const [horasNormais, setHorasNormais] = useState(12);
  const [horasMajoradas, setHorasMajoradas] = useState(12);
  const [horasPagaveis, setHorasPagaveis] = useState(24);
  const [origemMes, setOrigemMes] = useState("05");
  const [origemAno, setOrigemAno] = useState("2026");
  const [observacaoPendencia, setObservacaoPendencia] = useState("");
  const [notice, setNotice] = useState("");
  const formRef = useRef<HTMLDivElement | null>(null);
  const serviceDateRef = useRef<HTMLInputElement | null>(null);
  const aulaDateRef = useRef<HTMLInputElement | null>(null);
  const pendenciaMesRef = useRef<HTMLInputElement | null>(null);

  function changePreset(value: string) {
    setPreset(value);
  }

  useEffect(() => {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (preset === "HORA_AULA") {
        aulaDateRef.current?.focus({ preventScroll: true });
      } else if (preset === "PENDENCIA_ANTERIOR") {
        pendenciaMesRef.current?.focus({ preventScroll: true });
      } else {
        serviceDateRef.current?.focus({ preventScroll: true });
      }
    }, 50);
  }, [preset]);

  function submit() {
    let item: Lancamento;
    if (preset === "MG_ORDINARIO") {
      item = createMgOrdinario(serviceDate, valores, state.feriados, "MG Ordinario", { pessoa });
    } else if (preset === "MG_EXTRA") {
      item = createMgExtra(serviceDate, valores, state.feriados, "MG Extra", { pessoa });
    } else if (preset === "EXTRA_ADMINISTRATIVO") {
      item = createExtraB5({ serviceDate, valores, feriados: state.feriados, pessoa });
    } else if (preset === "PENDENCIA_ANTERIOR") {
      item = createPendenciaAnterior({ competenciaImplantacao: state.selectedMonth, mesOrigem: origemMes, anoOrigem: origemAno, horas: horasPagaveis, tipo: horasMajoradas > 0 ? "MAJORADO" : "NORMAL", valores, pessoa, observacao: observacaoPendencia });
    } else {
      const inicio = `${aulaDate}T${horaInicioAula}`;
      const fim = `${aulaDate}T${horaFimAula}`;
      item = createHoraAula({ inicio, fim, subtipo: subtipoHoraAula, disciplina, competenciaImplantacao: competenciaImplantacaoAula, valores, pessoa });
    }
    onAdd([item]);
    setNotice(`${item.titulo} lancado com sucesso. ${item.horasPagaveis}h registradas para ${item.competenciaImplantacao}.`);
  }

  const isAula = preset === "HORA_AULA";

  return (
    <Section title="Novo lancamento">
      <div ref={formRef} className="grid gap-4 pb-6">
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          Pessoa ativa: <strong>{pessoa.nome}</strong> - {pessoa.graduacao}
        </p>
        <Field label="Preset rapido">
          <select className={inputClass} value={preset} onChange={(event) => changePreset(event.target.value)}>
            <option value="MG_ORDINARIO">MG Ordinario</option>
            <option value="MG_EXTRA">MG Extra</option>
            <option value="EXTRA_ADMINISTRATIVO">Extra Administrativo</option>
            <option value="HORA_AULA">Hora-aula</option>
            <option value="PENDENCIA_ANTERIOR">Pendencia anterior</option>
          </select>
        </Field>

        {!isAula && preset !== "PENDENCIA_ANTERIOR" && (
          <Field label="Data da prontidao/servico">
            <input ref={serviceDateRef} className={inputClass} type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} />
          </Field>
        )}

        {isAula && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dia da aula"><input ref={aulaDateRef} className={inputClass} type="date" value={aulaDate} onChange={(event) => setAulaDate(event.target.value)} /></Field>
            <Field label="Competencia de implantacao"><input className={inputClass} type="month" value={competenciaImplantacaoAula} onChange={(event) => setCompetenciaImplantacaoAula(event.target.value)} /></Field>
            <Field label="Inicio da aula"><input className={inputClass} type="time" value={horaInicioAula} onChange={(event) => setHoraInicioAula(event.target.value)} /></Field>
            <Field label="Fim da aula"><input className={inputClass} type="time" value={horaFimAula} onChange={(event) => setHoraFimAula(event.target.value)} /></Field>
            <Field label="Curso/tipo de aula">
              <select className={inputClass} value={subtipoHoraAula} onChange={(event) => setSubtipoHoraAula(event.target.value as SubtipoHoraAula)}>
                <option value="CFSD">CFSD</option>
                <option value="CFS">CFS</option>
                <option value="CFO">CFO</option>
              </select>
            </Field>
            <Field label="Disciplina"><input className={inputClass} value={disciplina} onChange={(event) => setDisciplina(event.target.value)} /></Field>
          </div>
        )}

        {preset === "PENDENCIA_ANTERIOR" && (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Mes origem"><input ref={pendenciaMesRef} className={inputClass} value={origemMes} onChange={(event) => setOrigemMes(event.target.value.padStart(2, "0").slice(-2))} /></Field>
              <Field label="Ano origem"><input className={inputClass} value={origemAno} onChange={(event) => setOrigemAno(event.target.value)} /></Field>
              <Field label="Horas"><input className={inputClass} type="number" value={horasPagaveis} onChange={(event) => setHorasPagaveis(Number(event.target.value))} /></Field>
              <Field label="Tipo">
                <select className={inputClass} value={horasMajoradas > 0 ? "MAJORADO" : "NORMAL"} onChange={(event) => { setHorasMajoradas(event.target.value === "MAJORADO" ? horasPagaveis : 0); setHorasNormais(event.target.value === "NORMAL" ? horasPagaveis : 0); }}>
                  <option value="NORMAL">Normal</option>
                  <option value="MAJORADO">Majorado</option>
                </select>
              </Field>
            </div>
            <Field label="Observacao">
              <textarea className={inputClass} rows={3} value={observacaoPendencia} onChange={(event) => setObservacaoPendencia(event.target.value)} placeholder="Ex.: Extra implantado parcialmente" />
            </Field>
          </div>
        )}

        <button className={primaryButton} type="button" onClick={submit}><Plus size={18} /> Adicionar</button>
        {notice && (
          <p className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800" role="status">
            <CheckCircle2 size={18} /> {notice}
          </p>
        )}
      </div>
    </Section>
  );
}
