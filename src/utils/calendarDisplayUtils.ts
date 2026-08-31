import type { Lancamento } from "../types";
import { addDays, formatDate, parseLocalDate, toDateInput } from "./dateUtils";
import { getHoraAulaSubtipo } from "./launchCompatibility";

export type PeriodoCalendario = {
  id: string;
  lancamento: Lancamento;
  data: string;
  titulo: string;
  horas: number;
  exibirHoras: boolean;
  horarioInicio?: string;
  horarioFim?: string;
  observacao?: string;
};

function previousDay(date: string): string {
  return toDateInput(addDays(parseLocalDate(date), -1));
}

function formatShortDate(date: string): string {
  return formatDate(date);
}

function isDefault24hOperationalPeriod(item: Lancamento): boolean {
  return item.dataHoraInicio.slice(11, 16) === "18:00"
    && item.dataHoraFim.slice(11, 16) === "18:00"
    && item.horasPagaveis >= 24;
}

export function gerarPeriodosImplantaveis(item: Lancamento): PeriodoCalendario[] {
  const serviceDate = item.dataReferenciaServico;

  if (item.tipo === "MG_ORDINARIO") {
    const sobreavisoDate = previousDay(serviceDate);
    return [
      {
        id: `${item.id}:sobreaviso`,
        lancamento: item,
        data: sobreavisoDate,
        titulo: "Sobreaviso",
        horas: 12,
        exibirHoras: true,
        horarioInicio: "18:00",
        horarioFim: "06:00",
        observacao: `Sobreaviso referente a prontidao de ${formatShortDate(serviceDate)}`,
      },
      {
        id: `${item.id}:prontidao`,
        lancamento: item,
        data: serviceDate,
        titulo: "Prontidao",
        horas: 12,
        exibirHoras: false,
        horarioInicio: "06:00",
        horarioFim: "18:00",
        observacao: "Prontidao ordinaria de referencia. Nao exibir 12h no calendario para nao confundir com hora paga de extra.",
      },
    ];
  }

  if (["MG_EXTRA", "EXTRA_ADMINISTRATIVO", "EXTRA_B5"].includes(item.tipo) && isDefault24hOperationalPeriod(item)) {
    if (item.tipo === "EXTRA_ADMINISTRATIVO" || item.tipo === "EXTRA_B5") {
      return [
        {
          id: `${item.id}:extra-24h`,
          lancamento: item,
          data: serviceDate,
          titulo: "Extra Administrativo",
          horas: 24,
          exibirHoras: true,
          horarioInicio: "18:00",
          horarioFim: "18:00",
          observacao: `Extra administrativo de 24h referente a ${formatShortDate(serviceDate)}`,
        },
      ];
    }

    return [
      {
        id: `${item.id}:extra-noite`,
        lancamento: item,
        data: previousDay(serviceDate),
        titulo: item.tipo === "MG_EXTRA" ? "Extra" : "Extra Administrativo",
        horas: 12,
        exibirHoras: true,
        horarioInicio: "18:00",
        horarioFim: "06:00",
        observacao: `Primeiro periodo do extra de 24h referente a ${formatShortDate(serviceDate)}`,
      },
      {
        id: `${item.id}:extra-dia`,
        lancamento: item,
        data: serviceDate,
        titulo: item.tipo === "MG_EXTRA" ? "Extra" : "Extra Administrativo",
        horas: 12,
        exibirHoras: true,
        horarioInicio: "06:00",
        horarioFim: "18:00",
        observacao: "Segundo periodo do extra de 24h",
      },
    ];
  }

  if (item.tipo === "HORA_AULA") {
    return [
      {
        id: `${item.id}:aula`,
        lancamento: item,
        data: item.dataHoraInicio.slice(0, 10),
        titulo: `Aula ${getHoraAulaSubtipo(item)}`,
        horas: item.horasAula,
        exibirHoras: true,
        horarioInicio: item.dataHoraInicio.slice(11, 16),
        horarioFim: item.dataHoraFim.slice(11, 16),
        observacao: item.disciplina || item.observacoes,
      },
    ];
  }

  return [
    {
      id: `${item.id}:servico`,
      lancamento: item,
      data: serviceDate,
      titulo: item.tipo === "MG_EXTRA" ? "Extra" : "Extra Administrativo",
      horas: item.horasPagaveis,
      exibirHoras: true,
      horarioInicio: item.dataHoraInicio.slice(11, 16),
      horarioFim: item.dataHoraFim.slice(11, 16),
      observacao: item.observacoes,
    },
  ];
}
