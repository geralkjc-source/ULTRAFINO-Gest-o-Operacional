export enum Area {
  DFP2 = 'DFP 2',
  BOMBEAMENTO = 'BOMBEAMENTO',
  ESPESADORES_E_REAGENTES = 'ESPESADORES E REAGENTES',
  HBF_COLUNAS_D = 'HBF- COLUNAS D',
  HBF_C = 'HBF_C',
}

export interface QualityStatus {
  area: Area;
  status: 'green' | 'yellow' | 'red';
  timestamp: string;
}
