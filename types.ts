
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
  comments?: Comment[];
  synced?: boolean;
  resolvedBy?: string;
  resolvedByTurma?: Turma;
  sourceReportId?: string;
}
