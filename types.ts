
export enum Area {
  DFP2 = 'DFP 2',
  BOMBEAMENTO = 'BOMBEAMENTO',
  ESPESADORES = 'ESPESADORES E REAGENTES',
  HBF_C = 'HBF-COLUNAS C',
  HBF_D = 'HBF- COLUNAS D'
}

export type Turma = 'A' | 'B' | 'C' | 'D';
export type Turno = 'MANHÃ' | 'TARDE' | 'NOITE';
export type Discipline = 'MECÂNICA' | 'ELÉTRICA' | 'INSTRUMENTAÇÃO' | 'OPERAÇÃO';

export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: 'ok' | 'fail' | 'na' | 'warning';
  observation?: string;
  discipline?: Discipline; // Disciplina sugerida ou selecionada
  comments?: Comment[];
}

export interface Report {
  id: string;
  timestamp: number;
  area: Area;
  operator: string;
  matricula?: string;
  turma: Turma;
  turno: Turno;
  items: ChecklistItem[];
  pendingItems: PendingItem[];
  generalObservations: string;
  synced?: boolean;
}

export interface PendingItem {
  id: string;
  tag: string;
  description: string;
  priority: 'baixa' | 'media' | 'alta';
  discipline: Discipline; // Nova categorização
  status: 'aberto' | 'resolvido';
  area: Area;
  timestamp: number;
  operator: string;
  turma: Turma;
  turno: Turno; // Adicionado para suporte a planilhas por turno
  comments?: Comment[];
  synced?: boolean;
  resolvedBy?: string;
  resolvedByTurma?: Turma;
  resolvedAt?: number; // Data/Hora da resolução
  sourceReportId?: string;
}

export interface QualityReport {
  id: string;
  timestamp: number;
  operator: string;
  turma?: Turma;
  ply?: string;
  dfp2C: { cr: string; yield: string; rejectAsh: string; concAsh: string };
  dfp2D: { cr: string; yield: string; rejectAsh: string; concAsh: string };
  colunaD: { productAsh: string; yield: string; cr: string; tailAsh: string };
  humidade: { tm: string };
  synced?: boolean;
}
