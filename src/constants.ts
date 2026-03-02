import { Area } from './types';

export const AREA_PROCESS_STEPS: Record<Area, string[]> = {
  [Area.DFP2]: ['Ciclone', 'Flotação', 'Espessamento'],
  [Area.BOMBEAMENTO]: ['Bomba 1', 'Bomba 2', 'Bomba 3'],
  [Area.ESPESADORES_E_REAGENTES]: ['Espessador 1', 'Espessador 2', 'Reagente A', 'Reagente B'],
  [Area.HBF_COLUNAS_D]: ['Coluna D1', 'Coluna D2'],
  [Area.HBF_C]: ['HBF C1', 'HBF C2'],
};
