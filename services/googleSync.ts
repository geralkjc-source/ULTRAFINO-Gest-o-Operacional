
import { Report, PendingItem, Area } from '../types';

export const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjKp9VxCrV3vqKC8-KqHwd9O0n3UpVmDJUEeQKQwz12saYdR1_35JMSbn2QJwUQPLX/exec';
export const MASTER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1ZFYCWEIXJMNB3eMc7HhttchcsBRcG0Xa5LigMeeijvU/edit?usp=sharing';

export interface SyncResponse {
  success: boolean;
  message: string;
}

export interface CloudStats {
  ok: number;
  warning: number;
  fail: number;
  na: number;
  total: number;
}

/**
 * Envia dados para o Google Sheets usando modo no-cors para evitar Preflight do GAS.
 */
export const syncToGoogleSheets = async (
  scriptUrl: string, 
  reports: Report[], 
  pending: PendingItem[]
): Promise<SyncResponse> => {
  // Se a URL estiver vazia ou for apenas um placeholder, não prossegue
  if (!scriptUrl || scriptUrl.trim() === '') {
    return { success: false, message: "URL do Script não configurada." };
  }

  try {
    const now = new Date();
    const mesReferencia = `${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getFullYear()}`;

    const payload = {
      action: "sync",
      mes_referencia: mesReferencia,
      reports: (reports || []).map(r => ({
        data: r.timestamp ? new Date(r.timestamp).toLocaleDateString('pt-BR') : '-',
        hora: r.timestamp ? new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-',
        area: r.area,
        operador: (r.operator || 'N/A').toUpperCase(),
        turma: r.turma,
        turno: r.turno,
        itens_falha: r.items ? r.items.filter(i => i.status === 'fail' || i.status === 'warning').map(i => i.label).join(', ') : '',
        obs: (r.generalObservations || '').toUpperCase()
      })),
      pending: (pending || []).map(p => ({
        tag: (p.tag || 'N/A').toUpperCase(),
        area: p.area,
        descricao: (p.description || '').toUpperCase(),
        prioridade: (p.priority || 'BAIXA').toUpperCase(),
        status: (p.status || 'ABERTO').toUpperCase(),
        operador_origem: (p.operator || 'N/A').toUpperCase(),
        operador_resolucao: (p.resolvedBy || '-').toUpperCase(),
        data: p.timestamp ? new Date(p.timestamp).toLocaleString('pt-BR') : '-'
      }))
    };

    // Usamos POST com mode: no-cors para evitar erros de CORS em redirecionamentos do Google
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });

    return { success: true, message: "Sincronizado!" };
  } catch (error) {
    console.error("Sync Error:", error);
    return { success: false, message: "Erro na conexão." };
  }
};

/**
 * Busca itens de pendência da nuvem com validação rigorosa.
 */
export const fetchCloudItems = async (scriptUrl: string): Promise<PendingItem[]> => {
  if (!scriptUrl || scriptUrl.trim() === '') return [];
  
  try {
    const url = `${scriptUrl}?action=getPendencies&t=${Date.now()}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const text = await response.text();
    const trimmed = text.trim();
    
    // Validação defensiva: se não começar com '[', o Google provavelmente retornou HTML (Erro/Login)
    if (!trimmed.startsWith('[')) {
      return [];
    }
    
    const data = JSON.parse(trimmed);
    if (!Array.isArray(data)) return [];

    return data.map((item: any, idx: number) => ({
      id: `cloud-${item.tag || idx}-${idx}`,
      tag: (item.tag || '').toString().toUpperCase(),
      area: (item.area || Area.DFP2) as Area,
      description: (item.descricao || '').toString().toUpperCase(),
      priority: (item.prioridade || 'baixa').toLowerCase() as any,
      status: (item.status || 'aberto').toLowerCase() as any,
      operator: item.operador_origem || 'N/A',
      resolvedBy: item.operador_resolucao !== '-' ? item.operador_resolucao : undefined,
      timestamp: item.data ? new Date(item.data).getTime() : Date.now(),
      synced: true,
      turma: 'A' 
    }));
  } catch (error) {
    console.error("Fetch Items Error:", error);
    return [];
  }
};

/**
 * Busca estatísticas de saúde da planta da nuvem.
 */
export const fetchCloudData = async (scriptUrl: string): Promise<CloudStats | null> => {
  if (!scriptUrl || scriptUrl.trim() === '') return null;
  
  try {
    const response = await fetch(`${scriptUrl}?action=getStats&t=${Date.now()}`);
    if (!response.ok) return null;
    
    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed.startsWith('{')) return null;
    
    return JSON.parse(trimmed);
  } catch (error) {
    console.error("Fetch Stats Error:", error);
    return null;
  }
};
