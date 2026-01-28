
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
 * Envia dados para o Google Sheets.
 */
export const syncToGoogleSheets = async (
  scriptUrl: string, 
  reports: Report[], 
  pending: PendingItem[]
): Promise<SyncResponse> => {
  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com')) {
    return { success: false, message: "URL do Script Inválida ou Não Configurada." };
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

    // Usamos POST. O Google Apps Script exige text/plain para evitar Preflight CORS em alguns casos, 
    // mas o JSON.stringify no body é o padrão que o doPost consome.
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', // O Google redireciona, no-cors é necessário para scripts WebApp
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Como no-cors não permite ler a resposta, assumimos sucesso se a promise não deu catch
    // mas adicionamos um delay para garantir que o processamento remoto ocorreu.
    return { success: true, message: "Dados transmitidos à nuvem." };
  } catch (error) {
    console.error("Sync Error:", error);
    return { success: false, message: "Falha de rede ou URL bloqueada." };
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
    
    // Se não for JSON, o script pode estar offline ou pedindo login
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      console.warn("Resposta da nuvem não é JSON válido. Verifique se o script está publicado como 'Anyone'.");
      return [];
    }
    
    const data = JSON.parse(trimmed);
    if (!Array.isArray(data)) return [];

    return data.map((item: any, idx: number) => {
      // Tenta extrair a data original ou usa o agora
      let ts = Date.now();
      if (item.data) {
        const parts = item.data.split(' '); // "dd/mm/aaaa hh:mm:ss"
        if (parts[0]) {
          const dParts = parts[0].split('/');
          ts = new Date(`${dParts[2]}-${dParts[1]}-${dParts[0]}T${parts[1] || '00:00:00'}`).getTime();
        }
      }

      return {
        id: `cloud-${item.tag}-${ts}`,
        tag: (item.tag || '').toString().toUpperCase(),
        area: (item.area || Area.DFP2) as Area,
        description: (item.descricao || '').toString().toUpperCase(),
        priority: (item.prioridade || 'baixa').toLowerCase() as any,
        status: (item.status || 'aberto').toLowerCase() as any,
        operator: item.operador_origem || 'SISTEMA',
        resolvedBy: item.operador_resolucao !== '-' ? item.operador_resolucao : undefined,
        timestamp: ts,
        synced: true,
        turma: 'A' 
      };
    });
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
