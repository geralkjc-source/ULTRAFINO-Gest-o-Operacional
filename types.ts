
export enum Area {
  DFP2 = 'DFP 2',
  BOMBEAMENTO = 'BOMBEAMENTO',
  ESPESADORES = 'ESPESADORES E REAGENTES',
  HBF_C = 'HBF-COLUNAS C',
  HBF_D = 'HBF- COLUNAS D'
}

export type Turma = 'A' | 'B' | 'C' | 'D';
export type Turno = 'MANHÃ' | 'TARDE' | 'NOITE';

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
}

export interface PendingItem {
  id: string;
  description: string;
  priority: 'baixa' | 'media' | 'alta';
  status: 'aberto' | 'resolvido';
  area: Area;
  timestamp: number;
  comments?: Comment[];
}
